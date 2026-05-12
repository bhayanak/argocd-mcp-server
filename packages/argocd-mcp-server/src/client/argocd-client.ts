import type { ArgoCDConfig } from '../config.js';
import type {
  ArgoApplicationList,
  ArgoApplication,
  ArgoProjectList,
  ArgoProject,
  ArgoRepositoryList,
  ArgoResourceTree,
  ArgoManagedResourceList,
  ArgoEventList,
  CreateAppRequest,
  SyncOptions,
  LogOptions,
  ResourceRequest,
} from './types.js';

export class ArgoCDClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly maxLogLines: number;
  private readonly allowedProjects: string[];

  constructor(config: ArgoCDConfig) {
    this.baseUrl = config.url.replace(/\/$/, '');
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    };
    this.timeoutMs = config.timeoutMs;
    this.maxLogLines = config.maxLogLines;
    this.allowedProjects = config.allowedProjects;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    // SSRF protection: ensure URL stays within configured base
    if (!url.toString().startsWith(this.baseUrl)) {
      throw new Error('SSRF protection: request URL does not match configured base URL');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`ArgoCD API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private checkProjectAccess(project: string): void {
    if (this.allowedProjects.length > 0 && !this.allowedProjects.includes(project)) {
      throw new Error(`Access denied: project "${project}" is not in the allowed projects list`);
    }
  }

  // ── Applications ──────────────────────────────────────────────

  async listApplications(project?: string, selector?: string): Promise<ArgoApplication[]> {
    const params: Record<string, string> = {};
    if (project) {
      this.checkProjectAccess(project);
      params.project = project;
    }
    if (selector) params.selector = selector;

    const result = await this.request<ArgoApplicationList>(
      'GET',
      '/api/v1/applications',
      undefined,
      params
    );
    let apps = result.items || [];

    if (this.allowedProjects.length > 0) {
      apps = apps.filter((app) => this.allowedProjects.includes(app.spec.project));
    }

    return apps;
  }

  async getApplication(name: string): Promise<ArgoApplication> {
    const app = await this.request<ArgoApplication>(
      'GET',
      `/api/v1/applications/${encodeURIComponent(name)}`
    );
    this.checkProjectAccess(app.spec.project);
    return app;
  }

  async createApplication(req: CreateAppRequest): Promise<ArgoApplication> {
    this.checkProjectAccess(req.project);

    const body = {
      metadata: { name: req.name },
      spec: {
        project: req.project,
        source: {
          repoURL: req.repoURL,
          path: req.path,
          targetRevision: req.targetRevision,
        },
        destination: {
          server: req.destServer,
          namespace: req.destNamespace,
        },
        ...(req.syncPolicy === 'auto'
          ? { syncPolicy: { automated: { prune: true, selfHeal: true } } }
          : {}),
      },
    };

    return this.request<ArgoApplication>('POST', '/api/v1/applications', body);
  }

  async deleteApplication(name: string, cascade: boolean): Promise<void> {
    const app = await this.getApplication(name);
    this.checkProjectAccess(app.spec.project);

    const params: Record<string, string> = {};
    if (cascade) params.cascade = 'true';

    await this.request<unknown>(
      'DELETE',
      `/api/v1/applications/${encodeURIComponent(name)}`,
      undefined,
      params
    );
  }

  // ── Sync & Refresh ────────────────────────────────────────────

  async syncApplication(name: string, opts: SyncOptions): Promise<ArgoApplication> {
    const app = await this.getApplication(name);
    this.checkProjectAccess(app.spec.project);

    const body: Record<string, unknown> = {};
    if (opts.revision) body.revision = opts.revision;
    if (opts.prune) body.prune = true;
    if (opts.dryRun) body.dryRun = true;
    if (opts.resources) body.resources = opts.resources;

    return this.request<ArgoApplication>(
      'POST',
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      body
    );
  }

  async refreshApplication(name: string, hard: boolean): Promise<ArgoApplication> {
    const params: Record<string, string> = { refresh: hard ? 'hard' : 'normal' };
    return this.request<ArgoApplication>(
      'GET',
      `/api/v1/applications/${encodeURIComponent(name)}`,
      undefined,
      params
    );
  }

  async getManifestDiff(name: string): Promise<ArgoManagedResourceList> {
    return this.request<ArgoManagedResourceList>(
      'GET',
      `/api/v1/applications/${encodeURIComponent(name)}/managed-resources`
    );
  }

  // ── History & Rollback ────────────────────────────────────────

  async getRevisionHistory(name: string): Promise<ArgoApplication> {
    return this.getApplication(name);
  }

  async rollbackApplication(name: string, revisionId: number): Promise<ArgoApplication> {
    const body = { id: revisionId };
    return this.request<ArgoApplication>(
      'PUT',
      `/api/v1/applications/${encodeURIComponent(name)}/rollback`,
      body
    );
  }

  // ── Projects ──────────────────────────────────────────────────

  async listProjects(): Promise<ArgoProject[]> {
    const result = await this.request<ArgoProjectList>('GET', '/api/v1/projects');
    let projects = result.items || [];

    if (this.allowedProjects.length > 0) {
      projects = projects.filter((p) => this.allowedProjects.includes(p.metadata.name));
    }

    return projects;
  }

  async getProject(name: string): Promise<ArgoProject> {
    this.checkProjectAccess(name);
    return this.request<ArgoProject>('GET', `/api/v1/projects/${encodeURIComponent(name)}`);
  }

  // ── Repositories ──────────────────────────────────────────────

  async listRepositories(): Promise<ArgoRepositoryList> {
    return this.request<ArgoRepositoryList>('GET', '/api/v1/repositories');
  }

  // ── Resources ─────────────────────────────────────────────────

  async getResourceTree(name: string): Promise<ArgoResourceTree> {
    return this.request<ArgoResourceTree>(
      'GET',
      `/api/v1/applications/${encodeURIComponent(name)}/resource-tree`
    );
  }

  async getResource(name: string, req: ResourceRequest): Promise<unknown> {
    const params: Record<string, string> = {
      name: req.resourceName,
      kind: req.kind,
    };
    if (req.namespace) params.namespace = req.namespace;
    if (req.group) params.group = req.group;
    params.version = 'v1';

    return this.request<unknown>(
      'GET',
      `/api/v1/applications/${encodeURIComponent(name)}/resource`,
      undefined,
      params
    );
  }

  async getPodLogs(name: string, podName: string, opts: LogOptions): Promise<string> {
    const params: Record<string, string> = {};
    if (opts.container) params.container = opts.container;
    if (opts.namespace) params.namespace = opts.namespace;
    if (opts.sinceSeconds) params.sinceSeconds = String(opts.sinceSeconds);
    if (opts.lines) params.tailLines = String(Math.min(opts.lines, this.maxLogLines));

    const url = new URL(`${this.baseUrl}/api/v1/applications/${encodeURIComponent(name)}/logs`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('podName', podName);

    if (!url.toString().startsWith(this.baseUrl)) {
      throw new Error('SSRF protection: request URL does not match configured base URL');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`ArgoCD API error (${response.status}): ${errorText}`);
      }

      const text = await response.text();
      // ArgoCD returns NDJSON lines: {"result":{"content":"...","podName":"..."}}
      const lines = text
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            const parsed = JSON.parse(line);
            return parsed?.result?.content ?? line;
          } catch {
            return line;
          }
        });
      return lines.join('');
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Events ────────────────────────────────────────────────────

  async getEvents(name: string): Promise<ArgoEventList> {
    return this.request<ArgoEventList>(
      'GET',
      `/api/v1/applications/${encodeURIComponent(name)}/events`
    );
  }
}

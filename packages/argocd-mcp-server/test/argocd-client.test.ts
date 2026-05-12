import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArgoCDClient } from '../src/client/argocd-client.js';
import type { ArgoCDConfig } from '../src/config.js';

function makeConfig(overrides: Partial<ArgoCDConfig> = {}): ArgoCDConfig {
  return {
    url: 'https://argocd.example.com',
    token: 'test-token',
    insecure: false,
    timeoutMs: 5000,
    maxLogLines: 500,
    allowedProjects: [],
    ...overrides,
  };
}

function mockFetchResponse(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('ArgoCDClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('listApplications', () => {
    it('should list applications', async () => {
      const mockApps = {
        items: [
          {
            metadata: { name: 'app1' },
            spec: { project: 'default', destination: { namespace: 'prod' } },
            status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
          },
        ],
      };
      globalThis.fetch = mockFetchResponse(mockApps);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.listApplications();

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('app1');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/applications'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should filter by project', async () => {
      globalThis.fetch = mockFetchResponse({ items: [] });
      const client = new ArgoCDClient(makeConfig());

      await client.listApplications('myproject');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('project=myproject'),
        expect.anything()
      );
    });

    it('should filter by selector', async () => {
      globalThis.fetch = mockFetchResponse({ items: [] });
      const client = new ArgoCDClient(makeConfig());

      await client.listApplications(undefined, 'team=backend');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('selector=team'),
        expect.anything()
      );
    });

    it('should enforce allowed projects filter', async () => {
      const mockApps = {
        items: [
          {
            metadata: { name: 'app1' },
            spec: { project: 'default', destination: { namespace: 'prod' } },
          },
          {
            metadata: { name: 'app2' },
            spec: { project: 'restricted', destination: { namespace: 'prod' } },
          },
        ],
      };
      globalThis.fetch = mockFetchResponse(mockApps);
      const client = new ArgoCDClient(makeConfig({ allowedProjects: ['default'] }));

      const result = await client.listApplications();
      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('app1');
    });

    it('should deny access to restricted project', async () => {
      const client = new ArgoCDClient(makeConfig({ allowedProjects: ['default'] }));

      await expect(client.listApplications('restricted')).rejects.toThrow('Access denied');
    });
  });

  describe('getApplication', () => {
    it('should get application by name', async () => {
      const mockApp = {
        metadata: { name: 'web-app' },
        spec: { project: 'default', destination: { namespace: 'prod' } },
        status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getApplication('web-app');

      expect(result.metadata.name).toBe('web-app');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/applications/web-app'),
        expect.anything()
      );
    });

    it('should encode special characters in name', async () => {
      const mockApp = {
        metadata: { name: 'app/with-special' },
        spec: { project: 'default', destination: {} },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      await client.getApplication('app/with-special');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('app%2Fwith-special'),
        expect.anything()
      );
    });
  });

  describe('createApplication', () => {
    it('should create application with manual sync', async () => {
      const mockApp = {
        metadata: { name: 'new-app' },
        spec: { project: 'default', destination: { namespace: 'dev' } },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.createApplication({
        name: 'new-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo.git',
        path: 'k8s/',
        targetRevision: 'HEAD',
        destServer: 'https://kubernetes.default.svc',
        destNamespace: 'dev',
        syncPolicy: 'manual',
      });

      expect(result.metadata.name).toBe('new-app');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/applications'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should create application with auto sync', async () => {
      const mockApp = {
        metadata: { name: 'auto-app' },
        spec: { project: 'default', destination: { namespace: 'dev' } },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      await client.createApplication({
        name: 'auto-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo.git',
        path: 'k8s/',
        targetRevision: 'main',
        destServer: 'https://kubernetes.default.svc',
        destNamespace: 'dev',
        syncPolicy: 'auto',
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.spec.syncPolicy.automated).toEqual({ prune: true, selfHeal: true });
    });
  });

  describe('deleteApplication', () => {
    it('should delete with cascade', async () => {
      const mockApp = {
        metadata: { name: 'del-app' },
        spec: { project: 'default', destination: {} },
      };
      // First call: getApplication, second call: delete
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApp),
          text: () => Promise.resolve(JSON.stringify(mockApp)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('{}'),
        });
      globalThis.fetch = fetchMock;
      const client = new ArgoCDClient(makeConfig());

      await client.deleteApplication('del-app', true);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toContain('cascade=true');
    });

    it('should delete without cascade', async () => {
      const mockApp = {
        metadata: { name: 'del-app' },
        spec: { project: 'default', destination: {} },
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApp),
          text: () => Promise.resolve(JSON.stringify(mockApp)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('{}'),
        });
      globalThis.fetch = fetchMock;
      const client = new ArgoCDClient(makeConfig());

      await client.deleteApplication('del-app', false);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).not.toContain('cascade');
    });
  });

  describe('syncApplication', () => {
    it('should sync application', async () => {
      const mockApp = {
        metadata: { name: 'sync-app' },
        spec: { project: 'default', destination: {} },
        status: { operationState: { phase: 'Succeeded' } },
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApp),
          text: () => Promise.resolve(JSON.stringify(mockApp)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApp),
          text: () => Promise.resolve(JSON.stringify(mockApp)),
        });
      globalThis.fetch = fetchMock;
      const client = new ArgoCDClient(makeConfig());

      const result = await client.syncApplication('sync-app', { prune: true });

      expect(fetchMock.mock.calls[1][0]).toContain('/sync');
      expect(result.status?.operationState?.phase).toBe('Succeeded');
    });
  });

  describe('refreshApplication', () => {
    it('should refresh with normal mode', async () => {
      const mockApp = {
        metadata: { name: 'refresh-app' },
        spec: { project: 'default', destination: {} },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      await client.refreshApplication('refresh-app', false);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('refresh=normal'),
        expect.anything()
      );
    });

    it('should refresh with hard mode', async () => {
      const mockApp = {
        metadata: { name: 'refresh-app' },
        spec: { project: 'default', destination: {} },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      await client.refreshApplication('refresh-app', true);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('refresh=hard'),
        expect.anything()
      );
    });
  });

  describe('getManifestDiff', () => {
    it('should get managed resources', async () => {
      const mockData = {
        items: [{ kind: 'Deployment', name: 'web', targetState: '{}', liveState: '{}' }],
      };
      globalThis.fetch = mockFetchResponse(mockData);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getManifestDiff('web-app');

      expect(result.items).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/managed-resources'),
        expect.anything()
      );
    });
  });

  describe('rollbackApplication', () => {
    it('should rollback to specific revision', async () => {
      const mockApp = {
        metadata: { name: 'rollback-app' },
        spec: { project: 'default', destination: {} },
        status: { operationState: { phase: 'Succeeded' } },
      };
      globalThis.fetch = mockFetchResponse(mockApp);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.rollbackApplication('rollback-app', 5);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rollback'),
        expect.objectContaining({ method: 'PUT' })
      );
      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.id).toBe(5);
      expect(result.status?.operationState?.phase).toBe('Succeeded');
    });
  });

  describe('listProjects', () => {
    it('should list projects', async () => {
      const mockData = {
        items: [
          { metadata: { name: 'default' }, spec: {} },
          { metadata: { name: 'finance' }, spec: {} },
        ],
      };
      globalThis.fetch = mockFetchResponse(mockData);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.listProjects();

      expect(result).toHaveLength(2);
    });

    it('should filter projects by allowed list', async () => {
      const mockData = {
        items: [
          { metadata: { name: 'default' }, spec: {} },
          { metadata: { name: 'restricted' }, spec: {} },
        ],
      };
      globalThis.fetch = mockFetchResponse(mockData);
      const client = new ArgoCDClient(makeConfig({ allowedProjects: ['default'] }));

      const result = await client.listProjects();

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('default');
    });
  });

  describe('getProject', () => {
    it('should get project details', async () => {
      const mockProject = {
        metadata: { name: 'default' },
        spec: { description: 'Default project', sourceRepos: ['*'] },
      };
      globalThis.fetch = mockFetchResponse(mockProject);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getProject('default');

      expect(result.metadata.name).toBe('default');
    });

    it('should deny access to restricted project', async () => {
      const client = new ArgoCDClient(makeConfig({ allowedProjects: ['default'] }));

      await expect(client.getProject('restricted')).rejects.toThrow('Access denied');
    });
  });

  describe('listRepositories', () => {
    it('should list repositories', async () => {
      const mockData = {
        items: [{ repo: 'https://github.com/org/repo.git', type: 'git' }],
      };
      globalThis.fetch = mockFetchResponse(mockData);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.listRepositories();

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getResourceTree', () => {
    it('should get resource tree', async () => {
      const mockTree = {
        nodes: [
          { kind: 'Deployment', name: 'web', health: { status: 'Healthy' } },
          {
            kind: 'ReplicaSet',
            name: 'web-abc',
            health: { status: 'Healthy' },
            parentRefs: [{ kind: 'Deployment', name: 'web' }],
          },
        ],
      };
      globalThis.fetch = mockFetchResponse(mockTree);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getResourceTree('web-app');

      expect(result.nodes).toHaveLength(2);
    });
  });

  describe('getResource', () => {
    it('should get specific resource', async () => {
      const mockResource = { kind: 'Deployment', metadata: { name: 'web' } };
      globalThis.fetch = mockFetchResponse(mockResource);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getResource('web-app', {
        resourceName: 'web',
        kind: 'Deployment',
        group: 'apps',
      });

      expect(result).toEqual(mockResource);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('kind=Deployment'),
        expect.anything()
      );
    });

    it('should get resource with namespace', async () => {
      const mockResource = { kind: 'Service', metadata: { name: 'svc' } };
      globalThis.fetch = mockFetchResponse(mockResource);
      const client = new ArgoCDClient(makeConfig());

      await client.getResource('web-app', {
        resourceName: 'svc',
        kind: 'Service',
        namespace: 'prod',
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('namespace=prod'),
        expect.anything()
      );
    });
  });

  describe('getPodLogs', () => {
    it('should get pod logs and parse NDJSON', async () => {
      const ndjson =
        '{"result":{"content":"line1\\n","podName":"pod-1"}}\n{"result":{"content":"line2\\n","podName":"pod-1"}}';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(ndjson),
      });
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getPodLogs('app1', 'pod-1', {
        lines: 100,
        sinceSeconds: 3600,
      });

      expect(result).toContain('line1');
      expect(result).toContain('line2');
    });

    it('should handle plain text logs', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('plain log line 1\nplain log line 2'),
      });
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getPodLogs('app1', 'pod-1', {});

      expect(result).toContain('plain log line 1');
    });

    it('should cap log lines at maxLogLines', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      });
      const client = new ArgoCDClient(makeConfig({ maxLogLines: 50 }));

      await client.getPodLogs('app1', 'pod-1', { lines: 200 });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tailLines=50'),
        expect.anything()
      );
    });

    it('should pass container and namespace params', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      });
      const client = new ArgoCDClient(makeConfig());

      await client.getPodLogs('app1', 'pod-1', {
        container: 'nginx',
        namespace: 'production',
        sinceSeconds: 7200,
      });

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('container=nginx');
      expect(url).toContain('namespace=production');
      expect(url).toContain('sinceSeconds=7200');
    });

    it('should throw on error response for logs', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('internal error'),
      });
      const client = new ArgoCDClient(makeConfig());

      await expect(client.getPodLogs('app1', 'pod-1', {})).rejects.toThrow(
        'ArgoCD API error (500)'
      );
    });
  });

  describe('getEvents', () => {
    it('should get events', async () => {
      const mockEvents = {
        items: [{ reason: 'Synced', message: 'Application synced', type: 'Normal' }],
      };
      globalThis.fetch = mockFetchResponse(mockEvents);
      const client = new ArgoCDClient(makeConfig());

      const result = await client.getEvents('app1');

      expect(result.items).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should throw on non-OK response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('application not found'),
      });
      const client = new ArgoCDClient(makeConfig());

      await expect(client.getApplication('missing')).rejects.toThrow('ArgoCD API error (404)');
    });

    it('should include auth header in requests', async () => {
      globalThis.fetch = mockFetchResponse({ items: [] });
      const client = new ArgoCDClient(makeConfig({ token: 'my-secret-token' }));

      await client.listApplications();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-token',
          }),
        })
      );
    });
  });
});

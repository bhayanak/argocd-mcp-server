// ArgoCD API response types (mirrors gRPC-Gateway JSON schema)

export interface ArgoApplicationList {
  metadata?: { resourceVersion?: string };
  items: ArgoApplication[];
}

export interface ArgoApplication {
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
  };
  spec: {
    project: string;
    source?: ArgoSource;
    sources?: ArgoSource[];
    destination: {
      server?: string;
      namespace?: string;
      name?: string;
    };
    syncPolicy?: {
      automated?: { prune?: boolean; selfHeal?: boolean; allowEmpty?: boolean };
      syncOptions?: string[];
      retry?: { limit?: number };
    };
  };
  status?: {
    sync?: { status: string; revision?: string; comparedTo?: unknown };
    health?: { status: string; message?: string };
    conditions?: ArgoCondition[];
    operationState?: ArgoOperationState;
    reconciledAt?: string;
    resources?: ArgoResourceStatus[];
    history?: ArgoRevisionHistory[];
    summary?: { images?: string[]; externalURLs?: string[] };
    sourceType?: string;
  };
  operation?: unknown;
}

export interface ArgoSource {
  repoURL: string;
  path?: string;
  targetRevision?: string;
  helm?: {
    values?: string;
    parameters?: Array<{ name: string; value: string }>;
  };
  kustomize?: { images?: string[] };
  chart?: string;
}

export interface ArgoCondition {
  type: string;
  message: string;
  lastTransitionTime?: string;
}

export interface ArgoOperationState {
  operation?: unknown;
  phase: string;
  message?: string;
  syncResult?: {
    revision: string;
    resources?: ArgoSyncedResource[];
  };
  startedAt?: string;
  finishedAt?: string;
}

export interface ArgoSyncedResource {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  status: string;
  message?: string;
  hookPhase?: string;
  hookType?: string;
}

export interface ArgoResourceStatus {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  status?: string;
  health?: { status: string; message?: string };
  version?: string;
}

export interface ArgoRevisionHistory {
  id: number;
  revision: string;
  deployedAt: string;
  source?: ArgoSource;
  sources?: ArgoSource[];
}

// Projects
export interface ArgoProjectList {
  metadata?: { resourceVersion?: string };
  items: ArgoProject[];
}

export interface ArgoProject {
  metadata: {
    name: string;
    namespace?: string;
  };
  spec: {
    description?: string;
    sourceRepos?: string[];
    destinations?: Array<{ server?: string; namespace?: string; name?: string }>;
    roles?: ArgoProjectRole[];
    clusterResourceWhitelist?: Array<{ group: string; kind: string }>;
    namespaceResourceWhitelist?: Array<{ group: string; kind: string }>;
  };
}

export interface ArgoProjectRole {
  name: string;
  description?: string;
  policies?: string[];
  groups?: string[];
}

// Repositories
export interface ArgoRepositoryList {
  metadata?: { resourceVersion?: string };
  items?: ArgoRepository[];
}

export interface ArgoRepository {
  repo: string;
  type?: string;
  name?: string;
  connectionState?: { status: string; message?: string; attemptedAt?: string };
  project?: string;
}

// Resource Tree
export interface ArgoResourceTree {
  nodes?: ArgoResourceNode[];
  orphanedNodes?: ArgoResourceNode[];
}

export interface ArgoResourceNode {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  version?: string;
  uid?: string;
  health?: { status: string; message?: string };
  parentRefs?: Array<{
    group?: string;
    kind: string;
    name: string;
    namespace?: string;
    uid?: string;
  }>;
  resourceVersion?: string;
  createdAt?: string;
  info?: Array<{ name: string; value: string }>;
  images?: string[];
}

// Managed Resources (for diff)
export interface ArgoManagedResource {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  targetState?: string;
  liveState?: string;
  normalizedLiveState?: string;
  predictedLiveState?: string;
}

export interface ArgoManagedResourceList {
  items?: ArgoManagedResource[];
}

// Events
export interface ArgoEventList {
  metadata?: { resourceVersion?: string };
  items?: ArgoEvent[];
}

export interface ArgoEvent {
  metadata?: { name?: string; namespace?: string; creationTimestamp?: string };
  involvedObject?: { kind?: string; name?: string; namespace?: string };
  reason?: string;
  message?: string;
  type?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  count?: number;
}

// Request types
export interface CreateAppRequest {
  name: string;
  project: string;
  repoURL: string;
  path: string;
  targetRevision: string;
  destServer: string;
  destNamespace: string;
  syncPolicy: 'manual' | 'auto';
}

export interface SyncOptions {
  revision?: string;
  prune?: boolean;
  dryRun?: boolean;
  resources?: Array<{ group: string; kind: string; name: string }>;
}

export interface LogOptions {
  container?: string;
  namespace?: string;
  lines?: number;
  sinceSeconds?: number;
}

export interface ResourceRequest {
  resourceName: string;
  kind: string;
  namespace?: string;
  group?: string;
}

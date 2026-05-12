import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import {
  handleGetResourceTree,
  handleGetResource,
  handleGetPodLogs,
} from '../../src/tools/resources.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    getResourceTree: vi.fn().mockResolvedValue({
      nodes: [
        { kind: 'Deployment', name: 'web', health: { status: 'Healthy' } },
        {
          kind: 'ReplicaSet',
          name: 'web-abc',
          health: { status: 'Healthy' },
          parentRefs: [{ kind: 'Deployment', name: 'web' }],
        },
        {
          kind: 'Pod',
          name: 'web-abc-xyz',
          health: { status: 'Healthy' },
          parentRefs: [{ kind: 'ReplicaSet', name: 'web-abc' }],
        },
      ],
      orphanedNodes: [],
    }),
    getResource: vi.fn().mockResolvedValue({
      kind: 'Deployment',
      metadata: { name: 'web', namespace: 'default' },
      spec: { replicas: 3 },
    }),
    getPodLogs: vi.fn().mockResolvedValue('2024-01-01 Starting server...\n2024-01-01 Ready'),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Resource Tools', () => {
  describe('handleGetResourceTree', () => {
    it('should render hierarchical tree', async () => {
      const client = makeMockClient();
      const result = await handleGetResourceTree(client, { name: 'web-app' });

      expect(result.content[0].text).toContain('Resource Tree: web-app');
      expect(result.content[0].text).toContain('Deployment/web');
      expect(result.content[0].text).toContain('ReplicaSet/web-abc');
      expect(result.content[0].text).toContain('Pod/web-abc-xyz');
    });

    it('should handle empty tree', async () => {
      const client = makeMockClient({
        getResourceTree: vi.fn().mockResolvedValue({ nodes: [], orphanedNodes: [] }),
      });

      const result = await handleGetResourceTree(client, { name: 'app' });
      expect(result.content[0].text).toContain('No resources found');
    });

    it('should show orphaned nodes', async () => {
      const client = makeMockClient({
        getResourceTree: vi.fn().mockResolvedValue({
          nodes: [{ kind: 'Deployment', name: 'web', health: { status: 'Healthy' } }],
          orphanedNodes: [{ kind: 'ConfigMap', name: 'old-config', health: { status: 'Unknown' } }],
        }),
      });

      const result = await handleGetResourceTree(client, { name: 'app' });
      expect(result.content[0].text).toContain('Orphaned');
      expect(result.content[0].text).toContain('ConfigMap/old-config');
    });
  });

  describe('handleGetResource', () => {
    it('should return resource manifest as JSON', async () => {
      const client = makeMockClient();
      const result = await handleGetResource(client, {
        name: 'web-app',
        resourceName: 'web',
        kind: 'Deployment',
        group: 'apps',
      });

      expect(result.content[0].text).toContain('Resource: Deployment/web');
      expect(result.content[0].text).toContain('"replicas": 3');
    });
  });

  describe('handleGetPodLogs', () => {
    it('should return pod logs', async () => {
      const client = makeMockClient();
      const result = await handleGetPodLogs(client, {
        name: 'web-app',
        podName: 'web-abc-xyz',
      });

      expect(result.content[0].text).toContain('Pod Logs: web-abc-xyz');
      expect(result.content[0].text).toContain('Starting server');
    });

    it('should show container name when specified', async () => {
      const client = makeMockClient();
      const result = await handleGetPodLogs(client, {
        name: 'web-app',
        podName: 'web-abc-xyz',
        container: 'nginx',
      });

      expect(result.content[0].text).toContain('Container: nginx');
    });

    it('should handle empty logs', async () => {
      const client = makeMockClient({
        getPodLogs: vi.fn().mockResolvedValue(''),
      });

      const result = await handleGetPodLogs(client, {
        name: 'app',
        podName: 'pod-1',
      });

      expect(result.content[0].text).toContain('no logs available');
    });
  });
});

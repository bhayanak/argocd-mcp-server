import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import {
  handleSyncApplication,
  handleRefreshApplication,
  handleGetAppDiff,
} from '../../src/tools/sync.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    syncApplication: vi.fn().mockResolvedValue({
      metadata: { name: 'sync-app' },
      spec: { project: 'default', destination: {} },
      status: {
        operationState: {
          phase: 'Succeeded',
          message: 'successfully synced',
          syncResult: {
            revision: 'abc123',
            resources: [
              { kind: 'Deployment', name: 'web', status: 'Synced', message: 'deployed' },
              { kind: 'Service', name: 'web-svc', status: 'Synced' },
            ],
          },
        },
      },
    }),
    refreshApplication: vi.fn().mockResolvedValue({
      metadata: { name: 'refresh-app' },
      spec: { project: 'default', destination: { namespace: 'prod' } },
      status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
    }),
    getManifestDiff: vi.fn().mockResolvedValue({
      items: [{ kind: 'Deployment', name: 'web', targetState: '{"a":1}', liveState: '{"a":2}' }],
    }),
    getApplication: vi.fn().mockResolvedValue({
      metadata: { name: 'test-app' },
      spec: { project: 'default', destination: {} },
    }),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Sync Tools', () => {
  describe('handleSyncApplication', () => {
    it('should sync and return result', async () => {
      const client = makeMockClient();
      const result = await handleSyncApplication(client, {
        name: 'sync-app',
        prune: true,
      });

      expect(result.content[0].text).toContain('Sync');
      expect(result.content[0].text).toContain('Succeeded');
      expect(result.content[0].text).toContain('abc123');
      expect(result.content[0].text).toContain('Deployment');
    });

    it('should indicate dry run', async () => {
      const client = makeMockClient();
      const result = await handleSyncApplication(client, {
        name: 'sync-app',
        dryRun: true,
      });

      expect(result.content[0].text).toContain('Dry Run');
    });

    it('should handle sync with no resources', async () => {
      const client = makeMockClient({
        syncApplication: vi.fn().mockResolvedValue({
          metadata: { name: 'app' },
          spec: { project: 'default', destination: {} },
          status: {
            operationState: { phase: 'Succeeded', syncResult: { revision: 'x' } },
          },
        }),
      });

      const result = await handleSyncApplication(client, { name: 'app' });
      expect(result.content[0].text).toContain('Succeeded');
    });
  });

  describe('handleRefreshApplication', () => {
    it('should refresh and return detail', async () => {
      const client = makeMockClient();
      const result = await handleRefreshApplication(client, { name: 'refresh-app' });

      expect(result.content[0].text).toContain('refreshed');
      expect(result.content[0].text).toContain('Application: refresh-app');
    });

    it('should indicate hard refresh', async () => {
      const client = makeMockClient();
      const result = await handleRefreshApplication(client, {
        name: 'refresh-app',
        hard: true,
      });

      expect(result.content[0].text).toContain('(hard)');
    });
  });

  describe('handleGetAppDiff', () => {
    it('should show diff for drifted resources', async () => {
      const client = makeMockClient();
      const result = await handleGetAppDiff(client, { name: 'web-app' });

      expect(result.content[0].text).toContain('Diff Report');
      expect(result.content[0].text).toContain('1 of 1 resources have drift');
    });

    it('should report in sync when no drift', async () => {
      const client = makeMockClient({
        getManifestDiff: vi.fn().mockResolvedValue({
          items: [{ kind: 'Deployment', name: 'web', targetState: '{}', liveState: '{}' }],
        }),
      });

      const result = await handleGetAppDiff(client, { name: 'web-app' });
      expect(result.content[0].text).toContain('in sync');
    });

    it('should handle empty managed resources', async () => {
      const client = makeMockClient({
        getManifestDiff: vi.fn().mockResolvedValue({ items: [] }),
      });

      const result = await handleGetAppDiff(client, { name: 'web-app' });
      expect(result.content[0].text).toContain('No managed resources');
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import { handleListRevisions, handleRollbackApplication } from '../../src/tools/rollback.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    getRevisionHistory: vi.fn().mockResolvedValue({
      metadata: { name: 'app1' },
      spec: { project: 'default', destination: {} },
      status: {
        history: [
          {
            id: 1,
            revision: 'aaa111',
            deployedAt: '2024-01-01T00:00:00Z',
            source: { repoURL: 'https://github.com/org/repo.git', path: 'k8s/' },
          },
          {
            id: 2,
            revision: 'bbb222',
            deployedAt: '2024-01-02T00:00:00Z',
            source: { repoURL: 'https://github.com/org/repo.git', path: 'k8s/' },
          },
          {
            id: 3,
            revision: 'ccc333',
            deployedAt: '2024-01-03T00:00:00Z',
            source: { repoURL: 'https://github.com/org/repo.git', path: 'k8s/' },
          },
        ],
      },
    }),
    rollbackApplication: vi.fn().mockResolvedValue({
      metadata: { name: 'app1' },
      spec: { project: 'default', destination: {} },
      status: {
        operationState: { phase: 'Succeeded', message: 'rollback completed' },
      },
    }),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Rollback Tools', () => {
  describe('handleListRevisions', () => {
    it('should list revisions', async () => {
      const client = makeMockClient();
      const result = await handleListRevisions(client, { name: 'app1' });

      expect(result.content[0].text).toContain('Revision History: app1');
      expect(result.content[0].text).toContain('3 entries');
      expect(result.content[0].text).toContain('aaa111');
      expect(result.content[0].text).toContain('ccc333');
    });

    it('should limit results', async () => {
      const client = makeMockClient();
      const result = await handleListRevisions(client, { name: 'app1', limit: 2 });

      expect(result.content[0].text).toContain('2 entries');
    });

    it('should handle empty history', async () => {
      const client = makeMockClient({
        getRevisionHistory: vi.fn().mockResolvedValue({
          metadata: { name: 'app1' },
          spec: { project: 'default', destination: {} },
          status: {},
        }),
      });

      const result = await handleListRevisions(client, { name: 'app1' });
      expect(result.content[0].text).toContain('No revision history');
    });
  });

  describe('handleRollbackApplication', () => {
    it('should rollback and show result', async () => {
      const client = makeMockClient();
      const result = await handleRollbackApplication(client, {
        name: 'app1',
        revisionId: 2,
      });

      expect(result.content[0].text).toContain('Rollback Result');
      expect(result.content[0].text).toContain('Revision ID: 2');
      expect(result.content[0].text).toContain('Succeeded');
    });
  });
});

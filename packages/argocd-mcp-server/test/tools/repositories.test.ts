import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import { handleListRepositories } from '../../src/tools/repositories.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    listRepositories: vi.fn().mockResolvedValue({
      items: [
        {
          repo: 'https://github.com/org/frontend.git',
          type: 'git',
          connectionState: { status: 'Successful' },
        },
        {
          repo: 'https://github.com/org/backend.git',
          type: 'git',
          connectionState: { status: 'Successful' },
          project: 'default',
        },
        {
          repo: 'https://charts.helm.sh/stable',
          type: 'helm',
          connectionState: { status: 'Successful' },
        },
      ],
    }),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Repository Tools', () => {
  describe('handleListRepositories', () => {
    it('should list all repositories', async () => {
      const client = makeMockClient();
      const result = await handleListRepositories(client, {});

      expect(result.content[0].text).toContain('3 total');
      expect(result.content[0].text).toContain('frontend');
      expect(result.content[0].text).toContain('backend');
      expect(result.content[0].text).toContain('helm');
    });

    it('should filter by repo URL substring', async () => {
      const client = makeMockClient();
      const result = await handleListRepositories(client, { repo: 'frontend' });

      expect(result.content[0].text).toContain('1 total');
      expect(result.content[0].text).toContain('frontend');
    });

    it('should handle empty repos', async () => {
      const client = makeMockClient({
        listRepositories: vi.fn().mockResolvedValue({ items: [] }),
      });

      const result = await handleListRepositories(client, {});
      expect(result.content[0].text).toContain('No repositories found');
    });

    it('should handle case-insensitive filter', async () => {
      const client = makeMockClient();
      const result = await handleListRepositories(client, { repo: 'FRONTEND' });

      expect(result.content[0].text).toContain('1 total');
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import { handleListProjects, handleGetProject } from '../../src/tools/projects.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    listProjects: vi.fn().mockResolvedValue([
      {
        metadata: { name: 'default' },
        spec: {
          description: 'Default project',
          sourceRepos: ['*'],
          destinations: [{ server: '*', namespace: '*' }],
        },
      },
      {
        metadata: { name: 'finance' },
        spec: {
          description: 'Finance team',
          sourceRepos: ['https://github.com/finance/*'],
          destinations: [{ server: 'https://prod.k8s', namespace: 'finance' }],
        },
      },
    ]),
    getProject: vi.fn().mockResolvedValue({
      metadata: { name: 'default' },
      spec: {
        description: 'Default project',
        sourceRepos: ['*'],
        destinations: [{ server: '*', namespace: '*' }],
        roles: [{ name: 'admin', description: 'Admin role' }],
      },
    }),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Project Tools', () => {
  describe('handleListProjects', () => {
    it('should list projects', async () => {
      const client = makeMockClient();
      const result = await handleListProjects(client);

      expect(result.content[0].text).toContain('2 total');
      expect(result.content[0].text).toContain('default');
      expect(result.content[0].text).toContain('finance');
    });

    it('should handle empty projects', async () => {
      const client = makeMockClient({
        listProjects: vi.fn().mockResolvedValue([]),
      });

      const result = await handleListProjects(client);
      expect(result.content[0].text).toContain('No Argo CD projects found');
    });
  });

  describe('handleGetProject', () => {
    it('should get project detail', async () => {
      const client = makeMockClient();
      const result = await handleGetProject(client, { name: 'default' });

      expect(result.content[0].text).toContain('Project: default');
      expect(result.content[0].text).toContain('Default project');
      expect(result.content[0].text).toContain('admin');
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import {
  handleListApplications,
  handleGetApplication,
  handleCreateApplication,
  handleDeleteApplication,
} from '../../src/tools/applications.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    listApplications: vi.fn().mockResolvedValue([]),
    getApplication: vi.fn().mockResolvedValue({
      metadata: { name: 'test-app' },
      spec: { project: 'default', destination: { namespace: 'prod' } },
      status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
    }),
    createApplication: vi.fn().mockResolvedValue({
      metadata: { name: 'new-app' },
      spec: { project: 'default', destination: { namespace: 'dev' } },
      status: { sync: { status: 'OutOfSync' }, health: { status: 'Missing' } },
    }),
    deleteApplication: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Application Tools', () => {
  describe('handleListApplications', () => {
    it('should list all applications', async () => {
      const client = makeMockClient({
        listApplications: vi.fn().mockResolvedValue([
          {
            metadata: { name: 'app1' },
            spec: {
              project: 'default',
              source: { repoURL: 'https://github.com/org/app1.git' },
              destination: { namespace: 'prod' },
            },
            status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
          },
          {
            metadata: { name: 'app2' },
            spec: {
              project: 'default',
              source: { repoURL: 'https://github.com/org/app2.git' },
              destination: { namespace: 'staging' },
            },
            status: { sync: { status: 'OutOfSync' }, health: { status: 'Degraded' } },
          },
        ]),
      });

      const result = await handleListApplications(client, {});

      expect(result.content[0].text).toContain('2 total');
      expect(result.content[0].text).toContain('app1');
      expect(result.content[0].text).toContain('app2');
      expect(result.content[0].text).toContain('Synced');
      expect(result.content[0].text).toContain('OutOfSync');
    });

    it('should filter by namespace', async () => {
      const client = makeMockClient({
        listApplications: vi.fn().mockResolvedValue([
          {
            metadata: { name: 'app1' },
            spec: { project: 'default', destination: { namespace: 'prod' } },
            status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
          },
          {
            metadata: { name: 'app2' },
            spec: { project: 'default', destination: { namespace: 'staging' } },
            status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
          },
        ]),
      });

      const result = await handleListApplications(client, { namespace: 'prod' });

      expect(result.content[0].text).toContain('1 total');
      expect(result.content[0].text).toContain('app1');
      expect(result.content[0].text).not.toContain('app2');
    });

    it('should handle empty list', async () => {
      const client = makeMockClient();
      const result = await handleListApplications(client, {});

      expect(result.content[0].text).toContain('No Argo CD applications found');
    });

    it('should pass project and selector to client', async () => {
      const listFn = vi.fn().mockResolvedValue([]);
      const client = makeMockClient({ listApplications: listFn });

      await handleListApplications(client, {
        project: 'myproj',
        selector: 'team=backend',
      });

      expect(listFn).toHaveBeenCalledWith('myproj', 'team=backend');
    });
  });

  describe('handleGetApplication', () => {
    it('should get application detail', async () => {
      const client = makeMockClient();
      const result = await handleGetApplication(client, { name: 'test-app' });

      expect(result.content[0].text).toContain('Application: test-app');
      expect(result.content[0].text).toContain('Synced');
      expect(result.content[0].text).toContain('Healthy');
    });
  });

  describe('handleCreateApplication', () => {
    it('should create application and return details', async () => {
      const client = makeMockClient();
      const result = await handleCreateApplication(client, {
        name: 'new-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo.git',
        path: 'k8s/',
        targetRevision: 'HEAD',
        destServer: 'https://kubernetes.default.svc',
        destNamespace: 'dev',
        syncPolicy: 'manual',
      });

      expect(result.content[0].text).toContain('created successfully');
      expect(result.content[0].text).toContain('new-app');
    });
  });

  describe('handleDeleteApplication', () => {
    it('should delete with cascade message', async () => {
      const client = makeMockClient();
      const result = await handleDeleteApplication(client, {
        name: 'del-app',
        cascade: true,
      });

      expect(result.content[0].text).toContain('deleted successfully');
      expect(result.content[0].text).toContain('Kubernetes resources were also removed');
    });

    it('should delete without cascade message', async () => {
      const client = makeMockClient();
      const result = await handleDeleteApplication(client, {
        name: 'del-app',
        cascade: false,
      });

      expect(result.content[0].text).toContain('deleted successfully');
      expect(result.content[0].text).not.toContain('Kubernetes resources');
    });
  });
});

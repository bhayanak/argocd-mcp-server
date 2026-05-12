import { describe, it, expect } from 'vitest';
import {
  syncStatusEmoji,
  healthStatusEmoji,
  formatAppList,
  formatAppDetail,
  formatProjectList,
  formatProjectDetail,
  formatRepoList,
  formatRevisionHistory,
  formatResourceTree,
  formatDiff,
  formatEvents,
} from '../../src/utils/formatter.js';
import type { ArgoApplication, ArgoProject, ArgoRepository } from '../../src/client/types.js';

describe('Formatter', () => {
  describe('syncStatusEmoji', () => {
    it('should return ✅ for Synced', () => {
      expect(syncStatusEmoji('Synced')).toBe('✅');
    });

    it('should return ⚠️ for OutOfSync', () => {
      expect(syncStatusEmoji('OutOfSync')).toBe('⚠️');
    });

    it('should return ❓ for unknown', () => {
      expect(syncStatusEmoji('WhatIsThis')).toBe('❓');
    });
  });

  describe('healthStatusEmoji', () => {
    it('should return correct emojis', () => {
      expect(healthStatusEmoji('Healthy')).toBe('💚');
      expect(healthStatusEmoji('Degraded')).toBe('🔴');
      expect(healthStatusEmoji('Progressing')).toBe('🔄');
      expect(healthStatusEmoji('Suspended')).toBe('⏸️');
      expect(healthStatusEmoji('Missing')).toBe('❌');
      expect(healthStatusEmoji('Unknown')).toBe('❓');
    });
  });

  describe('formatAppList', () => {
    it('should format applications', () => {
      const apps: ArgoApplication[] = [
        {
          metadata: { name: 'web' },
          spec: {
            project: 'default',
            source: { repoURL: 'https://github.com/org/web.git' },
            destination: { namespace: 'prod' },
          },
          status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
        },
      ];

      const result = formatAppList(apps);
      expect(result).toContain('1 total');
      expect(result).toContain('web');
      expect(result).toContain('default');
      expect(result).toContain('prod');
    });

    it('should handle app with multi-source', () => {
      const apps: ArgoApplication[] = [
        {
          metadata: { name: 'multi' },
          spec: {
            project: 'default',
            sources: [{ repoURL: 'https://github.com/org/multi.git' }],
            destination: { namespace: 'prod' },
          },
          status: { sync: { status: 'Unknown' }, health: { status: 'Unknown' } },
        },
      ];
      const result = formatAppList(apps);
      expect(result).toContain('multi');
      expect(result).toContain('github.com/org/multi');
    });

    it('should handle app with no source or status', () => {
      const apps: ArgoApplication[] = [
        {
          metadata: { name: 'bare' },
          spec: { project: 'default', destination: {} },
        },
      ];
      const result = formatAppList(apps);
      expect(result).toContain('bare');
    });

    it('should return message for empty list', () => {
      expect(formatAppList([])).toContain('No Argo CD applications');
    });
  });

  describe('formatAppDetail', () => {
    it('should format app detail with resources', () => {
      const app: ArgoApplication = {
        metadata: { name: 'web-app' },
        spec: {
          project: 'default',
          source: {
            repoURL: 'https://github.com/org/web.git',
            path: 'k8s/',
            targetRevision: 'main',
          },
          destination: { server: 'https://k8s.local', namespace: 'prod' },
          syncPolicy: { automated: { prune: true, selfHeal: true } },
        },
        status: {
          sync: { status: 'Synced', revision: 'abc123' },
          health: { status: 'Healthy' },
          reconciledAt: '2024-01-15T10:00:00Z',
          resources: [
            { kind: 'Deployment', name: 'web', status: 'Synced', health: { status: 'Healthy' } },
            { kind: 'Service', name: 'web-svc', status: 'Synced', health: { status: 'Healthy' } },
          ],
          conditions: [],
        },
      };

      const result = formatAppDetail(app);
      expect(result).toContain('Application: web-app');
      expect(result).toContain('default');
      expect(result).toContain('prod');
      expect(result).toContain('main');
      expect(result).toContain('Auto');
      expect(result).toContain('prune=true');
      expect(result).toContain('Resources (2)');
      expect(result).toContain('Deployment/web');
      expect(result).toContain('Conditions: None');
    });

    it('should format app with conditions', () => {
      const app: ArgoApplication = {
        metadata: { name: 'bad-app' },
        spec: {
          project: 'default',
          source: { repoURL: 'https://github.com/org/web.git' },
          destination: { namespace: 'prod' },
        },
        status: {
          sync: { status: 'OutOfSync' },
          health: { status: 'Degraded', message: 'pod failing' },
          conditions: [{ type: 'SyncError', message: 'failed to sync' }],
        },
      };

      const result = formatAppDetail(app);
      expect(result).toContain('Degraded');
      expect(result).toContain('pod failing');
      expect(result).toContain('SyncError');
      expect(result).toContain('failed to sync');
    });

    it('should handle manual sync policy', () => {
      const app: ArgoApplication = {
        metadata: { name: 'manual-app' },
        spec: {
          project: 'default',
          destination: { namespace: 'prod' },
        },
        status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
      };

      const result = formatAppDetail(app);
      expect(result).toContain('Manual');
    });

    it('should handle app with destination name instead of server', () => {
      const app: ArgoApplication = {
        metadata: { name: 'name-dest' },
        spec: {
          project: 'default',
          source: { repoURL: 'https://github.com/org/web.git', chart: 'my-chart' },
          destination: { name: 'prod-cluster' },
        },
        status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
      };
      const result = formatAppDetail(app);
      expect(result).toContain('prod-cluster');
      expect(result).toContain('my-chart');
    });

    it('should handle app with no source at all', () => {
      const app: ArgoApplication = {
        metadata: { name: 'no-source' },
        spec: { project: 'default', destination: {} },
      };
      const result = formatAppDetail(app);
      expect(result).toContain('N/A');
    });

    it('should handle app with resources using groups', () => {
      const app: ArgoApplication = {
        metadata: { name: 'grouped' },
        spec: { project: 'default', destination: { namespace: 'prod' } },
        status: {
          sync: { status: 'Synced' },
          health: { status: 'Healthy' },
          resources: [
            {
              group: 'apps',
              kind: 'Deployment',
              name: 'web',
              status: 'Synced',
              health: { status: 'Healthy' },
            },
          ],
        },
      };
      const result = formatAppDetail(app);
      expect(result).toContain('apps/Deployment/web');
    });
  });

  describe('formatProjectList', () => {
    it('should format project list', () => {
      const projects: ArgoProject[] = [
        {
          metadata: { name: 'default' },
          spec: { description: 'Default', sourceRepos: ['*'], destinations: [{ server: '*' }] },
        },
      ];
      const result = formatProjectList(projects);
      expect(result).toContain('1 total');
      expect(result).toContain('default');
    });

    it('should return message for empty list', () => {
      expect(formatProjectList([])).toContain('No Argo CD projects');
    });
  });

  describe('formatProjectDetail', () => {
    it('should format project with repos and destinations', () => {
      const project: ArgoProject = {
        metadata: { name: 'myproj' },
        spec: {
          description: 'My project',
          sourceRepos: ['https://github.com/org/*'],
          destinations: [{ server: 'https://k8s.local', namespace: 'default' }],
          roles: [{ name: 'deployer', description: 'Can deploy' }],
        },
      };
      const result = formatProjectDetail(project);
      expect(result).toContain('Project: myproj');
      expect(result).toContain('My project');
      expect(result).toContain('github.com/org/*');
      expect(result).toContain('k8s.local');
      expect(result).toContain('deployer');
    });

    it('should handle project with no repos or destinations', () => {
      const project: ArgoProject = {
        metadata: { name: 'empty' },
        spec: {},
      };
      const result = formatProjectDetail(project);
      expect(result).toContain('(none)');
    });
  });

  describe('formatRepoList', () => {
    it('should format repository list', () => {
      const repos: ArgoRepository[] = [
        {
          repo: 'https://github.com/org/web.git',
          type: 'git',
          connectionState: { status: 'Successful' },
        },
      ];
      const result = formatRepoList(repos);
      expect(result).toContain('1 total');
      expect(result).toContain('github.com/org/web');
    });

    it('should return message for empty list', () => {
      expect(formatRepoList([])).toContain('No repositories');
    });
  });

  describe('formatRevisionHistory', () => {
    it('should format history entries', () => {
      const history = [
        {
          id: 3,
          revision: 'ccc333def456',
          deployedAt: '2024-01-03T00:00:00Z',
          source: { repoURL: 'https://github.com/org/web.git' },
        },
        {
          id: 2,
          revision: 'bbb222',
          deployedAt: '2024-01-02T00:00:00Z',
          source: { repoURL: 'https://github.com/org/web.git' },
        },
      ];
      const result = formatRevisionHistory('app1', history);
      expect(result).toContain('Revision History: app1');
      expect(result).toContain('2 entries');
      expect(result).toContain('ccc333def456');
    });

    it('should handle entries with sources array', () => {
      const history = [
        {
          id: 1,
          revision: 'abc',
          deployedAt: '2024-01-01',
          sources: [{ repoURL: 'https://github.com/org/multi.git' }],
        },
      ];
      const result = formatRevisionHistory('app1', history);
      expect(result).toContain('github.com/org/multi');
    });

    it('should handle entries with missing revision', () => {
      const history = [
        { id: 1, revision: undefined as unknown as string, deployedAt: '2024-01-01' },
      ];
      const result = formatRevisionHistory('app1', history);
      expect(result).toContain('N/A');
    });

    it('should return message for empty history', () => {
      expect(formatRevisionHistory('app1', [])).toContain('No revision history');
    });
  });

  describe('formatResourceTree', () => {
    it('should format hierarchical tree', () => {
      const tree = {
        nodes: [
          { kind: 'Deployment', name: 'web', health: { status: 'Healthy' } },
          {
            kind: 'ReplicaSet',
            name: 'web-abc',
            health: { status: 'Healthy' },
            parentRefs: [{ kind: 'Deployment', name: 'web' }],
          },
        ],
        orphanedNodes: [],
      };
      const result = formatResourceTree('app1', tree);
      expect(result).toContain('Resource Tree: app1');
      expect(result).toContain('Deployment/web');
      expect(result).toContain('ReplicaSet/web-abc');
    });

    it('should handle empty tree', () => {
      expect(formatResourceTree('app1', { nodes: [], orphanedNodes: [] })).toContain(
        'No resources'
      );
    });

    it('should handle undefined nodes', () => {
      expect(formatResourceTree('app1', {})).toContain('No resources');
    });

    it('should show health messages on nodes', () => {
      const tree = {
        nodes: [
          {
            kind: 'Pod',
            name: 'crash-pod',
            health: { status: 'Degraded', message: 'CrashLoopBackOff' },
          },
        ],
      };
      const result = formatResourceTree('app1', tree);
      expect(result).toContain('CrashLoopBackOff');
    });

    it('should handle nodes with group prefix', () => {
      const tree = {
        nodes: [{ kind: 'Deployment', name: 'web', group: 'apps', health: { status: 'Healthy' } }],
      };
      const result = formatResourceTree('app1', tree);
      expect(result).toContain('apps/Deployment/web');
    });
  });

  describe('formatDiff', () => {
    it('should format drifted resources', () => {
      const managed = {
        items: [
          {
            kind: 'Deployment',
            name: 'web',
            targetState: '{"replicas":3}',
            liveState: '{"replicas":2}',
          },
        ],
      };
      const result = formatDiff('app1', managed);
      expect(result).toContain('Diff Report');
      expect(result).toContain('1 of 1');
    });

    it('should report no drift', () => {
      const managed = {
        items: [{ kind: 'Deployment', name: 'web', targetState: '{}', liveState: '{}' }],
      };
      const result = formatDiff('app1', managed);
      expect(result).toContain('in sync');
    });

    it('should handle empty items', () => {
      expect(formatDiff('app1', { items: [] })).toContain('No managed resources');
    });

    it('should skip resources with missing targetState', () => {
      const managed = {
        items: [
          { kind: 'Deployment', name: 'web', targetState: undefined, liveState: '{"a":1}' },
          { kind: 'Service', name: 'svc', targetState: '{"a":1}', liveState: undefined },
        ],
      };
      const result = formatDiff('app1', managed);
      expect(result).toContain('in sync');
    });

    it('should handle resources with group in diff', () => {
      const managed = {
        items: [
          {
            kind: 'Deployment',
            name: 'web',
            group: 'apps',
            namespace: 'prod',
            targetState: '{"a":1}',
            liveState: '{"a":2}',
          },
        ],
      };
      const result = formatDiff('app1', managed);
      expect(result).toContain('apps/Deployment');
      expect(result).toContain('ns: prod');
    });

    it('should handle undefined items', () => {
      expect(formatDiff('app1', {})).toContain('No managed resources');
    });
  });

  describe('formatEvents', () => {
    it('should format events', () => {
      const events = {
        items: [
          {
            reason: 'Synced',
            message: 'App synced',
            type: 'Normal',
            lastTimestamp: '2024-01-15T10:00:00Z',
          },
        ],
      };
      const result = formatEvents('app1', events);
      expect(result).toContain('Events: app1');
      expect(result).toContain('1 total');
      expect(result).toContain('Synced');
    });

    it('should handle empty events', () => {
      expect(formatEvents('app1', { items: [] })).toContain('No events');
    });

    it('should handle events with missing timestamps', () => {
      const events = {
        items: [
          { reason: 'Synced', message: 'done', type: undefined },
          { reason: undefined, message: undefined, firstTimestamp: '2024-01-01' },
        ],
      };
      const result = formatEvents('app1', events);
      expect(result).toContain('Normal');
      expect(result).toContain('Unknown');
    });

    it('should handle undefined items in events', () => {
      expect(formatEvents('app1', {})).toContain('No events');
    });
  });
});

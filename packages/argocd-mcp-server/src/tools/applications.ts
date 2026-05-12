import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatAppList, formatAppDetail } from '../utils/formatter.js';

export async function handleListApplications(
  client: ArgoCDClient,
  args: { project?: string; namespace?: string; selector?: string }
) {
  const apps = await client.listApplications(args.project, args.selector);
  const filtered = args.namespace
    ? apps.filter((a) => a.spec.destination.namespace === args.namespace)
    : apps;
  return { content: [{ type: 'text' as const, text: formatAppList(filtered) }] };
}

export async function handleGetApplication(
  client: ArgoCDClient,
  args: { name: string; project?: string }
) {
  const app = await client.getApplication(args.name);
  return { content: [{ type: 'text' as const, text: formatAppDetail(app) }] };
}

export async function handleCreateApplication(
  client: ArgoCDClient,
  args: {
    name: string;
    project: string;
    repoURL: string;
    path: string;
    targetRevision: string;
    destServer: string;
    destNamespace: string;
    syncPolicy: 'manual' | 'auto';
  }
) {
  const app = await client.createApplication({
    name: args.name,
    project: args.project,
    repoURL: args.repoURL,
    path: args.path,
    targetRevision: args.targetRevision,
    destServer: args.destServer,
    destNamespace: args.destNamespace,
    syncPolicy: args.syncPolicy,
  });
  return {
    content: [
      {
        type: 'text' as const,
        text: `Application "${app.metadata.name}" created successfully.\n\n${formatAppDetail(app)}`,
      },
    ],
  };
}

export async function handleDeleteApplication(
  client: ArgoCDClient,
  args: { name: string; cascade: boolean }
) {
  await client.deleteApplication(args.name, args.cascade);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Application "${args.name}" deleted successfully.${args.cascade ? ' Associated Kubernetes resources were also removed.' : ''}`,
      },
    ],
  };
}

export function registerApplicationTools(server: McpServer, client: ArgoCDClient) {
  server.tool(
    'argocd_list_applications',
    'List all Argo CD applications with sync status and health',
    {
      project: z.string().optional().describe('Filter by AppProject name'),
      namespace: z.string().optional().describe('Filter by destination namespace'),
      selector: z.string().optional().describe("Label selector (e.g., 'team=backend')"),
    },
    (args) => handleListApplications(client, args)
  );

  server.tool(
    'argocd_get_application',
    'Get detailed information about a specific Argo CD application',
    {
      name: z.string().describe('Application name'),
      project: z.string().optional().describe('AppProject (for disambiguation)'),
    },
    (args) => handleGetApplication(client, args)
  );

  server.tool(
    'argocd_create_application',
    'Create a new Argo CD application (destructive operation)',
    {
      name: z.string().describe('Application name'),
      project: z.string().describe('AppProject name'),
      repoURL: z.string().describe('Git repository URL'),
      path: z.string().describe('Path within repo to manifests'),
      targetRevision: z.string().optional().default('HEAD').describe('Git revision'),
      destServer: z
        .string()
        .optional()
        .default('https://kubernetes.default.svc')
        .describe('Destination cluster API server URL'),
      destNamespace: z.string().describe('Target namespace'),
      syncPolicy: z.enum(['manual', 'auto']).optional().default('manual').describe('Sync policy'),
    },
    (args) => handleCreateApplication(client, args)
  );

  server.tool(
    'argocd_delete_application',
    'Delete an Argo CD application (destructive operation — removes application and optionally its Kubernetes resources)',
    {
      name: z.string().describe('Application name'),
      cascade: z
        .boolean()
        .optional()
        .default(true)
        .describe('Also delete associated Kubernetes resources'),
    },
    (args) => handleDeleteApplication(client, args)
  );
}

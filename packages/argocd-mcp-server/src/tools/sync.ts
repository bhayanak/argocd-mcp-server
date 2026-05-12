import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatAppDetail, formatDiff } from '../utils/formatter.js';

export async function handleSyncApplication(
  client: ArgoCDClient,
  args: {
    name: string;
    revision?: string;
    prune?: boolean;
    dryRun?: boolean;
    resources?: Array<{ group: string; kind: string; name: string }>;
  }
) {
  const result = await client.syncApplication(args.name, {
    revision: args.revision,
    prune: args.prune,
    dryRun: args.dryRun,
    resources: args.resources,
  });

  const phase = result.status?.operationState?.phase ?? 'Unknown';
  const message = result.status?.operationState?.message ?? '';
  const syncedResources = result.status?.operationState?.syncResult?.resources ?? [];

  let text = `Sync ${args.dryRun ? '(Dry Run) ' : ''}Result: ${args.name}\n`;
  text += '━'.repeat(40) + '\n';
  text += `Phase:    ${phase}\n`;
  if (message) text += `Message:  ${message}\n`;
  if (result.status?.operationState?.syncResult?.revision) {
    text += `Revision: ${result.status.operationState.syncResult.revision}\n`;
  }

  if (syncedResources.length > 0) {
    text += '\nSynced Resources:\n';
    for (const r of syncedResources) {
      const kind = r.group ? `${r.group}/${r.kind}` : r.kind;
      text += `  ${r.status === 'Synced' ? '✅' : '❌'} ${kind}/${r.name} — ${r.status}${r.message ? ` (${r.message})` : ''}\n`;
    }
  }

  return { content: [{ type: 'text' as const, text }] };
}

export async function handleRefreshApplication(
  client: ArgoCDClient,
  args: { name: string; hard?: boolean }
) {
  const app = await client.refreshApplication(args.name, args.hard ?? false);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Application "${args.name}" refreshed${args.hard ? ' (hard)' : ''}.\n\n${formatAppDetail(app)}`,
      },
    ],
  };
}

export async function handleGetAppDiff(client: ArgoCDClient, args: { name: string }) {
  const managed = await client.getManifestDiff(args.name);
  return { content: [{ type: 'text' as const, text: formatDiff(args.name, managed) }] };
}

export function registerSyncTools(server: McpServer, client: ArgoCDClient) {
  server.tool(
    'argocd_sync_application',
    'Trigger a sync operation for an Argo CD application (applies desired state from Git to the cluster)',
    {
      name: z.string().describe('Application name'),
      revision: z.string().optional().describe('Specific revision/commit to sync to'),
      prune: z.boolean().optional().default(false).describe('Prune orphaned resources not in Git'),
      dryRun: z.boolean().optional().default(false).describe('Dry run only, do not apply'),
      resources: z
        .array(
          z.object({
            group: z.string().describe('API group'),
            kind: z.string().describe('Resource kind'),
            name: z.string().describe('Resource name'),
          })
        )
        .optional()
        .describe('Specific resources to sync (selective sync)'),
    },
    (args) => handleSyncApplication(client, args)
  );

  server.tool(
    'argocd_refresh_application',
    'Refresh application state from the cluster and Git',
    {
      name: z.string().describe('Application name'),
      hard: z
        .boolean()
        .optional()
        .default(false)
        .describe('Hard refresh — invalidate manifest cache'),
    },
    (args) => handleRefreshApplication(client, args)
  );

  server.tool(
    'argocd_get_app_diff',
    'View the diff between live (cluster) state and desired (Git) state for an application',
    {
      name: z.string().describe('Application name'),
    },
    (args) => handleGetAppDiff(client, args)
  );
}

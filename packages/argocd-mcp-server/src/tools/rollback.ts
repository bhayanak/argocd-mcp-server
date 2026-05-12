import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatRevisionHistory } from '../utils/formatter.js';

export async function handleListRevisions(
  client: ArgoCDClient,
  args: { name: string; limit?: number }
) {
  const app = await client.getRevisionHistory(args.name);
  const history = app.status?.history ?? [];
  const limit = args.limit ?? 10;
  const limited = history.slice(-limit).reverse();
  return {
    content: [{ type: 'text' as const, text: formatRevisionHistory(args.name, limited) }],
  };
}

export async function handleRollbackApplication(
  client: ArgoCDClient,
  args: { name: string; revisionId: number }
) {
  const app = await client.rollbackApplication(args.name, args.revisionId);
  const phase = app.status?.operationState?.phase ?? 'Unknown';
  const message = app.status?.operationState?.message ?? '';

  let text = `Rollback Result: ${args.name}\n`;
  text += '━'.repeat(40) + '\n';
  text += `Revision ID: ${args.revisionId}\n`;
  text += `Phase:       ${phase}\n`;
  if (message) text += `Message:     ${message}\n`;

  return { content: [{ type: 'text' as const, text }] };
}

export function registerRollbackTools(server: McpServer, client: ArgoCDClient) {
  server.tool(
    'argocd_list_revisions',
    'List deployment revision history for an Argo CD application',
    {
      name: z.string().describe('Application name'),
      limit: z.number().optional().default(10).describe('Max number of revisions to return'),
    },
    (args) => handleListRevisions(client, args)
  );

  server.tool(
    'argocd_rollback_application',
    'Rollback an Argo CD application to a previous revision (destructive operation)',
    {
      name: z.string().describe('Application name'),
      revisionId: z.number().describe('Revision ID from the history list'),
    },
    (args) => handleRollbackApplication(client, args)
  );
}

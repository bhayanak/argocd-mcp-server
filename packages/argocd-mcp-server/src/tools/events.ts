import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatEvents } from '../utils/formatter.js';

export async function handleListEvents(client: ArgoCDClient, args: { name: string }) {
  const result = await client.getEvents(args.name);
  return {
    content: [{ type: 'text' as const, text: formatEvents(args.name, result) }],
  };
}

export function registerEventTools(server: McpServer, client: ArgoCDClient) {
  server.tool(
    'argocd_list_events',
    'List Kubernetes events related to an Argo CD application',
    {
      name: z.string().describe('Application name'),
    },
    (args) => handleListEvents(client, args)
  );
}

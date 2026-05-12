import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatProjectList, formatProjectDetail } from '../utils/formatter.js';

export async function handleListProjects(client: ArgoCDClient) {
  const projects = await client.listProjects();
  return { content: [{ type: 'text' as const, text: formatProjectList(projects) }] };
}

export async function handleGetProject(client: ArgoCDClient, args: { name: string }) {
  const project = await client.getProject(args.name);
  return { content: [{ type: 'text' as const, text: formatProjectDetail(project) }] };
}

export function registerProjectTools(server: McpServer, client: ArgoCDClient) {
  server.tool('argocd_list_projects', 'List all Argo CD AppProjects', {}, () =>
    handleListProjects(client)
  );

  server.tool(
    'argocd_get_project',
    'Get detailed information about an Argo CD AppProject',
    {
      name: z.string().describe('Project name'),
    },
    (args) => handleGetProject(client, args)
  );
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatRepoList } from '../utils/formatter.js';

export async function handleListRepositories(client: ArgoCDClient, args: { repo?: string }) {
  const result = await client.listRepositories();
  let repos = result.items ?? [];
  if (args.repo) {
    const search = args.repo.toLowerCase();
    repos = repos.filter((r) => r.repo.toLowerCase().includes(search));
  }
  return { content: [{ type: 'text' as const, text: formatRepoList(repos) }] };
}

export function registerRepositoryTools(server: McpServer, client: ArgoCDClient) {
  server.tool(
    'argocd_list_repositories',
    'List configured Git repositories in Argo CD',
    {
      repo: z.string().optional().describe('Filter by repository URL substring'),
    },
    (args) => handleListRepositories(client, args)
  );
}

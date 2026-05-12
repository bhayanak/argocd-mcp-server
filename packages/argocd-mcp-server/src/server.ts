import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ArgoCDConfig } from './config.js';
import { ArgoCDClient } from './client/argocd-client.js';
import { registerApplicationTools } from './tools/applications.js';
import { registerSyncTools } from './tools/sync.js';
import { registerRollbackTools } from './tools/rollback.js';
import { registerProjectTools } from './tools/projects.js';
import { registerRepositoryTools } from './tools/repositories.js';
import { registerResourceTools } from './tools/resources.js';
import { registerEventTools } from './tools/events.js';

export function createServer(config: ArgoCDConfig) {
  const server = new McpServer({
    name: 'argocd-mcp-server',
    version: '0.1.0',
  });

  const client = new ArgoCDClient(config);

  registerApplicationTools(server, client);
  registerSyncTools(server, client);
  registerRollbackTools(server, client);
  registerProjectTools(server, client);
  registerRepositoryTools(server, client);
  registerResourceTools(server, client);
  registerEventTools(server, client);

  return server;
}

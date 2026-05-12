import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ArgoCDClient } from '../client/argocd-client.js';
import { formatResourceTree } from '../utils/formatter.js';

export async function handleGetResourceTree(client: ArgoCDClient, args: { name: string }) {
  const tree = await client.getResourceTree(args.name);
  return { content: [{ type: 'text' as const, text: formatResourceTree(args.name, tree) }] };
}

export async function handleGetResource(
  client: ArgoCDClient,
  args: { name: string; resourceName: string; kind: string; namespace?: string; group?: string }
) {
  const resource = await client.getResource(args.name, {
    resourceName: args.resourceName,
    kind: args.kind,
    namespace: args.namespace,
    group: args.group,
  });
  return {
    content: [
      {
        type: 'text' as const,
        text: `Resource: ${args.kind}/${args.resourceName}\n${'━'.repeat(40)}\n${JSON.stringify(resource, null, 2)}`,
      },
    ],
  };
}

export async function handleGetPodLogs(
  client: ArgoCDClient,
  args: {
    name: string;
    podName: string;
    container?: string;
    namespace?: string;
    lines?: number;
    sinceSeconds?: number;
  }
) {
  const logs = await client.getPodLogs(args.name, args.podName, {
    container: args.container,
    namespace: args.namespace,
    lines: args.lines ?? 100,
    sinceSeconds: args.sinceSeconds ?? 3600,
  });

  let text = `Pod Logs: ${args.podName}\n`;
  text += '━'.repeat(40) + '\n';
  if (args.container) text += `Container: ${args.container}\n`;
  text += `\n${logs || '(no logs available)'}`;

  return { content: [{ type: 'text' as const, text }] };
}

export function registerResourceTools(server: McpServer, client: ArgoCDClient) {
  server.tool(
    'argocd_get_resource_tree',
    'Get the full managed resource tree for an Argo CD application (deployments, pods, services, etc.)',
    {
      name: z.string().describe('Application name'),
    },
    (args) => handleGetResourceTree(client, args)
  );

  server.tool(
    'argocd_get_resource',
    'Get the full manifest of a specific managed resource within an Argo CD application',
    {
      name: z.string().describe('Application name'),
      resourceName: z.string().describe('Resource name'),
      kind: z.string().describe('Resource kind (e.g., Deployment, Service, ConfigMap)'),
      namespace: z.string().optional().describe('Resource namespace'),
      group: z.string().optional().describe('API group (e.g., apps, networking.k8s.io)'),
    },
    (args) => handleGetResource(client, args)
  );

  server.tool(
    'argocd_get_pod_logs',
    'Retrieve pod logs for a pod managed by an Argo CD application',
    {
      name: z.string().describe('Application name'),
      podName: z.string().describe('Pod name'),
      container: z.string().optional().describe('Container name'),
      namespace: z.string().optional().describe('Pod namespace'),
      lines: z.number().optional().default(100).describe('Number of log lines to return'),
      sinceSeconds: z
        .number()
        .optional()
        .default(3600)
        .describe('Return logs from the last N seconds'),
    },
    (args) => handleGetPodLogs(client, args)
  );
}

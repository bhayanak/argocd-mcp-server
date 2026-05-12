import { z } from 'zod';

const configSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1, 'ARGOCD_MCP_TOKEN is required'),
  insecure: z.boolean().default(false),
  timeoutMs: z.number().int().positive().default(30000),
  maxLogLines: z.number().int().positive().default(500),
  allowedProjects: z.array(z.string()).default([]),
});

export type ArgoCDConfig = z.infer<typeof configSchema>;

export function loadConfig(): ArgoCDConfig {
  const url = process.env.ARGOCD_MCP_URL;
  const token = process.env.ARGOCD_MCP_TOKEN;

  if (!url) {
    throw new Error('ARGOCD_MCP_URL environment variable is required');
  }
  if (!token) {
    throw new Error('ARGOCD_MCP_TOKEN environment variable is required');
  }

  const insecure = process.env.ARGOCD_MCP_INSECURE === 'true';
  const timeoutMs = process.env.ARGOCD_MCP_TIMEOUT_MS
    ? parseInt(process.env.ARGOCD_MCP_TIMEOUT_MS, 10)
    : 30000;
  const maxLogLines = process.env.ARGOCD_MCP_MAX_LOG_LINES
    ? parseInt(process.env.ARGOCD_MCP_MAX_LOG_LINES, 10)
    : 500;
  const allowedProjects = process.env.ARGOCD_MCP_ALLOWED_PROJECTS
    ? process.env.ARGOCD_MCP_ALLOWED_PROJECTS.split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return configSchema.parse({ url, token, insecure, timeoutMs, maxLogLines, allowedProjects });
}

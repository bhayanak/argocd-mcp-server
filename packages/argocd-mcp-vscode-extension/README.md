# ArgoCD MCP Server — VS Code Extension

VS Code extension that automatically registers the ArgoCD MCP server, making 16 Argo CD tools available to GitHub Copilot Chat and other AI assistants.

## Setup

1. Install the extension (VSIX or Marketplace)
2. Open VS Code Settings and configure:

| Setting | Description | Default |
|---------|-------------|---------|
| `argocd.url` | Argo CD server URL | *(required)* |
| `argocd.token` | API bearer token | *(required)* |
| `argocd.insecure` | Skip TLS verification | `false` |
| `argocd.timeoutMs` | API timeout (ms) | `30000` |
| `argocd.maxLogLines` | Max pod log lines | `500` |
| `argocd.allowedProjects` | Project allow-list (comma-separated) | *(all)* |

3. The ArgoCD MCP Server appears automatically in the MCP Servers panel

## Available Tools

After configuration, these tools appear in the Copilot Chat tool picker:

- **argocd_list_applications** — List apps with sync/health status
- **argocd_get_application** — Detailed app info
- **argocd_create_application** — Create new app
- **argocd_delete_application** — Delete app
- **argocd_sync_application** — Trigger sync
- **argocd_refresh_application** — Refresh from cluster/Git
- **argocd_get_app_diff** — Live vs desired diff
- **argocd_list_revisions** — Deployment history
- **argocd_rollback_application** — Rollback to revision
- **argocd_list_projects** — List projects
- **argocd_get_project** — Project details
- **argocd_list_repositories** — List repos
- **argocd_get_resource_tree** — Resource tree
- **argocd_get_resource** — Resource manifest
- **argocd_get_pod_logs** — Pod logs
- **argocd_list_events** — Application events

## Example Prompts

Try these in Copilot Chat:

- *"Show me all ArgoCD apps that are unhealthy"*
- *"What's the sync status of the payments service?"*
- *"Diff the web-frontend app"*
- *"List the last 5 deployments of api-gateway"*
- *"Get the logs from the crashing pod in checkout-service"*

## Troubleshooting

**Server not showing in MCP panel:**
- Ensure `argocd.url` and `argocd.token` are configured
- Reload VS Code (`Developer: Reload Window`)

**Connection errors:**
- Verify the ArgoCD URL is accessible from your machine
- For self-signed certs, enable `argocd.insecure`
- Check the token has sufficient API permissions

**Timeout errors:**
- Increase `argocd.timeoutMs` for slow connections

## Requirements

- VS Code 1.99.0+
- Argo CD server with API access

## License

MIT

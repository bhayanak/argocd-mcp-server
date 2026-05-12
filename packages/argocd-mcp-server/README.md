# ArgoCD MCP Server

Standalone MCP server for Argo CD — GitOps continuous delivery for Kubernetes.

## Installation

```bash
npm install -g argocd-mcp-server
```

Or run directly:

```bash
npx argocd-mcp-server
```

## Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ARGOCD_MCP_URL` | **Yes** | Argo CD server URL | — |
| `ARGOCD_MCP_TOKEN` | **Yes** | API bearer token | — |
| `ARGOCD_MCP_INSECURE` | No | Skip TLS verification | `false` |
| `ARGOCD_MCP_TIMEOUT_MS` | No | API request timeout (ms) | `30000` |
| `ARGOCD_MCP_MAX_LOG_LINES` | No | Max pod log lines | `500` |
| `ARGOCD_MCP_ALLOWED_PROJECTS` | No | Comma-separated project allow-list | all |

## Client Configurations

### VS Code (`mcp.json`)

```json
{
  "servers": {
    "argocd": {
      "type": "stdio",
      "command": "npx",
      "args": ["argocd-mcp-server"],
      "env": {
        "ARGOCD_MCP_URL": "https://argocd.example.com",
        "ARGOCD_MCP_TOKEN": "your-token"
      }
    }
  }
}
```

### Claude Desktop

```json
{
  "mcpServers": {
    "argocd": {
      "command": "npx",
      "args": ["argocd-mcp-server"],
      "env": {
        "ARGOCD_MCP_URL": "https://argocd.example.com",
        "ARGOCD_MCP_TOKEN": "your-token"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "argocd": {
      "command": "npx",
      "args": ["argocd-mcp-server"],
      "env": {
        "ARGOCD_MCP_URL": "https://argocd.example.com",
        "ARGOCD_MCP_TOKEN": "your-token"
      }
    }
  }
}
```

## Tools Reference

### Application Management

| Tool | Description |
|------|-------------|
| `argocd_list_applications` | List all apps with sync status, health, project, namespace |
| `argocd_get_application` | Get detailed app info including resources and conditions |
| `argocd_create_application` | Create a new application with repo, path, sync policy |
| `argocd_delete_application` | Delete an application (with optional cascade) |

### Sync & Refresh

| Tool | Description |
|------|-------------|
| `argocd_sync_application` | Trigger sync with optional prune, dry-run, selective resources |
| `argocd_refresh_application` | Refresh app state (normal or hard/cache-bust) |
| `argocd_get_app_diff` | View live vs desired manifest diff |

### Rollback

| Tool | Description |
|------|-------------|
| `argocd_list_revisions` | List deployment revision history |
| `argocd_rollback_application` | Rollback to a specific revision ID |

### Projects & Repositories

| Tool | Description |
|------|-------------|
| `argocd_list_projects` | List all AppProjects |
| `argocd_get_project` | Get project details (repos, destinations, roles) |
| `argocd_list_repositories` | List configured Git/Helm repositories |

### Resources & Events

| Tool | Description |
|------|-------------|
| `argocd_get_resource_tree` | Get full resource tree (deployments, pods, services) |
| `argocd_get_resource` | Get specific resource manifest |
| `argocd_get_pod_logs` | Retrieve pod logs with container/time filters |
| `argocd_list_events` | List Kubernetes events for an app |

## Security

- Bearer tokens loaded from environment only — never logged or returned
- Project-level access control via `ARGOCD_MCP_ALLOWED_PROJECTS`
- HTTPS required by default; `ARGOCD_MCP_INSECURE` for self-signed certs
- All inputs validated via Zod schemas
- SSRF protection on API requests

## Compatibility

- Node.js >= 18
- Argo CD API v1 (tested with Argo CD 2.8+)
- MCP SDK 1.12+

## License

MIT

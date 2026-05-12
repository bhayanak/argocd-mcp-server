# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-05-12

### Added

- Initial release of ArgoCD MCP Server
- 16 MCP tools for Argo CD integration:
  - **Application Management**: list, get, create, delete applications
  - **Sync & Refresh**: sync (with dry-run), refresh (normal/hard), manifest diff
  - **Rollback**: list revision history, rollback to specific revision
  - **Projects**: list and get AppProject details
  - **Repositories**: list configured Git/Helm repositories
  - **Resources**: resource tree, specific resource manifests, pod logs
  - **Events**: list application events
- ArgoCD API client with bearer token authentication
- SSRF protection on all API requests
- Project-level access control via `ARGOCD_MCP_ALLOWED_PROJECTS`
- Input validation via Zod schemas on all tools
- VS Code extension with automatic MCP server registration
- VS Code settings for all configuration options
- CI pipeline with Node 18/20/22 matrix (typecheck, lint, format, test, coverage, build, audit)
- Release workflow with npm publish and GitHub Release
- 90%+ code coverage with comprehensive unit tests
- 3 READMEs (root, server, extension) with badges and documentation
- SVG logo with PNG generation script

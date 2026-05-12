import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const serverPath = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'server',
    'index.js'
  ).fsPath;

  // EventEmitter lets VS Code re-query provideMcpServerDefinitions when settings change.
  const changeEmitter = new vscode.EventEmitter<void>();

  const disposable = vscode.lm.registerMcpServerDefinitionProvider('argocd-mcp-server', {
    // CRITICAL: wire up the change event so VS Code refreshes the server list
    // whenever ArgoCD settings are updated by the user.
    onDidChangeMcpServerDefinitions: changeEmitter.event,

    provideMcpServerDefinitions(_token: vscode.CancellationToken) {
      const config = vscode.workspace.getConfiguration('argocd');

      const url = config.get<string>('url', '');
      const token = config.get<string>('token', '');
      const insecure = config.get<boolean>('insecure', false);
      const timeoutMs = config.get<number>('timeoutMs', 30000);
      const maxLogLines = config.get<number>('maxLogLines', 500);
      const allowedProjects = config.get<string>('allowedProjects', '');

      const env: Record<string, string> = {
        ARGOCD_MCP_URL: url,
        ARGOCD_MCP_TOKEN: token,
        ARGOCD_MCP_INSECURE: String(insecure),
        ARGOCD_MCP_TIMEOUT_MS: String(timeoutMs),
        ARGOCD_MCP_MAX_LOG_LINES: String(maxLogLines),
      };

      if (allowedProjects) {
        env.ARGOCD_MCP_ALLOWED_PROJECTS = allowedProjects;
      }

      // ALWAYS return the server definition — even when credentials are not yet
      // configured — so the server appears in VS Code's MCP Servers panel.
      // The server process validates credentials at startup and exits with a
      // clear error message if they are missing.
      return [
        new vscode.McpStdioServerDefinition(
          'ArgoCD MCP Server',
          process.execPath,
          [serverPath],
          env,
          '0.1.0'
        ),
      ];
    },
  });

  // Re-notify VS Code whenever ArgoCD extension settings change so the MCP
  // server list (and its env vars) are refreshed without requiring a reload.
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('argocd')) {
      changeEmitter.fire();
    }
  });

  context.subscriptions.push(disposable, configWatcher, changeEmitter);
}

export function deactivate() {}

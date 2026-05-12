const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// 1. Bundle the VS Code extension (CJS, vscode external)
esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  platform: 'node',
  format: 'cjs',
  sourcemap: true,
});

// 2. Bundle the MCP server (CJS — NOT ESM — for spawning by the extension)
esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../argocd-mcp-server/src/index.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/server/index.js'),
  platform: 'node',
  format: 'cjs',
  sourcemap: true,
});

// 3. Strip shebang from bundled server (spawned via process.execPath, not directly)
const serverFile = path.resolve(__dirname, 'dist/server/index.js');
const content = fs.readFileSync(serverFile, 'utf8');
if (content.startsWith('#!')) {
  fs.writeFileSync(serverFile, content.replace(/^#![^\n]*\n/, ''));
}

console.log('✅ Extension and server bundled successfully');

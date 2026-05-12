import type {
  ArgoApplication,
  ArgoProject,
  ArgoRepository,
  ArgoRevisionHistory,
  ArgoResourceTree,
  ArgoResourceNode,
  ArgoManagedResourceList,
  ArgoEventList,
} from '../client/types.js';

// ── Status Emoji Helpers ─────────────────────────────────────────

export function syncStatusEmoji(status: string): string {
  switch (status) {
    case 'Synced':
      return '✅';
    case 'OutOfSync':
      return '⚠️';
    default:
      return '❓';
  }
}

export function healthStatusEmoji(status: string): string {
  switch (status) {
    case 'Healthy':
      return '💚';
    case 'Degraded':
      return '🔴';
    case 'Progressing':
      return '🔄';
    case 'Suspended':
      return '⏸️';
    case 'Missing':
      return '❌';
    default:
      return '❓';
  }
}

// ── Application Formatting ───────────────────────────────────────

export function formatAppList(apps: ArgoApplication[]): string {
  if (apps.length === 0) {
    return 'No Argo CD applications found.';
  }

  const header = `Argo CD Applications (${apps.length} total)\n\n`;
  const colHeaders =
    'Name                         Project        Namespace        Status            Health           Repo\n';
  const separator = '─'.repeat(120) + '\n';

  const rows = apps
    .map((app) => {
      const name = (app.metadata.name ?? '').padEnd(28);
      const project = (app.spec.project ?? '').padEnd(14);
      const ns = (app.spec.destination.namespace ?? '').padEnd(16);
      const syncStatus = app.status?.sync?.status ?? 'Unknown';
      const healthStatus = app.status?.health?.status ?? 'Unknown';
      const sync = `${syncStatusEmoji(syncStatus)} ${syncStatus}`.padEnd(17);
      const health = `${healthStatusEmoji(healthStatus)} ${healthStatus}`.padEnd(16);
      const repoURL = app.spec.source?.repoURL ?? app.spec.sources?.[0]?.repoURL ?? '';
      const repo = repoURL.replace(/^https?:\/\//, '').replace(/\.git$/, '');
      return `${name} ${project} ${ns} ${sync} ${health} ${repo}`;
    })
    .join('\n');

  return header + colHeaders + separator + rows;
}

export function formatAppDetail(app: ArgoApplication): string {
  const source = app.spec.source ?? app.spec.sources?.[0];
  const syncStatus = app.status?.sync?.status ?? 'Unknown';
  const healthStatus = app.status?.health?.status ?? 'Unknown';
  const revision = app.status?.sync?.revision ?? 'N/A';

  let text = `Application: ${app.metadata.name}\n`;
  text += '━'.repeat(40) + '\n';
  text += `Project:          ${app.spec.project}\n`;
  text += `Namespace:        ${app.spec.destination.namespace ?? 'N/A'}\n`;
  text += `Cluster:          ${app.spec.destination.server ?? app.spec.destination.name ?? 'N/A'}\n`;
  text += `Repo:             ${source?.repoURL ?? 'N/A'}\n`;
  text += `Path:             ${source?.path ?? source?.chart ?? 'N/A'}\n`;
  text += `Target Revision:  ${source?.targetRevision ?? 'HEAD'}\n`;
  text += `Sync Status:      ${syncStatusEmoji(syncStatus)} ${syncStatus} (${revision})\n`;
  text += `Health Status:    ${healthStatusEmoji(healthStatus)} ${healthStatus}\n`;

  if (app.status?.health?.message) {
    text += `Health Message:   ${app.status.health.message}\n`;
  }
  if (app.status?.reconciledAt) {
    text += `Reconciled At:    ${app.status.reconciledAt}\n`;
  }

  // Sync policy
  if (app.spec.syncPolicy?.automated) {
    const auto = app.spec.syncPolicy.automated;
    text += `Sync Policy:      Auto (prune=${auto.prune ?? false}, selfHeal=${auto.selfHeal ?? false})\n`;
  } else {
    text += `Sync Policy:      Manual\n`;
  }

  // Resources
  const resources = app.status?.resources ?? [];
  if (resources.length > 0) {
    text += `\nResources (${resources.length}):\n`;
    for (const r of resources) {
      const kind = r.group ? `${r.group}/${r.kind}` : r.kind;
      const sEmoji = syncStatusEmoji(r.status ?? 'Unknown');
      const hEmoji = healthStatusEmoji(r.health?.status ?? 'Unknown');
      text += `  ${sEmoji} ${hEmoji} ${kind}/${r.name}\n`;
    }
  }

  // Conditions
  const conditions = app.status?.conditions ?? [];
  if (conditions.length > 0) {
    text += '\nConditions:\n';
    for (const c of conditions) {
      text += `  ⚠️ ${c.type}: ${c.message}\n`;
    }
  } else {
    text += '\nConditions: None\n';
  }

  return text;
}

// ── Project Formatting ───────────────────────────────────────────

export function formatProjectList(projects: ArgoProject[]): string {
  if (projects.length === 0) {
    return 'No Argo CD projects found.';
  }

  let text = `Argo CD Projects (${projects.length} total)\n\n`;
  text +=
    'Name                         Description                    Source Repos    Destinations\n';
  text += '─'.repeat(110) + '\n';

  for (const p of projects) {
    const name = (p.metadata.name ?? '').padEnd(28);
    const desc = (p.spec.description ?? '').slice(0, 30).padEnd(30);
    const repos = String(p.spec.sourceRepos?.length ?? 0).padEnd(14);
    const dests = String(p.spec.destinations?.length ?? 0);
    text += `${name} ${desc} ${repos} ${dests}\n`;
  }

  return text;
}

export function formatProjectDetail(project: ArgoProject): string {
  let text = `Project: ${project.metadata.name}\n`;
  text += '━'.repeat(40) + '\n';
  text += `Description:  ${project.spec.description ?? 'N/A'}\n`;

  const repos = project.spec.sourceRepos ?? [];
  text += `\nSource Repositories (${repos.length}):\n`;
  if (repos.length === 0) {
    text += '  (none)\n';
  } else {
    for (const r of repos) {
      text += `  • ${r}\n`;
    }
  }

  const dests = project.spec.destinations ?? [];
  text += `\nDestinations (${dests.length}):\n`;
  if (dests.length === 0) {
    text += '  (none)\n';
  } else {
    for (const d of dests) {
      text += `  • ${d.server ?? d.name ?? '*'} / ${d.namespace ?? '*'}\n`;
    }
  }

  const roles = project.spec.roles ?? [];
  if (roles.length > 0) {
    text += `\nRoles (${roles.length}):\n`;
    for (const r of roles) {
      text += `  • ${r.name}${r.description ? ` — ${r.description}` : ''}\n`;
    }
  }

  return text;
}

// ── Repository Formatting ────────────────────────────────────────

export function formatRepoList(repos: ArgoRepository[]): string {
  if (repos.length === 0) {
    return 'No repositories found.';
  }

  let text = `Argo CD Repositories (${repos.length} total)\n\n`;
  text += 'Repository                                          Type       Status        Project\n';
  text += '─'.repeat(100) + '\n';

  for (const r of repos) {
    const repo = r.repo.padEnd(50);
    const type = (r.type ?? 'git').padEnd(10);
    const status = (r.connectionState?.status ?? 'Unknown').padEnd(13);
    const project = r.project ?? '';
    text += `${repo} ${type} ${status} ${project}\n`;
  }

  return text;
}

// ── Revision History Formatting ──────────────────────────────────

export function formatRevisionHistory(appName: string, history: ArgoRevisionHistory[]): string {
  if (history.length === 0) {
    return `No revision history found for "${appName}".`;
  }

  let text = `Revision History: ${appName} (${history.length} entries)\n\n`;
  text += 'ID     Revision        Deployed At                  Repo\n';
  text += '─'.repeat(90) + '\n';

  for (const h of history) {
    const id = String(h.id).padEnd(6);
    const rev = (h.revision?.slice(0, 12) ?? 'N/A').padEnd(15);
    const deployed = (h.deployedAt ?? 'N/A').padEnd(28);
    const source = h.source ?? h.sources?.[0];
    const repo = (source?.repoURL ?? '').replace(/^https?:\/\//, '').replace(/\.git$/, '');
    text += `${id} ${rev} ${deployed} ${repo}\n`;
  }

  return text;
}

// ── Resource Tree Formatting ─────────────────────────────────────

export function formatResourceTree(appName: string, tree: ArgoResourceTree): string {
  const nodes = tree.nodes ?? [];
  const orphaned = tree.orphanedNodes ?? [];

  if (nodes.length === 0 && orphaned.length === 0) {
    return `No resources found for "${appName}".`;
  }

  let text = `Resource Tree: ${appName}\n`;
  text += '━'.repeat(40) + '\n\n';

  // Build parent-child map
  const childMap = new Map<string, ArgoResourceNode[]>();
  const roots: ArgoResourceNode[] = [];

  for (const node of nodes) {
    if (!node.parentRefs || node.parentRefs.length === 0) {
      roots.push(node);
    } else {
      for (const parent of node.parentRefs) {
        const key = `${parent.kind}/${parent.name}`;
        if (!childMap.has(key)) childMap.set(key, []);
        childMap.get(key)!.push(node);
      }
    }
  }

  function renderNode(node: ArgoResourceNode, indent: string): string {
    const hEmoji = healthStatusEmoji(node.health?.status ?? 'Unknown');
    const kind = node.group ? `${node.group}/${node.kind}` : node.kind;
    let line = `${indent}${hEmoji} ${kind}/${node.name}`;
    if (node.health?.message) line += ` (${node.health.message})`;
    line += '\n';

    const key = `${node.kind}/${node.name}`;
    const children = childMap.get(key) ?? [];
    for (const child of children) {
      line += renderNode(child, indent + '  ');
    }
    return line;
  }

  for (const root of roots) {
    text += renderNode(root, '');
  }

  if (orphaned.length > 0) {
    text += `\nOrphaned Resources (${orphaned.length}):\n`;
    for (const o of orphaned) {
      const hEmoji = healthStatusEmoji(o.health?.status ?? 'Unknown');
      const kind = o.group ? `${o.group}/${o.kind}` : o.kind;
      text += `  ${hEmoji} ${kind}/${o.name}\n`;
    }
  }

  return text;
}

// ── Diff Formatting ──────────────────────────────────────────────

export function formatDiff(appName: string, managed: ArgoManagedResourceList): string {
  const items = managed.items ?? [];

  if (items.length === 0) {
    return `No managed resources found for "${appName}".`;
  }

  const drifted = items.filter((r) => {
    if (!r.liveState || !r.targetState) return false;
    try {
      return r.liveState !== r.targetState;
    } catch {
      return false;
    }
  });

  if (drifted.length === 0) {
    return `Application "${appName}" is in sync. No drift detected across ${items.length} resources.`;
  }

  let text = `Diff Report: ${appName}\n`;
  text += '━'.repeat(40) + '\n';
  text += `${drifted.length} of ${items.length} resources have drift\n\n`;

  for (const r of drifted) {
    const kind = r.group ? `${r.group}/${r.kind}` : r.kind;
    text += `── ${kind}/${r.name}${r.namespace ? ` (ns: ${r.namespace})` : ''} ──\n`;
    text += `Target (Git):\n${r.targetState ?? '(empty)'}\n\n`;
    text += `Live (Cluster):\n${r.liveState ?? '(empty)'}\n\n`;
  }

  return text;
}

// ── Event Formatting ─────────────────────────────────────────────

export function formatEvents(appName: string, events: ArgoEventList): string {
  const items = events.items ?? [];

  if (items.length === 0) {
    return `No events found for "${appName}".`;
  }

  let text = `Events: ${appName} (${items.length} total)\n\n`;
  text += 'Time                         Type      Reason               Message\n';
  text += '─'.repeat(110) + '\n';

  for (const e of items) {
    const time = (e.lastTimestamp ?? e.firstTimestamp ?? 'Unknown').padEnd(28);
    const type = (e.type ?? 'Normal').padEnd(9);
    const reason = (e.reason ?? 'Unknown').padEnd(20);
    const message = e.message ?? '';
    text += `${time} ${type} ${reason} ${message}\n`;
  }

  return text;
}

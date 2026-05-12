import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from '../src/server.js';
import type { ArgoCDConfig } from '../src/config.js';

// Mock fetch globally for server creation
const originalFetch = globalThis.fetch;

describe('createServer', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
      text: () => Promise.resolve('{}'),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should create server without throwing', () => {
    const config: ArgoCDConfig = {
      url: 'https://argocd.example.com',
      token: 'test-token',
      insecure: false,
      timeoutMs: 30000,
      maxLogLines: 500,
      allowedProjects: [],
    };

    const server = createServer(config);
    expect(server).toBeDefined();
  });

  it('should create server with allowed projects', () => {
    const config: ArgoCDConfig = {
      url: 'https://argocd.example.com',
      token: 'test-token',
      insecure: false,
      timeoutMs: 30000,
      maxLogLines: 500,
      allowedProjects: ['default', 'finance'],
    };

    const server = createServer(config);
    expect(server).toBeDefined();
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load valid config from environment', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    process.env.ARGOCD_MCP_TOKEN = 'test-token-123';

    const config = loadConfig();

    expect(config.url).toBe('https://argocd.example.com');
    expect(config.token).toBe('test-token-123');
    expect(config.insecure).toBe(false);
    expect(config.timeoutMs).toBe(30000);
    expect(config.maxLogLines).toBe(500);
    expect(config.allowedProjects).toEqual([]);
  });

  it('should throw when ARGOCD_MCP_URL is missing', () => {
    process.env.ARGOCD_MCP_TOKEN = 'test-token';
    delete process.env.ARGOCD_MCP_URL;

    expect(() => loadConfig()).toThrow('ARGOCD_MCP_URL environment variable is required');
  });

  it('should throw when ARGOCD_MCP_TOKEN is missing', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    delete process.env.ARGOCD_MCP_TOKEN;

    expect(() => loadConfig()).toThrow('ARGOCD_MCP_TOKEN environment variable is required');
  });

  it('should parse insecure flag', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';
    process.env.ARGOCD_MCP_INSECURE = 'true';

    const config = loadConfig();
    expect(config.insecure).toBe(true);
  });

  it('should parse custom timeout', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';
    process.env.ARGOCD_MCP_TIMEOUT_MS = '60000';

    const config = loadConfig();
    expect(config.timeoutMs).toBe(60000);
  });

  it('should parse custom max log lines', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';
    process.env.ARGOCD_MCP_MAX_LOG_LINES = '1000';

    const config = loadConfig();
    expect(config.maxLogLines).toBe(1000);
  });

  it('should parse allowed projects', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';
    process.env.ARGOCD_MCP_ALLOWED_PROJECTS = 'default, finance, backend';

    const config = loadConfig();
    expect(config.allowedProjects).toEqual(['default', 'finance', 'backend']);
  });

  it('should handle empty allowed projects', () => {
    process.env.ARGOCD_MCP_URL = 'https://argocd.example.com';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';
    process.env.ARGOCD_MCP_ALLOWED_PROJECTS = '';

    const config = loadConfig();
    expect(config.allowedProjects).toEqual([]);
  });

  it('should reject invalid URL', () => {
    process.env.ARGOCD_MCP_URL = 'not-a-url';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';

    expect(() => loadConfig()).toThrow();
  });

  it('should accept http URL', () => {
    process.env.ARGOCD_MCP_URL = 'http://localhost:8080';
    process.env.ARGOCD_MCP_TOKEN = 'test-token';

    const config = loadConfig();
    expect(config.url).toBe('http://localhost:8080');
  });
});

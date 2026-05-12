import { describe, it, expect, vi } from 'vitest';
import type { ArgoCDClient } from '../../src/client/argocd-client.js';
import { handleListEvents } from '../../src/tools/events.js';

function makeMockClient(overrides: Partial<ArgoCDClient> = {}): ArgoCDClient {
  return {
    getEvents: vi.fn().mockResolvedValue({
      items: [
        {
          reason: 'ResourceUpdated',
          message: 'Updated Deployment web',
          type: 'Normal',
          lastTimestamp: '2024-01-15T10:00:00Z',
        },
        {
          reason: 'OperationCompleted',
          message: 'Sync completed successfully',
          type: 'Normal',
          lastTimestamp: '2024-01-15T10:01:00Z',
        },
      ],
    }),
    ...overrides,
  } as unknown as ArgoCDClient;
}

describe('Event Tools', () => {
  describe('handleListEvents', () => {
    it('should list events', async () => {
      const client = makeMockClient();
      const result = await handleListEvents(client, { name: 'web-app' });

      expect(result.content[0].text).toContain('Events: web-app');
      expect(result.content[0].text).toContain('2 total');
      expect(result.content[0].text).toContain('ResourceUpdated');
      expect(result.content[0].text).toContain('Sync completed');
    });

    it('should handle empty events', async () => {
      const client = makeMockClient({
        getEvents: vi.fn().mockResolvedValue({ items: [] }),
      });

      const result = await handleListEvents(client, { name: 'web-app' });
      expect(result.content[0].text).toContain('No events found');
    });

    it('should handle events without items', async () => {
      const client = makeMockClient({
        getEvents: vi.fn().mockResolvedValue({}),
      });

      const result = await handleListEvents(client, { name: 'web-app' });
      expect(result.content[0].text).toContain('No events found');
    });
  });
});

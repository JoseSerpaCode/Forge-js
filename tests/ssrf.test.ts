import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForgeEvents } from '../src/lib/automations';
import db from '../src/lib/db';

vi.mock('../src/lib/db', () => ({
  default: {
    prepare: vi.fn()
  }
}));

describe('SSRF Protection in Automations', () => {
  let fetchSpy: any;
  let consoleSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should block webhooks targeting localhost', async () => {
    // Mock the database to return an automation rule that targets localhost
    (db.prepare as any).mockReturnValue({
      all: () => [{
        trigger_condition: JSON.stringify({ to_status: 'done' }),
        action_type: 'webhook',
        action_payload: JSON.stringify({ url: 'http://localhost:4321/api/user/settings' })
      }]
    });

    // Trigger the event
    await new Promise((resolve) => {
      ForgeEvents.emit('issue.status_changed', {
        issueId: 'test-1',
        workspaceId: 'ws-1',
        oldStatus: 'todo',
        newStatus: 'done'
      });
      // Allow event loop to process async handler
      setTimeout(resolve, 50);
    });

    // Verify fetch was NOT called
    expect(fetchSpy).not.toHaveBeenCalled();
    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SYS.WEBHOOK] Webhook must use HTTPS'),
      expect.stringContaining('http://localhost')
    );
  });
  
  it('should block webhooks targeting HTTPS localhost', async () => {
    (db.prepare as any).mockReturnValue({
      all: () => [{
        trigger_condition: JSON.stringify({ to_status: 'done' }),
        action_type: 'webhook',
        action_payload: JSON.stringify({ url: 'https://localhost/admin' })
      }]
    });

    await new Promise((resolve) => {
      ForgeEvents.emit('issue.status_changed', { issueId: 'test-1', workspaceId: 'ws-1', oldStatus: 'todo', newStatus: 'done' });
      setTimeout(resolve, 50);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SYS.WEBHOOK] Blocked SSRF attempt to private network'),
      expect.stringContaining('https://localhost')
    );
  });
});

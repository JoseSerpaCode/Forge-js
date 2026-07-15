import { describe, it, expect, beforeAll } from 'vitest';
import { GET } from '../src/pages/api/issues/[id]';
import db from '../src/lib/db';
import crypto from 'crypto';
import type { APIContext } from 'astro';

describe('GET /api/issues/[id]', () => {
  let issueId: string;
  let wsId: string;
  let userId: string;

  beforeAll(() => {
    wsId = crypto.randomUUID();
    userId = crypto.randomUUID();
    issueId = crypto.randomUUID();

    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(userId, `testuser_issue_get_${crypto.randomUUID().substring(0,8)}`, 'hash');
    db.prepare('INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)').run(wsId, 'Test WS Issue', `test_ws_issue_${crypto.randomUUID().substring(0,8)}`, userId);
    // Explicitly add as editor so checkWorkspaceAccess passes
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(wsId, userId, 'editor');
    db.prepare('INSERT INTO issues (id, workspace_id, type, title, reporter_id) VALUES (?, ?, ?, ?, ?)').run(issueId, wsId, 'task', 'Integration Test Issue', userId);
  });

  it('should return 200 and issue data for an authenticated user with access', async () => {
    const ctx = {
      params: { id: issueId },
      locals: {
        user: { id: userId, is_sysadmin: 0 }
      },
      request: new Request(`http://localhost/api/issues/${issueId}`)
    } as unknown as APIContext;

    const response = await GET(ctx);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.id).toBe(issueId);
    expect(data.title).toBe('Integration Test Issue');
  });
});

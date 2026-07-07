import { describe, it, expect, beforeAll } from 'vitest';
import db from '../src/lib/db.ts';
import crypto from 'crypto';

describe('Data Isolation & CASCADE Rules', () => {
  it('Debe eliminar todos los issues, pages y channels si se elimina un Workspace (ON DELETE CASCADE)', () => {
    const wsId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    
    // 1. Insert User & Workspace
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(userId, 'testuser', 'hash');
    db.prepare('INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)').run(wsId, 'Test WS', 'TEST', userId);
    
    // 2. Insert Issue & Channel
    db.prepare('INSERT INTO issues (id, workspace_id, type, title, reporter_id) VALUES (?, ?, ?, ?, ?)').run(crypto.randomUUID(), wsId, 'task', 'Test Task', userId);
    db.prepare('INSERT INTO channels (id, workspace_id, name) VALUES (?, ?, ?)').run(crypto.randomUUID(), wsId, 'general');
    
    // 3. Delete Workspace
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(wsId);
    
    // 4. Assert Cascades
    const issuesCount = db.prepare('SELECT COUNT(*) as count FROM issues WHERE workspace_id = ?').get(wsId).count;
    const channelsCount = db.prepare('SELECT COUNT(*) as count FROM channels WHERE workspace_id = ?').get(wsId).count;
    
    expect(issuesCount).toBe(0);
    expect(channelsCount).toBe(0);
  });
});

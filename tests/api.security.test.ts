import { describe, it, expect } from 'vitest';
import { checkWorkspaceAccess } from '../src/lib/guard';
import db from '../src/lib/db';
import crypto from 'crypto';

describe('RBAC Multi-Tenant Guard', () => {
  it('Debe bloquear a un usuario que NO pertenece al workspace', () => {
    // Mock user without membership
    const result = checkWorkspaceAccess('hacker-id', 0, 'secret-ws-id');
    expect(result.granted).toBe(false);
    expect(result.error).toContain('Acceso Denegado');
  });

  it('Debe conceder acceso total al SysAdmin sin ser miembro explícito', () => {
    // Sysadmin overrides membership requirement
    const result = checkWorkspaceAccess('admin-id', 1, 'any-ws-id');
    expect(result.granted).toBe(true);
    expect(result.role).toBe('owner');
  });

  it('Debe bloquear a un Viewer intentando hacer una acción de Editor', () => {
    const wsId = crypto.randomUUID();
    const viewerId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    
    // Necesitamos crear un workspace para el test
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(adminId, 'admin-tester', 'hash');
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(viewerId, 'viewer-tester', 'hash');
    db.prepare('INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)').run(wsId, 'Test WS Role', 'TEST_ROLE', adminId);
    
    // Poblamos DB con un viewer
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(wsId, viewerId, 'viewer');
    
    const result = checkWorkspaceAccess(viewerId, 0, wsId, 'editor');
    expect(result.granted).toBe(false);
    expect(result.error).toContain('Permisos insuficientes en este Workspace');
  });
});

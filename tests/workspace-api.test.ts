import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../src/pages/api/workspaces/[id]/index';
import db from '../src/lib/db';
import { checkWorkspaceAccess } from '../src/lib/guard';

vi.mock('../src/lib/db', () => ({
  default: {
    prepare: vi.fn()
  }
}));

vi.mock('../src/lib/guard', () => ({
  checkWorkspaceAccess: vi.fn()
}));

describe('Workspace API PATCH', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates workspace name, sys_tag, and icon successfully', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        name: 'New Name',
        sys_tag: 'new-tag',
        icon: 'data:image/webp;base64,123'
      })
    };
    const locals = { user: { id: 'u1', is_sysadmin: false } };
    const params = { id: 'ws1' };

    (checkWorkspaceAccess as any).mockReturnValue({ granted: true });

    const mockGet = vi.fn().mockReturnValue(null); 
    const mockOldWsGet = vi.fn().mockReturnValue({ sys_tag: 'old-tag' });
    const mockRun = vi.fn();
    
    (db.prepare as any).mockImplementation((query: string) => {
      if (query.includes('SELECT id FROM workspaces WHERE sys_tag = ?')) {
        return { get: mockGet };
      }
      if (query.includes('SELECT sys_tag FROM workspaces WHERE id = ?')) {
        return { get: mockOldWsGet };
      }
      if (query.includes('UPDATE workspaces SET name = ?')) {
        return { run: mockRun };
      }
      if (query.includes('UPDATE users SET last_workspace_id')) {
        return { run: vi.fn() };
      }
      return { run: vi.fn(), get: vi.fn(), all: vi.fn() };
    });

    const response = await PATCH({ request: mockRequest as any, params, locals } as any);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    
    expect(mockRun).toHaveBeenCalledWith('New Name', 'new-tag', 'data:image/webp;base64,123', 'ws1');
  });
  
  it('rejects invalid sys_tag format', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        name: 'New Name',
        sys_tag: 'invalid tag!', 
        icon: ''
      })
    };
    const locals = { user: { id: 'u1', is_sysadmin: false } };
    const params = { id: 'ws1' };

    (checkWorkspaceAccess as any).mockReturnValue({ granted: true });

    const response = await PATCH({ request: mockRequest as any, params, locals } as any);
    
    expect(response.status).toBe(400);
    const bodyText = await response.text();
    expect(bodyText).toContain('Invalid sys_tag format');
  });
});

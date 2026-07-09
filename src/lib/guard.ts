import db from './db';

export function checkWorkspaceAccess(userId: string, isSysadmin: number, workspaceId: string, requiredRole?: 'owner' | 'editor' | 'viewer') {
  if (isSysadmin === 1) return { granted: true, role: 'owner' };
  
  const membership = db.prepare('SELECT ws_role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userId) as any;
  
  if (!membership) return { granted: false, reason: 'not_member', error: 'Acceso Denegado. Workspace no encontrado o no eres miembro.' };
  
  if (requiredRole) {
    const hierarchy = { 'owner': 3, 'editor': 2, 'viewer': 1 };
    if (hierarchy[membership.ws_role as keyof typeof hierarchy] < hierarchy[requiredRole]) {
      return { granted: false, reason: 'insufficient_role', error: 'Permisos insuficientes en este Workspace.' };
    }
  }
  
  return { granted: true, role: membership.ws_role };
}

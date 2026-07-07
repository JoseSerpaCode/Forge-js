import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';
import { ForgeEvents } from '../../../../lib/automations';
import crypto from 'crypto';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const issueId = params.id;
  const user = locals.user;
  
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  const { status, workspaceId } = await request.json();
  
  // 1. Validar Aislamiento Multi-Tenant (Mínimo nivel 'editor' para mover tarjetas)
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'editor');
  if (!access.granted) return new Response(access.error, { status: 403 });
  
  // 2. Transacción Segura: Actualizar Estado + Generar Log de Auditoría
  const updateTransaction = db.transaction(() => {
    const oldIssue = db.prepare('SELECT status FROM issues WHERE id = ?').get(issueId) as any;
    if (!oldIssue) throw new Error('Issue not found');
    
    db.prepare('UPDATE issues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, issueId);
    
    db.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), user.id, 'ISSUE_STATUS_CHANGED', 'issue', issueId, JSON.stringify({ from: oldIssue.status, to: status })
    );
    
    return oldIssue.status;
  });
  
  try {
    const oldStatus = updateTransaction();
    ForgeEvents.emit('issue.status_changed', { issueId, workspaceId, oldStatus, newStatus: status });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 400 });
  }
};

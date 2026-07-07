// src/lib/automations.ts
import EventEmitter from 'events';
import db from './db';

export const ForgeEvents = new EventEmitter();

ForgeEvents.on('issue.status_changed', async ({ issueId, workspaceId, oldStatus, newStatus }) => {
  // 1. Buscar reglas activas en el workspace
  const rules = db.prepare('SELECT * FROM automations WHERE workspace_id = ? AND trigger_type = ? AND is_active = 1').all(workspaceId, 'issue_status_changed') as any[];
  
  for (const rule of rules) {
    const condition = JSON.parse(rule.trigger_condition);
    // 2. Evaluar Condición (ej. {"to_status": "done"})
    if (condition.to_status === newStatus) {
      // 3. Ejecutar Acción
      if (rule.action_type === 'webhook') {
        const payloadConfig = JSON.parse(rule.action_payload);
        fetch(payloadConfig.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'issue_completed', issueId })
        }).catch(err => console.error('[SYS.WEBHOOK] Fallo al emitir webhook', err));
      }
    }
  }
});

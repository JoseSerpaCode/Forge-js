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
        // [M-5 FIX] Validate webhook URL to prevent SSRF attacks
        let webhookUrl: URL;
        try {
          webhookUrl = new URL(payloadConfig.url);
        } catch {
          console.error('[SYS.WEBHOOK] Invalid URL in automation config:', payloadConfig.url);
          continue;
        }
        // Only allow HTTPS and block private/loopback IPs
        if (webhookUrl.protocol !== 'https:') {
          console.error('[SYS.WEBHOOK] Webhook must use HTTPS:', payloadConfig.url);
          continue;
        }
        const hostname = webhookUrl.hostname.toLowerCase();
        const blockedPatterns = ['localhost', '127.', '0.0.0.0', '169.254.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '[::1]', '::1'];
        if (blockedPatterns.some(p => hostname.startsWith(p) || hostname === p.replace('.', ''))) {
          console.error('[SYS.WEBHOOK] Blocked SSRF attempt to private network:', payloadConfig.url);
          continue;
        }
        fetch(webhookUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'issue_completed', issueId })
        }).catch(err => console.error('[SYS.WEBHOOK] Fallo al emitir webhook', err));
      }
    }
  }
});

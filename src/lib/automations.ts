// src/lib/automations.ts
import EventEmitter from 'events';
import dns from 'dns/promises';
import { Agent, fetch as undiciFetch } from 'undici';
import db from './db';

function isBlockedIP(ip: string): boolean {
  if (ip === '::1') return true;
  
  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:192.168.1.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  if (ip.includes(':')) {
    const ipLower = ip.toLowerCase();
    if (ipLower.startsWith('fc') || ipLower.startsWith('fd') || ipLower.startsWith('fe80')) return true;
    return false;
  }
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  const [a, b] = parts;
  if (a === 127) return true; // Loopback
  if (a === 10) return true; // Private 10.x
  if (a === 172 && b >= 16 && b <= 31) return true; // Private 172.16.x - 172.31.x
  if (a === 192 && b === 168) return true; // Private 192.168.x
  if (a === 169 && b === 254) return true; // Cloud Metadata
  if (a === 0) return true; // 0.0.0.0
  
  return false;
}

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
        let resolvedIp: string;
        try {
          const lookup = await dns.lookup(webhookUrl.hostname);
          resolvedIp = lookup.address;
        } catch (err) {
          console.error('[SYS.WEBHOOK] DNS lookup failed:', webhookUrl.hostname);
          continue;
        }

        // Chequeo contra rangos privados post-resolución
        if (isBlockedIP(resolvedIp)) {
          console.error(`[SYS.WEBHOOK] Blocked SSRF attempt to private network (Resolved IP: ${resolvedIp}):`, payloadConfig.url);
          continue;
        }

        const pinnedAgent = new Agent({
          connect: {
            lookup: (lookupHostname, options, callback) => {
              // Forced pinned IP to prevent TOCTOU DNS Rebinding
              callback(null, [{ address: resolvedIp, family: resolvedIp.includes(':') ? 6 : 4 }]);
            }
          }
        });

        undiciFetch(webhookUrl.toString(), {
          method: 'POST',
          dispatcher: pinnedAgent,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'issue_completed', issueId })
        }).catch(err => console.error('[SYS.WEBHOOK] Fallo al emitir webhook', err));
      }
    }
  }
});

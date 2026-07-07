import db from './db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function runSeed() {
  console.log('[SYS.LOG] Invocando protocolo de Bootstrapping...');
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, is_sysadmin) VALUES (?, ?, ?, ?)');

  // 1. Crear System Admin (Tú)
  const adminHash = bcrypt.hashSync('#NuevaSeguridad2026!', 12);
  insertUser.run(crypto.randomUUID(), 'jose', adminHash, 1);

  // 2. Crear usuarios del equipo base con contraseña genérica (cambiable)
  const teamHash = bcrypt.hashSync('SecureTeam!2026', 12);
  insertUser.run(crypto.randomUUID(), 'samuel', teamHash, 0);
  insertUser.run(crypto.randomUUID(), 'juan', teamHash, 0);
  insertUser.run(crypto.randomUUID(), 'michael', teamHash, 0);

  // 3. Crear LLM Bot User (Janus) para integraciones RAG
  const janusHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);
  insertUser.run('janus-llm-bot-id', 'janus_ai', janusHash, 0);


  // 4. Crear Workspace Principal para el Administrador (Main Workspace)
  const mainWsId = crypto.randomUUID();
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('jose') as any;
  if (adminUser) {
    db.prepare('INSERT OR IGNORE INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)').run(mainWsId, 'Main Workspace', 'main', adminUser.id);
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(mainWsId, adminUser.id, 'owner');
  }

  console.log('[SYS.LOG] Base de datos SQLite inicializada. Integrantes y Bot Janus activos.');
}

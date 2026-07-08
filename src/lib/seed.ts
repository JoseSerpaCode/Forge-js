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
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('jose') as any;
  if (adminUser) {
    let mainWs = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get('main') as any;
    let mainWsId = mainWs?.id;
    if (!mainWsId) {
      mainWsId = crypto.randomUUID();
      db.prepare('INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)').run(mainWsId, 'Main Workspace', 'main', adminUser.id);
      db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(mainWsId, adminUser.id, 'owner');
    }
    
    // Check if root page exists, if not create one
    const existingPage = db.prepare('SELECT id FROM pages WHERE workspace_id = ?').get(mainWsId);
    if (!existingPage) {
      db.prepare('INSERT INTO pages (id, workspace_id, title, created_by) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), mainWsId, 'Home', adminUser.id);
    }
  }

  console.log('[SYS.LOG] Base de datos SQLite inicializada. Integrantes y Bot Janus activos.');
}

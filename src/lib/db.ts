import Database from 'better-sqlite3';
import path from 'path';

// Asegurar que la base de datos se guarda en la raíz del proyecto
const dbPath = process.env.NODE_ENV === 'test' ? path.join(process.cwd(), 'forge_test.db') : 
path.join(process.cwd(), 'forge.db');
const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Optimizaciones Críticas Obligatorias
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON'); // Vital para los CASCADE DELETES
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -64000'); // 64MB de caché

// 2. Diccionario de Datos: Global System & Auth Layer
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 is_sysadmin BOOLEAN DEFAULT 0 CHECK(is_sysadmin IN (0, 1)),
 avatar_url TEXT DEFAULT '/default-avatar.svg',
 theme_preference TEXT DEFAULT 'dark',
 last_workspace_id TEXT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 sys_tag TEXT NOT NULL UNIQUE,
 icon TEXT,
 description TEXT,
 created_by TEXT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (created_by) REFERENCES users(id)
);
`);

// 3. Diccionario de Datos: Aislamiento Multi-Tenant (El Pivote)
db.exec(`
CREATE TABLE IF NOT EXISTS workspace_members (
 workspace_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 ws_role TEXT NOT NULL CHECK(ws_role IN ('owner', 'editor', 'viewer')),
 joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (workspace_id, user_id),
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);
`);

// 4. Diccionario de Datos: Módulos de Operación
db.exec(`
CREATE TABLE IF NOT EXISTS sprints (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 name TEXT NOT NULL,
 start_date DATETIME,
 end_date DATETIME,
 status TEXT CHECK(status IN ('planned', 'active', 'completed')) DEFAULT 'planned',
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS issues (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 sprint_id TEXT,
 parent_issue_id TEXT,
 type TEXT NOT NULL CHECK(type IN ('epic', 'story', 'task', 'bug')),
 title TEXT NOT NULL,
 description TEXT,
 status TEXT DEFAULT 'todo',
 priority TEXT CHECK(priority IN ('lowest', 'low', 'medium', 'high', 'highest')) DEFAULT 'medium',
 story_points INTEGER DEFAULT 0,
 estimated_hours REAL DEFAULT 0.0,
 logged_hours REAL DEFAULT 0.0,
 position REAL DEFAULT 0.0,
 reporter_id TEXT NOT NULL,
 assignee_id TEXT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
 FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
 FOREIGN KEY (parent_issue_id) REFERENCES issues(id) ON DELETE CASCADE,
 FOREIGN KEY (reporter_id) REFERENCES users(id),
 FOREIGN KEY (assignee_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_issues_workspace ON issues(workspace_id);

CREATE TABLE IF NOT EXISTS work_logs (
 id TEXT PRIMARY KEY,
 issue_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 hours_spent REAL NOT NULL,
 description TEXT,
 logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pages (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 parent_page_id TEXT,
 title TEXT NOT NULL DEFAULT 'Untitled',
 icon TEXT,
 cover_image TEXT,
 content_json TEXT, -- Payload de Editor.js o Excalidraw
 created_by TEXT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
 FOREIGN KEY (parent_page_id) REFERENCES pages(id) ON DELETE CASCADE,
 FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_chunks (
 id TEXT PRIMARY KEY,
 entity_id TEXT NOT NULL,
 workspace_id TEXT NOT NULL,
 chunk_text TEXT NOT NULL,
 embedding_vector BLOB, -- Serialized Float32Array para búsqueda vectorial LLM
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dynamic_databases (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 name TEXT NOT NULL,
 schema_json TEXT NOT NULL,
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dynamic_entries (
 id TEXT PRIMARY KEY,
 database_id TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 created_by TEXT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (database_id) REFERENCES dynamic_databases(id) ON DELETE CASCADE,
 FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS entry_relations (
 source_entry_id TEXT NOT NULL,
 target_entry_id TEXT NOT NULL,
 PRIMARY KEY (source_entry_id, target_entry_id),
 FOREIGN KEY (source_entry_id) REFERENCES dynamic_entries(id) ON DELETE CASCADE,
 FOREIGN KEY (target_entry_id) REFERENCES dynamic_entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public_forms (
 id TEXT PRIMARY KEY,
 dynamic_database_id TEXT NOT NULL,
 title TEXT NOT NULL,
 description TEXT,
 is_active BOOLEAN DEFAULT 1 CHECK(is_active IN (0, 1)),
 FOREIGN KEY (dynamic_database_id) REFERENCES dynamic_databases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS channels (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 name TEXT NOT NULL,
 type TEXT DEFAULT 'public' CHECK(type IN ('public', 'private')),
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,
 channel_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 content TEXT NOT NULL,
 is_edited BOOLEAN DEFAULT 0 CHECK(is_edited IN (0, 1)),
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// 5. Diccionario de Datos: Automatización y Trazabilidad Forense
db.exec(`
CREATE TABLE IF NOT EXISTS attachments (
 id TEXT PRIMARY KEY,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('issue', 'page', 'dynamic_entry', 'message')),
 entity_id TEXT NOT NULL,
 file_name TEXT NOT NULL,
 file_path TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 size_bytes INTEGER NOT NULL,
 uploaded_by TEXT NOT NULL,
 uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS automations (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 name TEXT NOT NULL,
 trigger_type TEXT NOT NULL,
 trigger_condition TEXT NOT NULL, -- JSON config
 action_type TEXT NOT NULL,
 action_payload TEXT NOT NULL, -- JSON config
 is_active BOOLEAN DEFAULT 1 CHECK(is_active IN (0, 1)),
 FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
 id TEXT PRIMARY KEY,
 user_id TEXT,
 action TEXT NOT NULL,
 entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 details_json TEXT,
 timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 type TEXT DEFAULT 'info',
 is_read BOOLEAN DEFAULT 0 CHECK(is_read IN (0, 1)),
 link_url TEXT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// 6. KB ↔ Kanban Integration: Bidirectional links + shared labels
db.exec(`
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00E5FF',
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_labels_workspace ON labels(workspace_id);

CREATE TABLE IF NOT EXISTS issue_labels (
  issue_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (issue_id, label_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS page_labels (
  page_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (page_id, label_id),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- Bidirectional Issue ↔ Page links (KB integration)
CREATE TABLE IF NOT EXISTS issue_page_links (
  issue_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  linked_by TEXT NOT NULL,
  linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issue_id, page_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_by) REFERENCES users(id)
);

-- Milestones for roadmap view
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_date DATETIME,
  status TEXT CHECK(status IN ('planned', 'achieved', 'missed')) DEFAULT 'planned',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_milestones_workspace ON milestones(workspace_id);
`);

// Add sprint goal column if not already present (safe migration)
try {
  db.exec(`ALTER TABLE sprints ADD COLUMN goal TEXT`);
} catch {}
// Add priority column to issues if not present
try {
  db.exec(`ALTER TABLE issues ADD COLUMN due_date DATETIME`);
} catch {}

export default db;

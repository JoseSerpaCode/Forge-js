import db from './src/lib/db';
try { db.exec('ALTER TABLE dynamic_databases ADD COLUMN description TEXT;'); } catch(e) {}
try { db.exec('ALTER TABLE dynamic_databases ADD COLUMN icon TEXT;'); } catch(e) {}
try { db.exec('ALTER TABLE dynamic_databases ADD COLUMN sys_tag TEXT;'); } catch(e) {}

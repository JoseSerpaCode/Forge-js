import db from './src/lib/db.js';
console.log(db.prepare(`SELECT w.name as title, 'workspace' as type, '/w/' || w.sys_tag as url FROM workspaces w WHERE w.name LIKE ? OR w.sys_tag LIKE ? LIMIT 5`).all('%%', '%%'));

// src/pages/api/upload.ts
import type { APIRoute } from 'astro';
import db from '../../lib/db';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const entityType = formData.get('entity_type') as string;
  const entityId = formData.get('entity_id') as string;

  if (!file || !entityType || !entityId) return new Response('Missing data', { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${crypto.randomUUID()}-${file.name}`;
  const uploadDir = path.join(process.cwd(), 'public', 'storage');

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  const fileUrl = `/storage/${fileName}`;

  db.prepare('INSERT INTO attachments (id, entity_type, entity_id, file_name, file_path, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    crypto.randomUUID(), entityType, entityId, file.name, fileUrl, file.type, file.size, user.id
  );

  return new Response(JSON.stringify({ url: fileUrl }), { status: 200 });
};

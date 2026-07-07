// src/pages/api/janus/search.ts
import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  // Autenticación estricta para el Bot
  if (request.headers.get('Authorization') !== `Bearer ${process.env.JANUS_SYSTEM_TOKEN}`) {
    return new Response('Unauthorized Bot', { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  
  // DEUDA TÉCNICA (SEGURIDAD): api/janus/search.ts confía ciegamente en el workspaceId
  // recibido. Hoy esto no es explotable porque no existe ningún orquestador que invoque este
  // endpoint (janus_mentioned no tiene listener). En el momento en que se implemente un consumidor,
  // ese componente (proxy/orquestador) DEBE resolver la membresía del usuario emisor contra 
  // el workspace ANTES de adjuntar JANUS_SYSTEM_TOKEN. Esto es un requisito de diseño.
  const workspaceId = url.searchParams.get('workspaceId');

  if (!query || !workspaceId) return new Response('Missing params', { status: 400 });

  // [RAG PIPELINE SIMPLIFICADO]
  // Idealmente aquí se usaría sqlite-vss para búsqueda de similitud coseno.
  // Como fallback para el agente: búsqueda de texto completo en los chunks y páginas.
  const chunks = db.prepare(`
    SELECT chunk_text, entity_id 
    FROM document_chunks 
    WHERE workspace_id = ? AND chunk_text LIKE ?
    LIMIT 5
  `).all(workspaceId, `%${query}%`);

  const pages = db.prepare(`
    SELECT title, content_json 
    FROM pages 
    WHERE workspace_id = ? AND content_json LIKE ?
    LIMIT 5
  `).all(workspaceId, `%${query}%`);

  return new Response(JSON.stringify({ chunks, pages }), { status: 200 });
};

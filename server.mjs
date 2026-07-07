// server.mjs
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler as astroHandler } from './dist/server/entry.mjs'; // Build output
import { setupSockets } from './src/lib/sockets.mjs';

const app = express();
const server = createServer(app);
const io = new Server(server);

// Servir estáticos de Astro (CSS, JS, assets)
import path from 'path';
app.use(express.static(path.join(process.cwd(), 'dist/client')));

// Inyectar Socket.io en la aplicación
setupSockets(io);

// Astro SSR Middleware
app.use(astroHandler);

const PORT = process.env.PORT || 4321;
server.listen(PORT, () => {
  console.log(`[SYS.NET] Forge OS corriendo en http://localhost:${PORT}`);
  console.log(`[SYS.NET] WebSockets (WSS) online.`);
});

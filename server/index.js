import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase } from './services/database.js';
import { createAppContext } from './services/appContext.js';
import { handleApiRequest } from './services/api.js';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const clientDir = join(rootDir, 'client');
const port = Number(process.env.PORT || 3000);

const database = initializeDatabase();
const context = createAppContext(database);
const accessUrl = `http://localhost:${port}`;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const rawPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(clientDir, safePath);

  if (!filePath.startsWith(clientDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    const contentType = contentTypes[extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(body);
  } catch {
    const body = await readFile(join(clientDir, 'index.html'));
    response.writeHead(200, { 'Content-Type': contentTypes['.html'] });
    response.end(body);
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith('/api/')) {
      await handleApiRequest(request, response, context);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

server.on('clientError', (error, socket) => {
  const isTlsHandshake = error.rawPacket?.[0] === 22;
  if (isTlsHandshake) {
    console.warn(`检测到 HTTPS/SSL 访问，但当前开发服务只支持 HTTP。请访问 ${accessUrl}`);
  }

  if (socket.writable) {
    socket.end(
      `HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nLifeQuest dev server only supports HTTP. Use ${accessUrl}\n`
    );
  }
});

server.listen(port, () => {
  console.log(`LifeQuest server running at ${accessUrl}`);
  console.log(`请使用 ${accessUrl} 访问，不要使用 https://localhost:${port}`);
});

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import orderHandler from './api/order.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const maxBodyBytes = 6 * 1024 * 1024;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

async function loadEnvironment() {
  let contents;
  try {
    contents = await readFile(resolve(root, '.env'), 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(?:"(.*)"|'(.*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error('Request body is too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

await loadEnvironment();

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname === '/api/order') {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const apiResponse = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          sendJson(response, this.statusCode, payload);
          return this;
        }
      };
      await orderHandler({ method: request.method, body }, apiResponse);
    } catch (error) {
      sendJson(response, error.statusCode || 400, {
        error: error.statusCode === 413 ? 'حجم الطلب أكبر من الحد المسموح' : 'تعذر قراءة بيانات الطلب'
      });
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405);
    response.end();
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }

  const isAsset = decodedPath.startsWith('/assets/');
  if (decodedPath !== '/index.html' && decodedPath !== '/index3333.html' && !isAsset) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const basePath = isAsset ? resolve(root, 'assets') : root;
  const relativePath = isAsset ? decodedPath.slice('/assets/'.length) : decodedPath.slice(1);
  const filePath = resolve(basePath, relativePath);
  if (!filePath.startsWith(`${basePath}${sep}`)) {
    response.writeHead(404);
    response.end();
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, '127.0.0.1', () => {
  console.log(`Dark Storm is running at http://127.0.0.1:${port}`);
});
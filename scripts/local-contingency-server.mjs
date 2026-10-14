import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const host = process.env.LOCAL_CONTINGENCY_HOST || '127.0.0.1';
const port = Number(process.env.LOCAL_CONTINGENCY_PORT || 54328);
const token = process.env.LOCAL_CONTINGENCY_TOKEN?.trim();
const filePath = resolve(process.env.LOCAL_CONTINGENCY_FILE || '.dev/contingency.json');

if (!token) {
  throw new Error('LOCAL_CONTINGENCY_TOKEN is required.');
}

let writeQueue = Promise.resolve();

async function readRecords() {
  try {
    const value = JSON.parse(await readFile(filePath, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function persistRecords(records) {
  writeQueue = writeQueue.then(async () => {
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, filePath);
  });
  return writeQueue;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1024 * 1024) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function withRowNumbers(records) {
  return records.map((record, index) => ({ ...record, rowNumber: index + 2 }));
}

const server = createServer(async (request, response) => {
  if (request.headers['x-dev-contingency-token'] !== token) {
    sendJson(response, 401, { success: false, error: 'UNAUTHORIZED' });
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);

  try {
    if (url.pathname === '/health' && request.method === 'GET') {
      sendJson(response, 200, { success: true, environment: 'dev' });
      return;
    }

    if (url.pathname === '/records' && request.method === 'GET') {
      sendJson(response, 200, { success: true, records: withRowNumbers(await readRecords()) });
      return;
    }

    if (url.pathname === '/records' && request.method === 'POST') {
      const record = await readBody(request);
      if (!record || typeof record !== 'object' || typeof record.request_id !== 'string') {
        sendJson(response, 400, { success: false, error: 'INVALID_RECORD' });
        return;
      }
      const records = await readRecords();
      if (!records.some((candidate) => candidate.request_id === record.request_id)) {
        records.push({ ...record, status: 'pending' });
        await persistRecords(records);
      }
      sendJson(response, 200, { success: true });
      return;
    }

    const rowMatch = url.pathname.match(/^\/records\/row\/(\d+)$/);
    if (rowMatch && request.method === 'DELETE') {
      const rowNumber = Number(rowMatch[1]);
      const records = await readRecords();
      const index = rowNumber - 2;
      if (!Number.isInteger(index) || index < 0 || index >= records.length) {
        sendJson(response, 404, { success: false, error: 'ROW_NOT_FOUND' });
        return;
      }
      records.splice(index, 1);
      await persistRecords(records);
      sendJson(response, 200, { success: true });
      return;
    }

    sendJson(response, 404, { success: false, error: 'NOT_FOUND' });
  } catch {
    sendJson(response, 500, { success: false, error: 'LOCAL_CONTINGENCY_ERROR' });
  }
});

server.listen(port, host, () => {
  console.log(`Local contingency listening on http://${host}:${port}`);
});

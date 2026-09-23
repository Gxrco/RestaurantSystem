const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const originalCorsOrigins = process.env.CORS_ORIGINS;
process.env.CORS_ORIGINS = ' http://localhost:3000, ,http://127.0.0.1:3000 ';

const app = require('../main.js');

let baseUrl;
let server;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });

  if (originalCorsOrigins === undefined) {
    delete process.env.CORS_ORIGINS;
  } else {
    process.env.CORS_ORIGINS = originalCorsOrigins;
  }
});

test('permite los orígenes configurados sin usar comodín', async () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
    const response = await fetch(baseUrl, { headers: { Origin: origin } });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.notEqual(response.headers.get('access-control-allow-origin'), '*');
  }
});

test('omite la cabecera CORS para un origen no autorizado', async () => {
  const response = await fetch(baseUrl, {
    headers: { Origin: 'https://evil.example' }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('mantiene el health check sin Origin y elimina X-Powered-By', async () => {
  const response = await fetch(baseUrl);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'RestaurantSystem API',
    port: 3002
  });
});

test('responde al preflight permitido solo con métodos y cabeceras necesarios', async () => {
  const response = await fetch(baseUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type');
  assert.equal(response.headers.get('access-control-allow-credentials'), null);
});

test('no agrega cabeceras CORS al preflight de un origen no autorizado', async () => {
  const response = await fetch(baseUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('access-control-allow-methods'), null);
  assert.equal(response.headers.get('access-control-allow-headers'), null);
});

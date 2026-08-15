const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/telegram');

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

async function request({ method = 'POST', headers = {}, body = {} } = {}) {
  const res = makeRes();
  await handler({ method, headers, body }, res);
  return res;
}

test.afterEach(() => {
  delete process.env.TELEGRAM_SERVER_KEY;
  delete process.env.TELEGRAM_INFARKT_TOKEN;
  delete process.env.TELEGRAM_INFARKT_CHAT;
  delete process.env.TELEGRAM_INSULT_TOKEN;
  delete process.env.TELEGRAM_INSULT_CHAT;
  delete global.fetch;
});

test('allowed CORS preflight succeeds and exposes auth headers', async () => {
  const res = await request({
    method: 'OPTIONS',
    headers: { origin: 'http://localhost:3000' }
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['Access-Control-Allow-Headers'], /Authorization/);
});

test('unknown origin is rejected', async () => {
  const res = await request({
    headers: { origin: 'https://evil.example' },
    body: { type: 'infarkt', text: 'test' }
  });
  assert.equal(res.statusCode, 403);
});

test('missing bearer token is rejected', async () => {
  const res = await request({ body: { type: 'infarkt', text: 'test' } });
  assert.equal(res.statusCode, 401);
});

test('ordinary authenticated user cannot send arbitrary Telegram text', async () => {
  let call = 0;
  global.fetch = async () => {
    call += 1;
    if (call === 1) return { ok: true, json: async () => ({ id: 'user-1' }) };
    return { ok: true, json: async () => ([{ role: 'user' }]) };
  };
  const res = await request({
    headers: { authorization: 'Bearer valid-test-token' },
    body: { type: 'infarkt', text: 'test' }
  });
  assert.equal(res.statusCode, 403);
});

test('server-authenticated oversized message is rejected before Telegram call', async () => {
  process.env.TELEGRAM_SERVER_KEY = 'test-server-key';
  const res = await request({
    headers: { 'x-server-key': 'test-server-key' },
    body: { type: 'infarkt', text: 'x'.repeat(4097) }
  });
  assert.equal(res.statusCode, 413);
});

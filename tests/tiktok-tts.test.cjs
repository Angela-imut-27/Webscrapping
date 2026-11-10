const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../Tts-tik-tok-generation.js'), 'utf8');

function worker(fetch = async () => assert.fail('Unexpected upstream request')) {
  let listener;
  vm.runInNewContext(source, {
    URL, Response,
    fetch,
    addEventListener(type, callback) {
      assert.equal(type, 'fetch');
      listener = callback;
    },
  }, { filename: 'Tts-tik-tok-generation.js' });

  return (path, method = 'GET') => {
    let response;
    listener({
      request: new Request(`https://worker.example${path}`, { method }),
      respondWith(result) { response = result; },
    });
    assert.ok(response instanceof Promise || typeof response?.then === 'function');
    return response;
  };
}

async function jsonError(response, status, message) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  const body = await response.json();
  assert.equal(body.status_code, status);
  assert.equal(body.message, message);
}

test('rejects invalid routes, methods and missing parameters without contacting upstream', async () => {
  const request = worker();
  for (const [path, method, status, message] of [
    ['/generate?voice=en_us_001&text=hello', 'POST', 400, 'Only GET requests are allowed'],
    ['/', 'GET', 400, "Parameters 'voice' and 'text' are required"],
    ['/generate?voice=en_us_001', 'GET', 400, "Parameters 'voice' and 'text' are required"],
    ['/generate?text=hello', 'GET', 400, "Parameters 'voice' and 'text' are required"],
    ['/generate?voice=en_us_001&text=', 'GET', 400, "Parameters 'voice' and 'text' are required"],
    ['/missing', 'GET', 404, 'Endpoint not found. Use /, /voices or /generate.'],
  ]) {
    await jsonError(await request(path, method), status, message);
  }
});

test('forwards encoded parameters and preserves binary MP3 bytes and download headers', async () => {
  const bytes = Uint8Array.from([0x49, 0x44, 0x33, 0, 0xff, 0x80, 0x01]);
  const text = 'Hello & goodbye? café / + # 🎵';
  for (const path of ['/generate', '/generate/']) {
    let calls = 0;
    const request = worker(async (url, options) => {
      calls++;
      assert.equal(url, `https://tiktok-tts-ivory.vercel.app/tts?voice=en_us_001&text=${encodeURIComponent(text)}`);
      assert.equal(options.method, 'GET');
      return new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } });
    });
    const response = await request(`${path}?${new URLSearchParams({ voice: 'en_us_001', text })}`);
    assert.equal(calls, 1);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
    assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="tts_en_us_001.mp3"');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  }
});

test('maps upstream generation errors and handles non-JSON error bodies', async () => {
  for (const [body, message] of [
    [JSON.stringify({ message: 'Voice no encontrada' }), 'Voice not found: unknown. Use /voices to see available voices.'],
    [JSON.stringify({ message: 'Rate limit exceeded' }), 'Rate limit exceeded'],
    ['{}', 'Could not generate audio'],
    ['<html>Service unavailable</html>', 'Could not generate audio'],
  ]) {
    const request = worker(async () => new Response(body, { status: 503 }));
    const response = await request('/generate?voice=unknown&text=hello');
    await jsonError(response, 400, message);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  }
});

test('does not serve successful non-audio upstream responses as MP3', async () => {
  for (const headers of [{}, { 'Content-Type': 'application/json' }, { 'Content-Type': 'text/html' }]) {
    const request = worker(async () => new Response('{}', { headers }));
    const response = await request('/generate?voice=en_us_001&text=hello');
    await jsonError(response, 400, 'Error processing the request');
    assert.equal(response.headers.get('Content-Disposition'), null);
  }
});

test('turns generation network and audio-read failures into JSON errors', async () => {
  for (const fetch of [
    async () => { throw new Error('connection reset'); },
    async () => ({
      ok: true,
      headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      arrayBuffer: async () => { throw new Error('truncated stream'); },
    }),
  ]) {
    await jsonError(await worker(fetch)('/generate?voice=en_us_001&text=hello'), 400, 'Error processing the request');
  }
});

test('normalizes upstream voice-list formats and supports the trailing-slash route', async () => {
  const voices = [{ id: 'en_us_001', name: 'English' }];
  for (const [upstream, expectedTotal, expectedVoices] of [
    [{ total: 20, voices }, 20, voices],
    [{ voices }, 1, voices],
    [{ total: 1, response: voices }, 1, voices],
    [{}, 0, []],
  ]) {
    for (const path of ['/voices', '/voices/']) {
      let calls = 0;
      const request = worker(async (url, options) => {
        calls++;
        assert.equal(url, 'https://tiktok-tts-ivory.vercel.app/voices');
        assert.equal(options.method, 'GET');
        return Response.json(upstream);
      });
      const response = await request(path);
      assert.equal(calls, 1);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
      const body = await response.json();
      assert.equal(body.status_code, 200);
      assert.equal(body.total, expectedTotal);
      assert.deepEqual(body.voices, expectedVoices);
    }
  }
});

test('contains upstream voice-list HTTP, network and malformed JSON failures', async () => {
  for (const [fetch, message] of [
    [async () => new Response('unavailable', { status: 503 }), 'Error fetching voices from internal API'],
    [async () => { throw new Error('offline'); }, 'Error processing voices request'],
    [async () => new Response('not JSON'), 'Error processing voices request'],
  ]) {
    const response = await worker(fetch)('/voices');
    await jsonError(response, 500, message);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  }
});

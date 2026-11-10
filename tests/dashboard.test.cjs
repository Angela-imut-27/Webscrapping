const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { join } = require('node:path');
const vm = require('node:vm');

const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const buttons = [...html.matchAll(/onclick="([^"]+)"/g)].map(match => match[1]);
assert.equal(buttons.length, 4);

function page(value, fetch) {
  const elements = new Map();
  for (const [, id] of html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)) {
    elements.set(id, { value });
  }
  for (const [, id] of html.matchAll(/<div\b[^>]*\bid="(res-[^"]+)"/g)) {
    elements.set(id, { innerText: 'initial' });
  }
  const alerts = [];
  const context = vm.createContext({
    document: { getElementById: id => elements.get(id) },
    alert: message => alerts.push(message),
    fetch,
  });
  vm.runInContext(script, context, { filename: 'index.html' });
  return { elements, alerts, click: button => vm.runInContext(button, context) };
}

test('all four wired buttons encode user input and display JSON only in their own result', async () => {
  const value = 'https://example.org/watch?a=1&b=c+d#café 🎵';
  const expectedEndpoints = [
    'https://yogalabs.vercel.app/api/ai/luminai?text=',
    'https://yogalabs.vercel.app/api/download/facebook?url=',
    'https://yogalabs.vercel.app/api/download/downr?url=',
    'https://yogalabs.vercel.app/api/ai/simsimi?text=',
  ];
  const ids = ['in-lumina', 'in-fb', 'in-downr', 'in-simi'];
  for (const [index, button] of buttons.entries()) {
    const data = { result: '<img src=x onerror=alert(1)>', nested: { ok: true } };
    let resolve;
    let calls = 0;
    const app = page(value, url => {
      calls++;
      assert.equal(url, expectedEndpoints[index] + encodeURIComponent(value));
      return new Promise(done => { resolve = done; });
    });
    const pending = app.click(button);
    assert.match(app.elements.get(`res-${ids[index]}`).innerText, /Sedang memproses/);
    resolve(Response.json(data));
    await pending;
    assert.equal(calls, 1);
    assert.equal(app.elements.get(`res-${ids[index]}`).innerText, JSON.stringify(data, null, 2));
    for (const id of ids.filter(id => id !== ids[index])) {
      assert.equal(app.elements.get(`res-${id}`).innerText, 'initial');
    }
    assert.deepEqual(app.alerts, []);
  }
});

test('empty input alerts without fetching or replacing an existing result', async () => {
  for (const button of buttons) {
    const app = page('', async () => assert.fail('Empty input must not fetch'));
    await app.click(button);
    assert.deepEqual(app.alerts, ['Input jangan kosong!']);
    for (const [id, element] of app.elements) {
      if (id.startsWith('res-')) assert.equal(element.innerText, 'initial');
    }
  }
});

test('network and malformed JSON failures replace the loading state with an error', async () => {
  for (const [fetch, message] of [
    [async () => { throw new Error('Network unavailable'); }, 'Network unavailable'],
    [async () => ({ json: async () => { throw new SyntaxError('Invalid JSON'); } }), 'Invalid JSON'],
  ]) {
    for (const [index, button] of buttons.entries()) {
      const app = page('hello', fetch);
      await app.click(button);
      const id = ['in-lumina', 'in-fb', 'in-downr', 'in-simi'][index];
      assert.equal(app.elements.get(`res-${id}`).innerText, `❌ Gagal memanggil API: ${message}`);
    }
  }
});

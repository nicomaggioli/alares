const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../assets/site.js'), 'utf8');

function setup({ response = { ok: true, success: true }, files = [], fetchImpl, valid = true } = {}) {
  let focused;
  const calls = [];
  const timers = new Map();
  function element(textContent = '') {
    return {
      textContent, hidden: false, disabled: false, attrs: {}, events: {},
      addEventListener(type, callback) { this.events[type] = callback; },
      setAttribute(key, value) { this.attrs[key] = value; },
      removeAttribute(key) { delete this.attrs[key]; },
      focus() { focused = this; },
    };
  }
  const button = element('Send project inquiry');
  const success = element();
  const error = element('We could not confirm your submission. Your details are still here.');
  const name = element();
  const another = element();
  success.hidden = error.hidden = true;
  const form = Object.assign(element(), {
    action: 'https://example.invalid/inquiry',
    resetCount: 0,
    reportValidity() { return valid; },
    reset() { this.resetCount++; },
    querySelector() { return button; },
  });
  const nodes = {
    'contact-form': form, 'contact-success': success, 'contact-error': error,
    'contact-name': name, 'contact-another': another, 'contact-attachment': { files },
  };
  const sandbox = {
    document: { querySelector: () => null, getElementById: (id) => nodes[id] },
    window: {
      setTimeout(callback) { const id = Symbol(); timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); },
    },
    AbortController,
    FormData: class extends Map {
      constructor() { super([['attachment', files[0] || 'empty file'], ['name', 'Test inquiry']]); }
    },
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      if (fetchImpl) return fetchImpl(url, options);
      return { ok: response.ok, json: async () => ({ success: response.success }) };
    },
  };
  vm.runInNewContext(source, sandbox);
  return { form, button, success, error, name, another, calls, timers,
    focused: () => focused,
    submit: () => form.events.submit({ preventDefault() {} }),
  };
}

test('confirmed submission has a persistent success state and an explicit new-inquiry action', async () => {
  const app = setup();
  await app.submit();
  assert.equal(app.form.hidden, true);
  assert.equal(app.success.hidden, false);
  assert.equal(app.form.resetCount, 1);
  assert.equal(app.focused(), app.success);
  assert.equal(app.timers.size, 0, 'no timer should erase the confirmation');
  app.another.events.click();
  assert.equal(app.form.hidden, false);
  assert.equal(app.success.hidden, true);
  assert.equal(app.focused(), app.name);
});

for (const response of [{ ok: true, success: false }, { ok: false, success: false }]) {
  test(`API rejection preserves inquiry details (HTTP ok: ${response.ok})`, async () => {
    const app = setup({ response });
    await app.submit();
    assert.equal(app.form.resetCount, 0);
    assert.equal(app.form.hidden, false);
    assert.equal(app.error.hidden, false);
    assert.equal(app.success.hidden, true);
    assert.equal(app.button.disabled, false);
    assert.equal(app.focused(), app.error);
  });
}

test('network failure and malformed responses preserve the inquiry', async () => {
  for (const fetchImpl of [async () => { throw new Error('offline'); }, async () => ({ ok: true, json: async () => { throw new SyntaxError('not JSON'); } })]) {
    const app = setup({ fetchImpl });
    await app.submit();
    assert.equal(app.form.resetCount, 0);
    assert.equal(app.error.hidden, false);
    assert.equal(app.button.disabled, false);
  }
});

test('text-only inquiries omit the empty attachment part', async () => {
  const app = setup();
  await app.submit();
  assert.equal(app.calls[0].body.has('attachment'), false);
  assert.equal(app.calls[0].body.get('name'), 'Test inquiry');
});

test('one supported attachment is preserved; oversized and multiple files never send', async () => {
  const file = { name: 'brief.pdf', size: 5 * 1024 * 1024 };
  const app = setup({ files: [file] });
  await app.submit();
  assert.equal(app.calls[0].body.get('attachment'), file);
  for (const files of [[{ size: file.size + 1 }], [{ size: 1 }, { size: 1 }]]) {
    const invalid = setup({ files });
    await invalid.submit();
    assert.equal(invalid.calls.length, 0);
    assert.equal(invalid.error.hidden, false);
    assert.equal(invalid.form.resetCount, 0);
  }
});

test('a pending inquiry cannot be submitted twice', async () => {
  let complete;
  const app = setup({ fetchImpl: () => new Promise((resolve) => { complete = resolve; }) });
  const pending = app.submit();
  assert.equal(app.button.disabled, true);
  await app.submit();
  assert.equal(app.calls.length, 1);
  complete({ ok: true, json: async () => ({ success: true }) });
  await pending;
  assert.equal(app.button.disabled, false);
});

test('a stalled request times out without clearing data or automatically retrying', async () => {
  const app = setup({ fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })));
  }) });
  const pending = app.submit();
  [...app.timers.values()][0]();
  await pending;
  assert.match(app.error.textContent, /could not confirm/);
  assert.equal(app.form.resetCount, 0);
  assert.equal(app.calls.length, 1);
  assert.equal(app.button.disabled, false);
});

test('invalid required fields prevent a request', async () => {
  const app = setup({ valid: false });
  await app.submit();
  assert.equal(app.calls.length, 0);
});

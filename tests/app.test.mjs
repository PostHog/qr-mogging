import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createCanvas, Image } from '@napi-rs/canvas';

test('native controls preserve preview and download safeguards', async (t) => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.equal(/ready-status|status-text|preview-titlebar/.test(html), false);
  const logo = readFileSync(new URL('../public/posthog-logomark.png', import.meta.url));
  const timers = new Map();
  const downloads = [];
  let timerId = 0;
  let tool;

  class Element extends EventTarget {
    attributes = new Map();
    classes = new Set();
    classList = {
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const get = (id) => {
    assert.ok(elements.has(id), `HTML contains ${id}`);
    return elements.get(id);
  };
  const original = { Image: globalThis.Image, document: globalThis.document, FileReader: globalThis.FileReader };
  t.after(() => Object.assign(globalThis, original));
  globalThis.Image = class extends Image {
    set src(value) { super.src = value === 'posthog-logomark.png' ? logo : value; }
  };
  globalThis.FileReader = class {
    async readAsDataURL(file) {
      this.result = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
      this.onload();
    }
  };
  globalThis.document = {
    getElementById: get,
    createElement(tag) {
      if (tag === 'canvas') return createCanvas(1080, 1080);
      assert.equal(tag, 'a');
      const link = new Element();
      link.addEventListener('click', () => downloads.push(link));
      return link;
    },
    modelContext: { registerTool(value) { tool = value; } },
  };
  t.mock.method(globalThis, 'setTimeout', (callback) => { timers.set(++timerId, callback); return timerId; });
  t.mock.method(globalThis, 'clearTimeout', (id) => timers.delete(id));
  get('destination-url').value = 'posthog.com';
  await import('../public/app.js');
  assert.equal(get('qr-preview').hidden, true);
  assert.equal(get('preview-placeholder').hidden, false);
  assert.equal(get('qr-stage').attributes.get('aria-busy'), 'true');

  async function render() {
    const pending = [...timers.values()];
    timers.clear();
    await Promise.all(pending.map((callback) => callback()));
  }
  function input(id, value) {
    get(id).value = value;
    get(id).dispatchEvent(new Event('input'));
  }
  async function upload(file) {
    get('image-file').files = [file];
    get('image-file').dispatchEvent(new Event('change'));
    assert.equal(get('qr-preview').hidden, true);
    assert.equal(get('preview-placeholder').hidden, false);
    assert.equal(get('preview-placeholder').textContent, 'Checking image…');
    for (let attempt = 0; get('preview-placeholder').textContent === 'Checking image…'; attempt++) {
      assert.ok(attempt < 100, 'image upload settles');
      await delay(10);
    }
  }

  await render();
  assert.equal(get('download-qr').disabled, false);
  assert.equal(get('qr-preview').hidden, false);
  assert.equal(get('preview-placeholder').hidden, true);
  assert.equal(get('qr-stage').attributes.get('aria-busy'), 'false');
  assert.equal(get('image-size-value').textContent, '22%');
  const originalPreview = get('qr-preview').src;

  for (const size of [30, 10, 22]) {
    input('image-size', size);
    assert.equal(get('download-qr').disabled, true);
    assert.equal(get('qr-preview').hidden, true);
    assert.equal(get('preview-placeholder').hidden, false);
    assert.equal(get('preview-placeholder').textContent, 'Making your QR code…');
    get('download-qr').click();
    assert.equal(downloads.length, 0);
    assert.equal(get('image-size-help').classes.has('caution'), size > 25);
    await render();
    assert.equal(get('download-qr').disabled, false);
    assert.equal(get('preview-placeholder').hidden, true);
    assert.equal(get('qr-preview').src === originalPreview, size === 22);
  }

  input('destination-url', 'javascript:alert(1)');
  assert.equal(get('download-qr').disabled, true);
  assert.equal(get('qr-preview').hidden, true);
  assert.equal(get('qr-stage').attributes.get('aria-busy'), 'false');
  assert.equal(get('preview-placeholder').textContent, 'Add a valid web URL to see your code.');
  assert.equal(get('url-help').attributes.get('role'), 'alert');
  input('destination-url', 'example.com');
  input('destination-url', 'posthog.com/events');
  await render();
  assert.equal(get('encoded-url-text').textContent, 'https://posthog.com/events');

  await upload(new File(['not an image'], 'invalid.png', { type: 'image/png' }));
  assert.match(get('upload-error').textContent, /previous image is still selected/);
  assert.equal(get('logo-name').textContent, 'PostHog');
  assert.equal(get('download-qr').disabled, false);
  assert.equal(get('qr-preview').hidden, false);
  assert.equal(get('preview-placeholder').hidden, true);

  await upload(new File([logo], 'custom.png', { type: 'image/png' }));
  assert.equal(get('reset-logo').hidden, false);
  assert.equal(get('download-qr').disabled, true);
  await render();
  assert.equal(get('logo-name').textContent, 'custom.png');
  get('reset-logo').click();
  await render();
  assert.equal(get('logo-name').textContent, 'PostHog');
  assert.equal(get('reset-logo').hidden, true);

  get('download-qr').click();
  assert.equal(downloads[0].href, get('qr-preview').src);
  assert.equal(downloads[0].download, 'qr-posthog.com.png');
  tool.execute({ url: 'example.com' });
  assert.equal(get('download-qr').disabled, true);
  await render();
  assert.equal(get('encoded-url-text').textContent, 'https://example.com/');
});

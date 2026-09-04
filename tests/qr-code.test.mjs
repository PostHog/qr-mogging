import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { createCanvas, Image, loadImage as decodeImage } from '@napi-rs/canvas';
import jsQR from 'jsqr';
import {
  loadImage,
  normalizeUrl,
  readyQr,
  renderQrCode,
} from '../lib/qr-code.ts';

const originalImage = globalThis.Image;
const originalDocument = globalThis.document;
afterEach(() => {
  globalThis.Image = originalImage;
  globalThis.document = originalDocument;
});

for (const [input, expected] of [
  [' posthog.com ', 'https://posthog.com/'],
  [
    'https://posthog.com/docs?hello=world#section',
    'https://posthog.com/docs?hello=world#section',
  ],
  ['//posthog.com', 'https://posthog.com/'],
  ['localhost:3000/path', 'https://localhost:3000/path'],
  ['http://localhost:3000', 'http://localhost:3000/'],
  [
    'https://例え.テスト/日本語',
    'https://xn--r8jz45g.xn--zckzah/%E6%97%A5%E6%9C%AC%E8%AA%9E',
  ],
]) {
  test(`normalizes ${input}`, () => {
    assert.deepEqual(normalizeUrl(input), { url: expected, error: '' });
  });
}

for (const input of [
  '',
  'https://',
  'mailto:paul@example.com',
  'javascript:alert(1)',
  'data:text/plain,hello',
  'ftp://example.com',
  'https://user:secret@example.com',
]) {
  test(`rejects unsupported or invalid URL ${input}`, () => {
    assert.equal(normalizeUrl(input).url, '');
    assert.ok(normalizeUrl(input).error);
  });
}

test('only a completed result for the current URL and logo can be downloaded', () => {
  const result = {
    url: 'https://posthog.com/',
    logoSource: 'old-logo',
    dataUrl: 'data:image/png;base64,complete',
  };
  assert.equal(readyQr(null, result.url, result.logoSource), null);
  assert.equal(
    readyQr(result, 'https://example.com/', result.logoSource),
    null,
  );
  assert.equal(readyQr(result, result.url, 'new-logo'), null);
  assert.equal(readyQr(result, result.url, result.logoSource), result);
});

test('an unreadable image produces an image error, not a URL capacity error', async () => {
  globalThis.Image = Image;
  await assert.rejects(
    loadImage('data:image/png;base64,bm90IGFuIGltYWdl'),
    (error) => {
      assert.equal(error.kind, 'image');
      assert.match(error.message, /image/i);
      return true;
    },
  );
});

const mark = `data:image/png;base64,${readFileSync(new URL('../public/posthog-logomark.png', import.meta.url)).toString('base64')}`;
const square = createCanvas(100, 100);
square.getContext('2d').fillRect(0, 0, 100, 100);
const portrait = createCanvas(60, 150);
portrait.getContext('2d').fillRect(0, 0, 60, 150);

const cases = [
  ['default', 'https://posthog.com/', mark],
  [
    'tracking URL',
    `https://posthog.com/docs?utm_source=event&utm_campaign=${'campaign-'.repeat(40)}`,
    mark,
  ],
  ['square logo', 'https://posthog.com/events', square.toDataURL('image/png')],
  [
    'portrait logo',
    'https://posthog.com/events',
    portrait.toDataURL('image/png'),
  ],
];

function browserCanvas() {
  globalThis.Image = Image;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: { createElement: () => createCanvas(1080, 1080) },
  });
}

async function decodedUrl(dataUrl, size = 1080) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.drawImage(await decodeImage(dataUrl), 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size);
  return jsQR(pixels.data, size, size)?.data;
}

for (const [label, url, logo] of cases) {
  test(`exported PNG decodes correctly: ${label}`, async () => {
    browserCanvas();
    const result = await renderQrCode(url, logo);
    assert.match(result.dataUrl, /^data:image\/png;base64,/);
    assert.equal(await decodedUrl(result.dataUrl), url);
    if (label !== 'tracking URL')
      assert.equal(await decodedUrl(result.dataUrl, 280), url);
  });
}

test('overlapping renders stay isolated when the older logo finishes last', async () => {
  browserCanvas();
  const images = [];
  globalThis.Image = class extends Image {
    set src(value) {
      images.push({ image: this, value });
    }
    start() {
      super.src = images.find((entry) => entry.image === this).value;
    }
  };
  const older = renderQrCode('https://posthog.com/older', mark);
  const newer = renderQrCode(
    'https://posthog.com/newer',
    square.toDataURL('image/png'),
  );
  images[1].image.start();
  const newResult = await newer;
  images[0].image.start();
  const oldResult = await older;
  assert.equal(
    await decodedUrl(newResult.dataUrl),
    'https://posthog.com/newer',
  );
  assert.equal(
    await decodedUrl(oldResult.dataUrl),
    'https://posthog.com/older',
  );
  assert.equal(readyQr(oldResult, newResult.url, newResult.logoSource), null);
});

test('oversized URLs have a specific capacity error', async () => {
  browserCanvas();
  await assert.rejects(
    renderQrCode(`https://posthog.com/${'a'.repeat(5000)}`, mark),
    (error) => error.kind === 'capacity',
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import glyphs from '../src/glyphs.json' with { type: 'json' };
import { createSealArtwork, sealFallbackSvg } from '../src/scene-artwork.js';
import { SEAL_LAYOUT, SEAL_BOUNDS, STROKE_GUIDES } from '../src/scene-geometry.js';

function canvasDocument(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document'), contexts = [];
  class Path { constructor(source) { this.source = source; } }
  const document = { defaultView: { Path2D: Path }, createElement(tag) {
    assert.equal(tag, 'canvas');
    const calls = [], canvas = { ownerDocument: document }, context = { canvas, calls };
    for (const method of ['save', 'restore', 'translate', 'scale', 'fill', 'fillRect', 'clearRect', 'clip', 'beginPath', 'moveTo', 'lineTo', 'stroke']) {
      context[method] = (...args) => calls.push([method, ...args]);
    }
    canvas.getContext = type => type === '2d' ? context : null;
    contexts.push(context); return canvas;
  } };
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  return contexts;
}

test('seal light trace clips to the intact glyph without repainting the face or complete slogan lines', t => {
  const contexts = canvasDocument(t), artwork = createSealArtwork();
  t.after(() => artwork.dispose());
  const [face, trace, firstLine, secondLine] = contexts;
  assert.equal(face.calls.filter(([method]) => method === 'fill').length, 1);
  assert.equal(firstLine.calls.filter(([method]) => method === 'fill').length, 3);
  assert.equal(secondLine.calls.filter(([method]) => method === 'fill').length, 3);
  assert.deepEqual(firstLine.calls.filter(([method]) => method === 'fill').map(([, path]) => path.source), [...'先核实'].map(c => glyphs[c]));
  assert.deepEqual(secondLine.calls.filter(([method]) => method === 'fill').map(([, path]) => path.source), [...'再放心'].map(c => glyphs[c]));
  const before = [face, firstLine, secondLine].map(context => context.calls.length);
  const versions = [artwork.frontTexture, ...artwork.sloganTextures].map(texture => texture.version);
  assert.equal(artwork.updateTrace(.07), true);
  assert.equal(artwork.updateTrace(.07), false, 'same progress does not upload again');
  for (let stroke = 0; stroke < STROKE_GUIDES.length; stroke++) artwork.updateTrace((stroke + .5) / STROKE_GUIDES.length);
  const clipped = trace.calls.filter(([method]) => method === 'clip');
  assert.equal(clipped.length, 7);
  assert.ok(clipped.every(([, path]) => path.source === glyphs['安']));
  assert.equal(trace.calls.filter(([method]) => method === 'stroke').length, 14);
  assert.deepEqual([face, firstLine, secondLine].map(context => context.calls.length), before);
  assert.deepEqual([artwork.frontTexture, ...artwork.sloganTextures].map(texture => texture.version), versions);
  assert.ok(artwork.traceTexture.version > artwork.frontTexture.version);
  assert.equal(artwork.clearTrace(), true);
  assert.equal(artwork.clearTrace(), false);
  assert.equal(trace.calls.at(-1)[0], 'clearRect');
});

test('trace endpoints clear the highlight and texture disposal is idempotent', t => {
  const contexts = canvasDocument(t), artwork = createSealArtwork({ mobile: true });
  let disposed = 0;
  for (const texture of [artwork.frontTexture, ...artwork.sloganTextures, artwork.traceTexture]) texture.addEventListener('dispose', () => disposed++);
  for (const endpoint of [0, 1, -1, 2, null, Number.NaN]) {
    artwork.updateTrace(.25); assert.equal(artwork.updateTrace(endpoint), true);
    assert.equal(artwork.updateTrace(endpoint), false);
  }
  assert.equal(artwork.frontTexture.image.width, Math.ceil(SEAL_LAYOUT.coreWidth * 256));
  assert.equal(artwork.frontTexture.image.height, Math.ceil(SEAL_LAYOUT.coreHeight * 256));
  assert.equal(artwork.traceTexture.image.width, artwork.frontTexture.image.width);
  const before = contexts[1].calls.length;
  artwork.dispose(); artwork.dispose();
  assert.equal(disposed, 4);
  assert.equal(artwork.updateTrace(.4), false); assert.equal(artwork.clearTrace(), false);
  assert.equal(contexts[1].calls.length, before);
});

test('fallback preserves one intact seal and reveals complete lines in the same fixed frame', () => {
  for (const [form, rowCount] of [['shield', 0], ['slogan', 2]]) {
    const dom = new JSDOM(sealFallbackSvg(form), { contentType: 'image/svg+xml' });
    const document = dom.window.document, svg = document.documentElement;
    assert.equal(svg.getAttribute('viewBox'), `${-SEAL_BOUNDS.width / 2} ${-SEAL_BOUNDS.height / 2} ${SEAL_BOUNDS.width} ${SEAL_BOUNDS.height}`);
    assert.equal(document.querySelectorAll('[data-seal-core]').length, 1);
    assert.equal(document.querySelectorAll('[data-seal-core] rect').length, 1);
    assert.equal(document.querySelector('[data-seal-core] path').getAttribute('d'), glyphs['安']);
    assert.equal(document.querySelectorAll('[data-plate],clipPath').length, 0, 'there are no cropped word fragments');
    assert.equal(document.querySelectorAll('[data-slogan-line]').length, rowCount);
    for (const row of document.querySelectorAll('[data-slogan-line]')) assert.equal(row.querySelectorAll('path').length, 3);
    assert.equal(document.querySelectorAll('[data-seal-frame]').length, 1);
    dom.window.close();
  }
});

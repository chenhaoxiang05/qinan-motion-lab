import * as THREE from 'three';
import glyphs from './glyphs.json' with { type: 'json' };
import { glyphShapes, SEAL_LAYOUT, SEAL_BOUNDS, STROKE_GUIDES } from './scene-geometry.js';

const BONE = '#e9eadd';
const INK = '#11150f';
const LIME = '#c2ff00';
const SLOGAN_ROWS = ['先核实', '再放心'];
const bounds = new Map();

function glyphBounds(character) {
  if (!bounds.has(character)) {
    const points = glyphShapes(character).flatMap(shape => shape.getPoints(12));
    const xs = points.map(point => point.x), ys = points.map(point => point.y);
    bounds.set(character, { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
  }
  return bounds.get(character);
}
function glyphTransform(character, centerX, centerY, width, height) {
  const b = glyphBounds(character);
  const scale = Math.min(width / (b.maxX - b.minX), height / (b.maxY - b.minY));
  return { scale, x: centerX - (b.minX + b.maxX) * scale / 2, y: centerY + (b.minY + b.maxY) * scale / 2 };
}
function glyphSvg(character, centerX, centerY, width, height, fill) {
  const { scale, x, y } = glyphTransform(character, centerX, centerY, width, height);
  return `<path d="${glyphs[character]}" transform="translate(${x} ${y}) scale(${scale} ${-scale})" fill="${fill}"/>`;
}
function pathConstructor(context) {
  const Path = context.canvas.ownerDocument?.defaultView?.Path2D || globalThis.Path2D;
  if (typeof Path !== 'function') throw new Error('Local seal artwork requires Path2D.');
  return Path;
}
function drawGlyph(context, character, centerX, centerY, width, height, fill) {
  const { scale, x, y } = glyphTransform(character, centerX, centerY, width, height);
  const Path = pathConstructor(context);
  context.save(); context.translate(x, y); context.scale(scale, -scale);
  context.fillStyle = fill; context.fill(new Path(glyphs[character])); context.restore();
}

/** Hand-authored centre guides are sampled by distance, not glyph contour order. */
function sampleGuide(path) {
  const tokens = path.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);
  let index = 0, command = '', x = 0, y = 0;
  const points = [];
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index])) command = tokens[index++];
    if (command === 'M' || command === 'L') {
      x = number(); y = number(); points.push({ x, y }); command = 'L';
    } else if (command === 'C') {
      const x0 = x, y0 = y, x1 = number(), y1 = number(), x2 = number(), y2 = number();
      x = number(); y = number();
      for (let step = 1; step <= 48; step++) {
        const t = step / 48, u = 1 - t;
        points.push({ x: u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x,
          y: u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y });
      }
    } else throw new Error(`Unsupported seal guide command: ${command}`);
  }
  let length = 0;
  points.forEach((point, i) => {
    if (i) length += Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y);
    point.distance = length;
  });
  return { points, length };
}
const guides = STROKE_GUIDES.map(sampleGuide);

function guidePoint(guide, distance) {
  const d = Math.max(0, Math.min(guide.length, distance));
  for (let i = 1; i < guide.points.length; i++) {
    const end = guide.points[i], start = guide.points[i - 1];
    if (d <= end.distance) {
      const t = (d - start.distance) / (end.distance - start.distance || 1);
      return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
    }
  }
  return guide.points.at(-1);
}
function strokeHead(context, guide, end, length) {
  const startDistance = Math.max(0, end - length), start = guidePoint(guide, startDistance), finish = guidePoint(guide, end);
  context.beginPath(); context.moveTo(start.x, start.y);
  for (const point of guide.points) if (point.distance > startDistance && point.distance < end) context.lineTo(point.x, point.y);
  context.lineTo(finish.x, finish.y); context.stroke();
}
function createCanvas(width, height) {
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Local seal artwork requires a 2D canvas.');
  return { canvas, context };
}
function textureFor(canvas) {
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 2;
  return texture;
}

/** One immutable printed face, two complete lines and a separately animated light trace. */
export function createSealArtwork({ mobile = false } = {}) {
  const unit = mobile ? 256 : 384;
  const width = SEAL_LAYOUT.coreWidth * unit, height = SEAL_LAYOUT.coreHeight * unit;
  const { canvas: front, context: f } = createCanvas(width, height);
  const { canvas: trace, context: t } = createCanvas(front.width, front.height);
  f.fillStyle = BONE; f.fillRect(0, 0, front.width, front.height);
  const glyphWidth = unit * 1.54, glyphHeight = unit * 1.74;
  drawGlyph(f, '安', front.width / 2, front.height / 2, glyphWidth, glyphHeight, INK);
  f.fillStyle = '#a4ae92';
  for (let i = 0; i < 7; i++) f.fillRect(unit * .17 + i * unit * .036, unit * .16, unit * (i % 3 === 0 ? .014 : .006), unit * .10);
  f.fillRect(unit * 1.64, unit * 2.72, unit * .19, unit * .025);
  f.fillRect(unit * 1.805, unit * 2.57, unit * .025, unit * .175);
  const sloganCanvases = SLOGAN_ROWS.map(row => {
    const { canvas, context } = createCanvas(SEAL_LAYOUT.sloganWidth * unit, SEAL_LAYOUT.glyphHeight * unit);
    const advance = canvas.width / 3;
    [...row].forEach((character, i) => drawGlyph(context, character, (i + .5) * advance, canvas.height / 2,
      Math.min(advance * .88, canvas.height * .98), canvas.height * .98, BONE));
    return canvas;
  });
  const Path = pathConstructor(t), clip = new Path(glyphs['安']);
  const transform = glyphTransform('安', trace.width / 2, trace.height / 2, glyphWidth, glyphHeight);
  const frontTexture = textureFor(front), traceTexture = textureFor(trace);
  const sloganTextures = sloganCanvases.map(textureFor);
  let lastProgress = null, disposed = false;

  function clearTrace() {
    if (disposed || lastProgress === null) return false;
    t.clearRect(0, 0, trace.width, trace.height); lastProgress = null; traceTexture.needsUpdate = true; return true;
  }
  function updateTrace(progress) {
    if (disposed) return false;
    if (!Number.isFinite(progress) || progress <= 0 || progress >= 1) return clearTrace();
    if (progress === lastProgress) return false;
    t.clearRect(0, 0, trace.width, trace.height);
    const position = progress * guides.length, index = Math.min(guides.length - 1, Math.floor(position));
    const guide = guides[index], local = position - index, end = guide.length * local;
    t.save(); t.translate(transform.x, transform.y); t.scale(transform.scale, -transform.scale); t.clip(clip);
    t.lineCap = 'round'; t.lineJoin = 'round';
    // The original ink never changes; the light only travels inside its silhouette.
    t.strokeStyle = 'rgba(194,255,0,.16)'; t.lineWidth = 48; strokeHead(t, guide, end, 145);
    t.strokeStyle = 'rgba(211,255,94,.60)'; t.lineWidth = 20; strokeHead(t, guide, end, 68);
    t.restore(); lastProgress = progress; traceTexture.needsUpdate = true; return true;
  }
  return {
    frontTexture, sloganTextures, traceTexture, updateTrace, clearTrace,
    dispose() { if (disposed) return; disposed = true; [frontTexture, ...sloganTextures, traceTexture].forEach(texture => texture.dispose()); }
  };
}

/** Same intact seal and complete lines when WebGL is unavailable. SVG y is downward. */
export function sealFallbackSvg(form = 'shield') {
  const open = form === 'slogan', coreScale = open ? SEAL_LAYOUT.openCoreScale : 1;
  const coreY = open ? -SEAL_LAYOUT.openCoreY : 0;
  const w = SEAL_LAYOUT.coreWidth, h = SEAL_LAYOUT.coreHeight;
  const cornerX = open ? 1.62 : 1.14, cornerTop = open ? 2.10 : 1.64, cornerBottom = open ? 1.85 : 1.64;
  const core = `<g data-seal-core="intact" transform="translate(0 ${coreY}) scale(${coreScale})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx=".025" fill="${BONE}" stroke="#7f8971" stroke-width=".012"/>${glyphSvg('安', 0, 0, 1.54, 1.74, INK)}<path d="M-.84 -1.31h.21m.035 0h.08M.65 1.2h.17v-.17" fill="none" stroke="#a4ae92" stroke-width=".018"/></g>`;
  const corners = `<path data-seal-frame="four-corners" d="M${-cornerX} ${-cornerTop + .30}V${-cornerTop}H${-cornerX + .30} M${cornerX - .30} ${-cornerTop}H${cornerX}V${-cornerTop + .30} M${-cornerX} ${cornerBottom - .30}V${cornerBottom}H${-cornerX + .30} M${cornerX - .30} ${cornerBottom}H${cornerX}V${cornerBottom - .30}" fill="none" stroke="${LIME}" stroke-width=".024"/>`;
  const rows = open ? SLOGAN_ROWS.map((row, index) => {
    const advance = SEAL_LAYOUT.sloganWidth / 3, glyphSize = Math.min(advance * .88, SEAL_LAYOUT.glyphHeight * .98);
    return `<g data-slogan-line="${index}">${[...row].map((character, i) => glyphSvg(character, (i - 1) * advance, -SEAL_LAYOUT.rowYs[index], glyphSize, SEAL_LAYOUT.glyphHeight * .98, BONE)).join('')}</g>`;
  }).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-SEAL_BOUNDS.width / 2} ${-SEAL_BOUNDS.height / 2} ${SEAL_BOUNDS.width} ${SEAL_BOUNDS.height}" style="width:100%;height:auto;display:block;stroke:none" aria-hidden="true">${core}${corners}${rows}</svg>`;
}

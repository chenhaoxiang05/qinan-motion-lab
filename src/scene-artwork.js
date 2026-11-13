import * as THREE from 'three';
import glyphs from './glyphs.json' with { type: 'json' };
import { glyphShapes, PANEL_ORDER, SLOGAN_CHARS } from './scene-geometry.js';

const BONE = '#e9eadd';
const GRAPHITE = '#151a12';
const INK = '#11150f';
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
function drawGlyph(context, character, centerX, centerY, width, height, fill) {
  const { scale, x, y } = glyphTransform(character, centerX, centerY, width, height);
  const Path = context.canvas.ownerDocument.defaultView.Path2D || globalThis.Path2D;
  context.save(); context.translate(x, y); context.scale(scale, -scale);
  context.fillStyle = fill; context.fill(new Path(glyphs[character])); context.restore();
}

/** Shared local atlases: one continuous front印 and six independent, upright reverse letters. */
export function createSealArtwork({ mobile = false } = {}) {
  const unit = mobile ? 256 : 384;
  const front = document.createElement('canvas'), back = document.createElement('canvas');
  front.width = unit * 2; front.height = unit * 3;
  back.width = unit * 3; back.height = unit * 2;
  const f = front.getContext('2d'), b = back.getContext('2d');
  if (!f || !b) throw new Error('Local seal artwork requires a 2D canvas.');
  f.fillStyle = BONE; f.fillRect(0, 0, front.width, front.height);
  drawGlyph(f, '安', unit, unit * 1.5, unit * 1.54, unit * 1.74, INK);
  // Small printed registration marks provide scale without introducing fake status data.
  f.fillStyle = '#a4ae92';
  for (let i = 0; i < 7; i++) f.fillRect(unit * .17 + i * unit * .036, unit * .16, unit * (i % 3 === 0 ? .014 : .006), unit * .10);
  f.fillRect(unit * 1.64, unit * 2.72, unit * .19, unit * .025);
  f.fillRect(unit * 1.805, unit * 2.57, unit * .025, unit * .175);
  b.fillStyle = GRAPHITE; b.fillRect(0, 0, back.width, back.height);
  SLOGAN_CHARS.forEach((character, id) => {
    const column = id % 3, row = Math.floor(id / 3);
    drawGlyph(b, character, (column + .5) * unit, (row + .51) * unit, unit * .70, unit * .70, BONE);
    b.fillStyle = '#c2ff00'; b.fillRect((column + .14) * unit, (row + .12) * unit, unit * .12, unit * .015);
  });
  const frontTexture = new THREE.CanvasTexture(front), backTexture = new THREE.CanvasTexture(back);
  for (const texture of [frontTexture, backTexture]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
  }
  return { frontTexture, backTexture };
}

/** Both fallback states use the same six rigid plates and bundled outline data. */
export function sealFallbackSvg(form = 'shield') {
  const open = form === 'slogan';
  const cols = open ? 3 : 2, rows = open ? 2 : 3, unit = 100, gap = open ? 12 : 2;
  const width = cols * unit + (cols - 1) * gap, height = rows * unit + (rows - 1) * gap;
  const plates = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < cols; column++) {
    const id = open ? row * 3 + column : PANEL_ORDER[row][column];
    const x = column * (unit + gap), y = row * (unit + gap);
    plates.push(`<rect data-plate="${id}" x="${x}" y="${y}" width="${unit}" height="${unit}" rx="1" fill="${open ? GRAPHITE : BONE}" stroke="#7f8971" stroke-width=".5"/>`);
    if (open) plates.push(glyphSvg(SLOGAN_CHARS[id], x + 50, y + 51, 70, 70, BONE));
  }
  if (!open) {
    plates.push(`<defs><clipPath id="seal-local-faces">${plates.join('').replace(/ data-plate="\d"/g, '')}</clipPath></defs>`);
    plates.push(`<g clip-path="url(#seal-local-faces)">${glyphSvg('安', width / 2, height / 2, 155, 174, INK)}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 ${width + 16} ${height + 16}" style="width:100%;height:auto;display:block;stroke:none" aria-hidden="true">${plates.join('')}<path d="M-5 17V-5H17 M${width - 17} -5H${width + 5}V17 M-5 ${height - 17}V${height + 5}H17 M${width - 17} ${height + 5}H${width + 5}V${height - 17}" fill="none" stroke="#c2ff00" stroke-width="1.3"/></svg>`;
}

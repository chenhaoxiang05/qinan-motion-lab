import * as THREE from 'three';
import glyphs from './glyphs.json' with { type: 'json' };

/** Noto CJK outlines bundled with the site; no DOM parser or device font needed. */
export function glyphShapes(character) {
  const tokens = glyphs[character]?.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) throw new Error(`Missing local glyph: ${character}`);
  const path = new THREE.ShapePath();
  let index = 0, command = '', x = 0, y = 0, startX = 0, startY = 0;
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index])) command = tokens[index++];
    switch (command) {
      case 'M': x = number(); y = number(); path.moveTo(x, y); startX = x; startY = y; command = 'L'; break;
      case 'L': x = number(); y = number(); path.lineTo(x, y); break;
      case 'H': x = number(); path.lineTo(x, y); break;
      case 'V': y = number(); path.lineTo(x, y); break;
      case 'C': {
        const x1 = number(), y1 = number(), x2 = number(), y2 = number();
        x = number(); y = number(); path.bezierCurveTo(x1, y1, x2, y2, x, y); break;
      }
      case 'Z': path.currentPath.closePath(); x = startX; y = startY; command = ''; break;
      default: throw new Error(`Unsupported glyph command: ${command}`);
    }
  }
  // Font outlines use y-up, counter-clockwise outer contours.
  return path.toShapes(true);
}

export const SLOGAN_CHARS = Object.freeze(['先', '核', '实', '再', '放', '心']);
export const SEAL_LAYOUT = Object.freeze({
  coreWidth: 2.02, coreHeight: 3.04, coreDepth: .10,
  openCoreScale: .66, openCoreY: 1,
  rowYs: Object.freeze([-.48, -1.20]), glyphHeight: .58, sloganWidth: 2.14
});
export const SEAL_BOUNDS = Object.freeze({ width: 3.70, height: 4.30, depth: .50 });
export const FACE_Z = .051;
export const TRACE_Z = .053;
/** Hand-authored visual guide centerlines, not inferred font contours or font stroke data. */
export const STROKE_GUIDES = Object.freeze([
  'M497 832L497 785',
  'M136 704L136 550',
  'M136 704L865 704L865 550',
  'M460 595C400 460 310 285 230 170L840 -10',
  'M720 420C680 210 535 35 130 -30',
  'M100 420L900 420'
]);
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const phase = (progress, start, end) => smooth((progress - start) / (end - start));
const mix = (a, b, t) => t <= 0 ? a : t >= 1 ? b : a + (b - a) * t;

/** One uninterrupted impression; the frame carries the mechanical movement. */
export function buildSealGeometry() {
  const bevel = .015, halfWidth = SEAL_LAYOUT.coreWidth / 2 - bevel, halfHeight = SEAL_LAYOUT.coreHeight / 2 - bevel;
  const profile = new THREE.Shape();
  profile.moveTo(-halfWidth, -halfHeight); profile.lineTo(halfWidth, -halfHeight);
  profile.lineTo(halfWidth, halfHeight); profile.lineTo(-halfWidth, halfHeight); profile.closePath();
  const coreBodyGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: .07, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, curveSegments: 1, steps: 1
  });
  coreBodyGeometry.translate(0, 0, -.035);
  const coreFaceGeometry = new THREE.PlaneGeometry(SEAL_LAYOUT.coreWidth - bevel * 2, SEAL_LAYOUT.coreHeight - bevel * 2);
  coreFaceGeometry.translate(0, 0, FACE_Z);
  const traceGeometry = coreFaceGeometry.clone(); traceGeometry.translate(0, 0, TRACE_Z - FACE_Z);
  const sloganGeometry = new THREE.PlaneGeometry(SEAL_LAYOUT.sloganWidth, SEAL_LAYOUT.glyphHeight);
  const bracket = new THREE.Shape();
  bracket.moveTo(0, 0); bracket.lineTo(.32, 0); bracket.lineTo(.32, -.026);
  bracket.lineTo(.026, -.026); bracket.lineTo(.026, -.38); bracket.lineTo(0, -.38); bracket.closePath();
  const cornerGeometry = new THREE.ExtrudeGeometry(bracket, { depth: .045, bevelEnabled: false, curveSegments: 1, steps: 1 });
  cornerGeometry.translate(0, 0, -.0225);
  const geometries = { coreBodyGeometry, coreFaceGeometry, traceGeometry, sloganGeometry, cornerGeometry };
  for (const geometry of Object.values(geometries)) { geometry.computeBoundingBox(); geometry.computeBoundingSphere(); }
  return geometries;
}

/**
 * The same reversible clock opens space around an always-complete seal.
 * 0–.12 unlock; .12–.48 lift intact impression; .32–.764 trace the six guide paths;
 * .60–1 reveal two complete lines. No glyph fragment ever becomes a moving object.
 */
export function sampleSealPose(value) {
  const progress = Number.isFinite(value) ? clamp(value) : 0;
  const travel = phase(progress, .12, .48);
  const stagger = Math.sin(Math.PI * phase(progress, .12, .68));
  const release = .065 * phase(progress, 0, .12) * (1 - phase(progress, .48, .68));
  const x = mix(1.14, 1.62, travel) + release;
  const top = mix(1.64, 2.10, travel) + release * (1 - travel);
  const bottom = mix(1.64, 1.85, travel) + release * (1 - travel);
  const corners = [
    { position: [-x, top, .035 * travel + .14 * stagger], rotationZ: .045 * stagger },
    { position: [x, top, -.035 * travel - .14 * stagger], rotationZ: -Math.PI / 2 - .045 * stagger },
    { position: [x, -bottom, .035 * travel + .14 * stagger], rotationZ: Math.PI + .045 * stagger },
    { position: [-x, -bottom, -.035 * travel - .14 * stagger], rotationZ: Math.PI / 2 - .045 * stagger }
  ];
  const lines = SEAL_LAYOUT.rowYs.map((targetY, index) => {
    const opacity = phase(progress, index ? .66 : .60, index ? 1 : .88);
    return { position: [0, targetY - .08 * (1 - opacity), .04], opacity };
  });
  const traceEnd = .32 + 600 / 1350;
  return {
    progress, core: { position: [0, SEAL_LAYOUT.openCoreY * travel, 0], scale: mix(1, SEAL_LAYOUT.openCoreScale, travel) },
    corners, lines,
    traceProgress: progress > .32 && progress < traceEnd ? (progress - .32) / (traceEnd - .32) : null
  };
}

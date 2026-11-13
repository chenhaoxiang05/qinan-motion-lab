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

export const PANEL_ORDER = Object.freeze([
  Object.freeze([0, 2]), Object.freeze([1, 4]), Object.freeze([3, 5])
]);
export const SLOGAN_CHARS = Object.freeze(['先', '核', '实', '再', '放', '心']);
export const PANEL_SIZE = 1;
export const PANEL_DEPTH = .10;
export const FACE_SIZE = .97;
export const FACE_Z = .051;
export const CLOSED_EXTENT = Object.freeze({ width: 2.02, height: 3.04 });
// Includes the fully released brackets and the widest intermediate translation.
export const SEAL_BOUNDS = Object.freeze({ width: 3.64, height: 3.44, depth: 1.02 });

const CLOSED_POSITIONS = [
  [-.51, 1.02, 0], [-.51, 0, 0], [.51, 1.02, 0],
  [-.51, -1.02, 0], [.51, 0, 0], [.51, -1.02, 0]
];
const OPEN_POSITIONS = SLOGAN_CHARS.map((_, id) => [(id % 3 - 1) * 1.12, (.5 - Math.floor(id / 3)) * 1.12, 0]);
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const phase = (progress, start, end) => smooth((progress - start) / (end - start));
const mix = (a, b, t) => t <= 0 ? a : t >= 1 ? b : a + (b - a) * t;

function requirePanel(id) {
  if (!Number.isInteger(id) || id < 0 || id >= 6) throw new RangeError('Panel ID must be an integer from 0 to 5.');
}

/**
 * UVs refer to one continuous closed seal image, including the real .02 seams.
 * They deliberately do not stretch six equal image crops onto the visible faces.
 * The input u/v are normalized coordinates on the .97-wide printed face.
 */
export function frontUvForPanel(id, u, v) {
  requirePanel(id);
  const [x, y] = CLOSED_POSITIONS[id];
  return [
    (x + (u - .5) * FACE_SIZE + CLOSED_EXTENT.width / 2) / CLOSED_EXTENT.width,
    (y + (v - .5) * FACE_SIZE + CLOSED_EXTENT.height / 2) / CLOSED_EXTENT.height
  ];
}

/** Back atlas order matches the readable three-column, two-row final sentence. */
export function backUvForPanel(id, u, v) {
  requirePanel(id);
  return [(id % 3 + u) / 3, (1 - Math.floor(id / 3) + v) / 2];
}

/** A 45-degree bevel keeps the plaques mechanical instead of inflated or glossy. */
export function buildSealGeometry() {
  const profile = new THREE.Shape();
  const half = .485;
  profile.moveTo(-half, -half); profile.lineTo(half, -half);
  profile.lineTo(half, half); profile.lineTo(-half, half); profile.closePath();
  const panelBodyGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: .07, bevelEnabled: true, bevelThickness: .015, bevelSize: .015,
    bevelSegments: 1, curveSegments: 1, steps: 1
  });
  panelBodyGeometry.translate(0, 0, -.035);
  panelBodyGeometry.computeBoundingBox();
  panelBodyGeometry.computeBoundingSphere();

  const facePlaneGeometry = new THREE.PlaneGeometry(FACE_SIZE, FACE_SIZE);
  facePlaneGeometry.computeBoundingBox();
  const bracket = new THREE.Shape();
  bracket.moveTo(0, 0); bracket.lineTo(.20, 0); bracket.lineTo(.20, -.026);
  bracket.lineTo(.026, -.026); bracket.lineTo(.026, -.20); bracket.lineTo(0, -.20); bracket.closePath();
  const cornerGeometry = new THREE.ExtrudeGeometry(bracket, { depth: .035, bevelEnabled: false, curveSegments: 1, steps: 1 });
  cornerGeometry.translate(0, 0, -.0175);
  cornerGeometry.computeBoundingBox();
  cornerGeometry.computeBoundingSphere();
  return { panelBodyGeometry, facePlaneGeometry, cornerGeometry };
}

/**
 * The back is physically facing away before the parent plaque turns through PI.
 * Rotating geometry and normals together, while retaining ordinary UV winding,
 * makes a second PI turn show the characters in their original reading direction.
 */
export function createPanelFaceGeometry(id, side = 'front') {
  requirePanel(id);
  if (side !== 'front' && side !== 'back') throw new RangeError('Panel side must be front or back.');
  const geometry = new THREE.PlaneGeometry(FACE_SIZE, FACE_SIZE);
  const uv = geometry.attributes.uv;
  const map = side === 'front' ? frontUvForPanel : backUvForPanel;
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = map(id, uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  if (side === 'back') geometry.rotateY(Math.PI);
  geometry.translate(0, 0, side === 'front' ? FACE_Z : -FACE_Z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * One reversible mechanical clock. XY travel and flipping never overlap:
 * 0–.12 release; .12–.32 spread/lift; .32–.56 slide; .56–.60 seat;
 * .60–.91 flip in a short ordered cascade; .91–1 close the registration corners.
 * The middle plaques occupy separate depth lanes during intersecting XY travel.
 */
export function sampleSealPose(value) {
  const progress = Number.isFinite(value) ? clamp(value) : 0;
  const spread = phase(progress, .12, .32);
  const slide = phase(progress, .32, .56);
  const seat = phase(progress, .56, .60);
  const panels = CLOSED_POSITIONS.map((closed, id) => {
    const target = OPEN_POSITIONS[id];
    const middle = id === 1 || id === 4;
    const position = middle
      ? [mix(closed[0], target[0], slide), mix(closed[1], target[1], slide), (id === 1 ? .18 : -.18) * spread * (1 - seat)]
      : [mix(closed[0], target[0], spread), mix(closed[1], target[1], slide), 0];
    const flipStart = .60 + id * .018;
    const rotationY = Math.PI * phase(progress, flipStart, flipStart + .22);
    return { id, position, rotationY };
  });
  const release = .10 * phase(progress, 0, .12) * (1 - phase(progress, .91, 1));
  const x = mix(1.10, 1.71, spread) + release;
  const y = mix(1.61, 1.15, slide) + release;
  const corners = [
    { position: [-x, y, .01], rotationZ: 0 },
    { position: [x, y, .01], rotationZ: -Math.PI / 2 },
    { position: [x, -y, .01], rotationZ: Math.PI },
    { position: [-x, -y, .01], rotationZ: Math.PI / 2 }
  ];
  return { progress, panels, corners };
}

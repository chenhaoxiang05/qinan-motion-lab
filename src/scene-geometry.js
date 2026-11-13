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

function shieldContour() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.36);
  shape.bezierCurveTo(.36, 1.36, .72, 1.22, 1.02, 1.07);
  shape.bezierCurveTo(1.12, 1.02, 1.14, .94, 1.13, .82);
  shape.bezierCurveTo(1.10, .27, 1.04, -.25, .78, -.69);
  shape.bezierCurveTo(.58, -1.04, .25, -1.31, .07, -1.43);
  shape.quadraticCurveTo(0, -1.47, -.07, -1.43);
  shape.bezierCurveTo(-.25, -1.31, -.58, -1.04, -.78, -.69);
  shape.bezierCurveTo(-1.04, -.25, -1.10, .27, -1.13, .82);
  shape.bezierCurveTo(-1.14, .94, -1.12, 1.02, -1.02, 1.07);
  shape.bezierCurveTo(-.72, 1.22, -.36, 1.36, 0, 1.36);
  shape.closePath();
  return shape;
}

/** Smooth swept oval section, giving chrome a genuine continuous reflection surface. */
function rimGeometry(contour, { scale = 1, width = .092, depth = .115, z = .10 } = {}) {
  const points = contour.getSpacedPoints(256).slice(0, -1);
  const count = points.length, sections = 20, positions = [], indices = [];
  for (let i = 0; i < count; i++) {
    const previous = points[(i + count - 1) % count], next = points[(i + 1) % count];
    const tx = next.x - previous.x, ty = next.y - previous.y, length = Math.hypot(tx, ty);
    const nx = -ty / length, ny = tx / length;
    for (let j = 0; j < sections; j++) {
      const angle = j / sections * Math.PI * 2, amount = Math.cos(angle) * width;
      positions.push(points[i].x * scale + nx * amount, points[i].y * scale + ny * amount, z + Math.sin(angle) * depth);
      const a = i * sections + j, b = ((i + 1) % count) * sections + j;
      const c = ((i + 1) % count) * sections + (j + 1) % sections, d = i * sections + (j + 1) % sections;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  return geometry;
}

/** Closed, gently convex front and back; the face is never a flat extruded polygon. */
function faceGeometry(contour) {
  const outline = contour.getSpacedPoints(192).slice(0, -1), count = outline.length, rings = 28;
  const positions = [], indices = [];
  for (let side = 0; side < 2; side++) {
    for (let ring = 0; ring <= rings; ring++) {
      const radius = ring / rings;
      for (const point of outline) {
        positions.push(point.x * radius * .956, point.y * radius * .956,
          side === 0 ? .112 + .126 * (1 - radius * radius) : -.045 - .025 * (1 - radius * radius));
      }
    }
  }
  const sideVertices = (rings + 1) * count;
  for (let side = 0; side < 2; side++) {
    const offset = side * sideVertices;
    for (let ring = 0; ring < rings; ring++) for (let j = 0; j < count; j++) {
      const a = offset + ring * count + j, b = offset + ring * count + (j + 1) % count;
      const c = offset + (ring + 1) * count + j, d = offset + (ring + 1) * count + (j + 1) % count;
      if (side === 0) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
    }
  }
  for (let j = 0; j < count; j++) {
    const a = rings * count + j, b = rings * count + (j + 1) % count;
    indices.push(a, b, a + sideVertices, b, b + sideVertices, a + sideVertices);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  return geometry;
}

export function buildShieldGeometry() {
  const contour = shieldContour();
  const glyphGeometry = new THREE.ExtrudeGeometry(glyphShapes('安'), {
    depth: 34, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 3, curveSegments: 10, steps: 1
  });
  glyphGeometry.computeBoundingBox();
  const center = glyphGeometry.boundingBox.getCenter(new THREE.Vector3());
  const scale = .98 / (glyphGeometry.boundingBox.max.x - glyphGeometry.boundingBox.min.x);
  glyphGeometry.translate(-center.x, -center.y, 0); glyphGeometry.scale(scale, scale, scale);
  glyphGeometry.translate(0, .10, 0);
  // Seat the lettering directly on the convex face instead of floating over a plane.
  const edge = contour.getSpacedPoints(192).slice(0, -1).map(point => point.multiplyScalar(.956));
  const positions = glyphGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    let boundaryScale = Infinity;
    for (let j = 0; j < edge.length; j++) {
      const a = edge[j], b = edge[(j + 1) % edge.length], dx = b.x - a.x, dy = b.y - a.y;
      const determinant = x * dy - y * dx;
      if (Math.abs(determinant) < 1e-9) continue;
      const distance = (a.x * dy - a.y * dx) / determinant;
      const alongEdge = (a.x * y - a.y * x) / determinant;
      if (distance > 0 && alongEdge >= 0 && alongEdge <= 1) boundaryScale = Math.min(boundaryScale, distance);
    }
    const radius = Number.isFinite(boundaryScale) ? 1 / boundaryScale : 0;
    const surfaceZ = .112 + .126 * (1 - radius * radius);
    positions.setZ(i, positions.getZ(i) + surfaceZ - .003);
  }
  glyphGeometry.computeVertexNormals(); glyphGeometry.computeBoundingBox();
  return {
    rimGeometry: rimGeometry(contour),
    coreGeometry: faceGeometry(contour),
    glyphGeometry,
    accentGeometry: rimGeometry(contour, { scale: .878, width: .005, depth: .006, z: .15 })
  };
}

function seededRandom(seed = 41903) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
}
function polygonContains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function sloganGrid(maximumCells) {
  const outlines = [], rows = ['先核实', '再放心'];
  rows.forEach((row, rowIndex) => [...row].forEach((character, column) => {
    const shapes = glyphShapes(character);
    const contours = shapes.map(shape => ({ outer: shape.getPoints(12), holes: shape.holes.map(h => h.getPoints(12)) }));
    const all = contours.flatMap(c => c.outer);
    const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
    const minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
    outlines.push({ contours, minX, maxX, minY, maxY, rowIndex, column });
  }));
  // A complete coarser glyph is more legible than truncating the last character on mobile.
  let step = Math.max(31, Math.floor(31 * Math.sqrt(2610 / maximumCells)));
  for (;;) {
    const cells = [];
    for (const { contours, minX, maxX, minY, maxY, rowIndex, column } of outlines) {
      const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
      for (let y = minY + step * .42; y < maxY; y += step) for (let x = minX + step * .42; x < maxX; x += step) {
        if (contours.some(c => polygonContains(c.outer, x, y) && !c.holes.some(h => polygonContains(h, x, y)))) {
          cells.push([(x - centerX) * .00094 + (column - 1) * .99, (y - centerY) * .00094 + (.5 - rowIndex) * 1.11]);
        }
      }
    }
    if (cells.length && cells.length <= maximumCells) return cells;
    if (step > 1000) return [[0, 0]];
    step += 1;
  }
}

/** Stable particle identities and non-overlapping slogan layers, with no canvas dependency. */
export function createVoxelTargets(count, suppliedGeometries) {
  if (!Number.isInteger(count) || count < 1 || count > 4096) throw new Error('Voxel count must be an integer between 1 and 4096.');
  const geometries = suppliedGeometries || buildShieldGeometry();
  const triangles = [], cumulative = []; let totalArea = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  for (const [key, color] of [['rimGeometry', [.75, .80, .84]], ['coreGeometry', [.15, .18, .20]], ['glyphGeometry', [.90, .94, .88]]]) {
    const geometry = geometries[key], positions = geometry.attributes.position, index = geometry.index;
    const vertexCount = index ? index.count : positions.count;
    for (let i = 0; i < vertexCount; i += 3) {
      const ia = index ? index.getX(i) : i, ib = index ? index.getX(i + 1) : i + 1, ic = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(positions, ia); b.fromBufferAttribute(positions, ib); c.fromBufferAttribute(positions, ic);
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * .5;
      if (area < 1e-9) continue;
      totalArea += area; cumulative.push(totalArea); triangles.push({ a: a.clone(), b: b.clone(), c: c.clone(), color });
    }
  }
  const cells = sloganGrid(count), layers = Math.ceil(count / cells.length), random = seededRandom();
  const starts = new Float32Array(count * 3), ends = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const value = random() * totalArea; let low = 0, high = cumulative.length - 1;
    while (low < high) { const middle = (low + high) >> 1; if (value > cumulative[middle]) low = middle + 1; else high = middle; }
    const triangle = triangles[low], sqrt = Math.sqrt(random()), v = random();
    a.copy(triangle.a).multiplyScalar(1 - sqrt).addScaledVector(triangle.b, sqrt * (1 - v)).addScaledVector(triangle.c, sqrt * v);
    starts.set([a.x, a.y, a.z], i * 3); colors.set(triangle.color, i * 3);
    // Extra points fill shallow depth layers while retaining the entire final glyph grid.
    const cell = cells[i % cells.length], layer = Math.floor(i / cells.length);
    ends.set([cell[0], cell[1], (layer - (layers - 1) / 2) * .034], i * 3);
  }
  if (!suppliedGeometries) Object.values(geometries).forEach(g => g.dispose());
  return { starts, ends, colors };
}

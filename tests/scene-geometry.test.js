import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSealGeometry, glyphShapes, sampleSealPose, SLOGAN_CHARS, SEAL_LAYOUT, SEAL_BOUNDS, FACE_Z, TRACE_Z, STROKE_GUIDES } from '../src/scene-geometry.js';

const approximately = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
function assertGeometry(geometry, label) {
  const { position, normal } = geometry.attributes;
  assert.ok(position.count >= 4, label); assert.equal(normal.count, position.count, label);
  assert.ok([...position.array, ...normal.array].every(Number.isFinite), label);
  for (let i = 0; i < normal.count; i++) approximately(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)), 1);
  if (geometry.index) { assert.equal(geometry.index.count % 3, 0); assert.ok([...geometry.index.array].every(index => index >= 0 && index < position.count)); }
}

test('one continuous impression retains its full UV range and layered faces avoid z-fighting', () => {
  const geometry = buildSealGeometry();
  try {
    for (const [key, value] of Object.entries(geometry)) assertGeometry(value, key);
    const bounds = geometry.coreBodyGeometry.boundingBox;
    approximately(bounds.max.x - bounds.min.x, SEAL_LAYOUT.coreWidth);
    approximately(bounds.max.y - bounds.min.y, SEAL_LAYOUT.coreHeight);
    approximately(bounds.max.z - bounds.min.z, SEAL_LAYOUT.coreDepth);
    assert.ok(FACE_Z > bounds.max.z); assert.ok(TRACE_Z > FACE_Z);
    const uv = geometry.coreFaceGeometry.attributes.uv;
    assert.deepEqual(new Set([...uv.array]), new Set([0, 1]), 'one full-texture plane, without tile crops');
    assert.equal(geometry.coreFaceGeometry.attributes.position.count, 4);
    assert.equal(geometry.traceGeometry.attributes.position.count, 4);
  } finally { Object.values(geometry).forEach(g => g.dispose()); }
});

test('the six drawing guides are separate from the font contours and local glyph counters survive', () => {
  assert.equal(glyphShapes('安').length, 2);
  assert.equal(glyphShapes('安').reduce((n, shape) => n + shape.holes.length, 0), 1);
  assert.equal(glyphShapes('再').reduce((n, shape) => n + shape.holes.length, 0), 4);
  for (const char of SLOGAN_CHARS) assert.ok(glyphShapes(char).length);
  assert.equal(STROKE_GUIDES.length, 6); assert.equal(new Set(STROKE_GUIDES).size, 6);
  assert.ok(STROKE_GUIDES.every(path => path.startsWith('M') && !path.includes('Z')));
});

test('the open composition preserves the complete seal above two complete, separate lines', () => {
  const closed = sampleSealPose(0), open = sampleSealPose(1);
  assert.deepEqual(closed.core, { position: [0, 0, 0], scale: 1 });
  assert.ok(closed.lines.every(line => line.opacity === 0));
  assert.deepEqual(open.core, { position: [0, SEAL_LAYOUT.openCoreY, 0], scale: SEAL_LAYOUT.openCoreScale });
  assert.ok(open.lines.every(line => line.opacity === 1));
  const sealBottom = open.core.position[1] - SEAL_LAYOUT.coreHeight * open.core.scale / 2;
  const firstLineTop = open.lines[0].position[1] + SEAL_LAYOUT.glyphHeight / 2;
  assert.ok(sealBottom - firstLineTop > .18, 'impression never covers the first slogan line');
  assert.ok(open.lines[0].position[1] - open.lines[1].position[1] > SEAL_LAYOUT.glyphHeight);
  assert.equal(closed.traceProgress, null); assert.equal(open.traceProgress, null);
  assert.deepEqual(sampleSealPose(-1), closed); assert.deepEqual(sampleSealPose(2), open); assert.deepEqual(sampleSealPose(NaN), closed);
});

test('2,001 forward and reverse samples fit one stable layout box without intersecting the text', () => {
  const geometry = buildSealGeometry(), point = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const check = (value, label) => {
    assert.ok(Math.abs(value.x) <= SEAL_BOUNDS.width / 2 + 1e-6, `${label} width ${value.x}`);
    assert.ok(Math.abs(value.y) <= SEAL_BOUNDS.height / 2 + 1e-6, `${label} height ${value.y}`);
    assert.ok(Math.abs(value.z) <= SEAL_BOUNDS.depth / 2 + 1e-6, `${label} depth ${value.z}`);
  };
  try {
    for (let step = 0; step <= 2000; step++) {
      const p = step / 2000, pose = sampleSealPose(p), reverse = sampleSealPose(1 - (1 - p));
      approximately(pose.core.scale, reverse.core.scale, 1e-12);
      pose.core.position.forEach((value, i) => approximately(value, reverse.core.position[i], 1e-12));
      const corePositions = geometry.coreBodyGeometry.attributes.position;
      for (let i = 0; i < corePositions.count; i++) { point.fromBufferAttribute(corePositions, i).multiplyScalar(pose.core.scale).add(new THREE.Vector3(...pose.core.position)); check(point, 'core'); }
      for (const corner of pose.corners) {
        matrix.makeRotationZ(corner.rotationZ); matrix.setPosition(...corner.position);
        const positions = geometry.cornerGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) { point.fromBufferAttribute(positions, i).applyMatrix4(matrix); check(point, 'corner'); }
      }
      for (const line of pose.lines) if (line.opacity > 0) {
        const sealBottom = pose.core.position[1] - SEAL_LAYOUT.coreHeight * pose.core.scale / 2;
        assert.ok(line.position[1] + SEAL_LAYOUT.glyphHeight / 2 < sealBottom - .18);
        assert.ok(line.position[1] - SEAL_LAYOUT.glyphHeight / 2 > -SEAL_BOUNDS.height / 2);
      }
    }
  } finally { Object.values(geometry).forEach(g => g.dispose()); }
});

test('only the middle motion interval carries a finite trace; complete lines enter after the frame settles', () => {
  assert.equal(sampleSealPose(.2).traceProgress, null);
  assert.ok(sampleSealPose(.5).traceProgress > 0 && sampleSealPose(.5).traceProgress < 1);
  assert.equal(sampleSealPose(.9).traceProgress, null);
  const mid = sampleSealPose(.55);
  assert.equal(mid.core.scale, SEAL_LAYOUT.openCoreScale);
  assert.ok(mid.lines.every(line => line.opacity === 0));
  const entering = sampleSealPose(.75);
  assert.ok(entering.lines[0].opacity > entering.lines[1].opacity);
  assert.ok(entering.lines[1].opacity > 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import {
  buildSealGeometry, createPanelFaceGeometry, glyphShapes, sampleSealPose,
  PANEL_ORDER, SLOGAN_CHARS, PANEL_SIZE, PANEL_DEPTH, FACE_SIZE, FACE_Z,
  CLOSED_EXTENT, SEAL_BOUNDS, frontUvForPanel, backUvForPanel
} from '../src/scene-geometry.js';

const approximately = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

function assertGeometry(geometry, label) {
  const { position, normal } = geometry.attributes;
  assert.ok(position.count >= 4, label);
  assert.equal(normal.count, position.count, label);
  assert.ok([...position.array, ...normal.array].every(Number.isFinite), label);
  for (let i = 0; i < normal.count; i++) approximately(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)), 1);
  if (geometry.index) {
    assert.equal(geometry.index.count % 3, 0, label);
    assert.ok([...geometry.index.array].every(index => index >= 0 && index < position.count), label);
  } else assert.equal(position.count % 3, 0, label);
}

test('six-plaque seal uses bounded bevelled solids and finite flat face geometry', () => {
  const geometry = buildSealGeometry();
  try {
    for (const [key, value] of Object.entries(geometry)) assertGeometry(value, key);
    const bounds = geometry.panelBodyGeometry.boundingBox;
    approximately(bounds.min.x, -.5); approximately(bounds.max.x, .5);
    approximately(bounds.min.y, -.5); approximately(bounds.max.y, .5);
    approximately(bounds.min.z, -.05); approximately(bounds.max.z, .05);
    assert.ok(FACE_Z > bounds.max.z, 'printed face sits outside the solid cap, preventing z-fighting');
    assert.ok(FACE_SIZE < PANEL_SIZE, 'bevel remains exposed around each printed face');
  } finally { Object.values(geometry).forEach(value => value.dispose()); }
});

test('bundled Chinese outlines retain their counters without device fonts', () => {
  assert.equal(glyphShapes('安').reduce((n, shape) => n + shape.holes.length, 0), 1);
  assert.equal(glyphShapes('再').reduce((n, shape) => n + shape.holes.length, 0), 4);
  for (const character of SLOGAN_CHARS) assert.ok(glyphShapes(character).length > 0);
  assert.throws(() => glyphShapes('X'), /Missing local glyph/);
});

test('closed plaques reconstruct one continuous front image, preserving physical seams', () => {
  const pose = sampleSealPose(0);
  assert.deepEqual(PANEL_ORDER, [[0, 2], [1, 4], [3, 5]]);
  for (const panel of pose.panels) {
    const geometry = createPanelFaceGeometry(panel.id, 'front');
    try {
      assertGeometry(geometry, `front ${panel.id}`);
      const { position, uv } = geometry.attributes;
      for (let i = 0; i < position.count; i++) {
        const reconstructedX = uv.getX(i) * CLOSED_EXTENT.width - CLOSED_EXTENT.width / 2;
        const reconstructedY = uv.getY(i) * CLOSED_EXTENT.height - CLOSED_EXTENT.height / 2;
        approximately(reconstructedX, panel.position[0] + position.getX(i));
        approximately(reconstructedY, panel.position[1] + position.getY(i));
      }
    } finally { geometry.dispose(); }
  }
  const leftEdge = frontUvForPanel(0, 1, .5)[0];
  const rightEdge = frontUvForPanel(2, 0, .5)[0];
  approximately((rightEdge - leftEdge) * CLOSED_EXTENT.width, .05);
  assert.ok(rightEdge > leftEdge, 'real seam and face bevel are omitted from the image instead of duplicated');
});

test('back lettering reads left-to-right and top-to-bottom after the actual half turn', () => {
  const turn = new THREE.Matrix4().makeRotationY(Math.PI);
  const normalTurn = new THREE.Matrix3().setFromMatrix4(turn);
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let id = 0; id < 6; id++) {
    const geometry = createPanelFaceGeometry(id, 'back');
    try {
      assertGeometry(geometry, `back ${id}`);
      const { position, uv, normal: normals } = geometry.attributes;
      const vertices = [];
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(turn);
        normal.fromBufferAttribute(normals, i).applyMatrix3(normalTurn);
        approximately(normal.z, 1);
        approximately(point.z, FACE_Z);
        const localU = uv.getX(i) * 3 - id % 3;
        const localV = uv.getY(i) * 2 - (1 - Math.floor(id / 3));
        approximately((localU - .5) * FACE_SIZE, point.x);
        approximately((localV - .5) * FACE_SIZE, point.y);
        vertices.push({ x: point.x, u: localU });
      }
      vertices.sort((a, b) => a.x - b.x);
      assert.ok(vertices[0].u < vertices.at(-1).u, 'left-to-right UV winding must survive two half turns');
      const [u, v] = backUvForPanel(id, .5, .5);
      assert.equal(Math.floor(u * 3), id % 3);
      assert.equal(1 - Math.floor(v * 2), Math.floor(id / 3));
    } finally { geometry.dispose(); }
  }
});

test('mechanical terminal poses form a continuous two-column seal and the six-word reading order', () => {
  const closed = sampleSealPose(0), open = sampleSealPose(1);
  assert.equal(closed.panels.length, 6); assert.equal(closed.corners.length, 4);
  const closedOrder = [...closed.panels].sort((a, b) => b.position[1] - a.position[1] || a.position[0] - b.position[0]).map(panel => panel.id);
  assert.deepEqual(closedOrder, [0, 2, 1, 4, 3, 5]);
  const openOrder = [...open.panels].sort((a, b) => b.position[1] - a.position[1] || a.position[0] - b.position[0]).map(panel => SLOGAN_CHARS[panel.id]);
  assert.equal(openOrder.slice(0, 3).join(''), '先核实');
  assert.equal(openOrder.slice(3).join(''), '再放心');
  for (let id = 0; id < 6; id++) {
    approximately(closed.panels[id].rotationY, 0); approximately(open.panels[id].rotationY, Math.PI);
    approximately(closed.panels[id].position[2], 0); approximately(open.panels[id].position[2], 0);
  }
  assert.deepEqual(sampleSealPose(-1), closed);
  assert.deepEqual(sampleSealPose(2), open);
  assert.deepEqual(sampleSealPose(Number.NaN), closed);
});

function panelBox(panel) {
  const rotation = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationY(panel.rotationY));
  return new OBB(new THREE.Vector3(...panel.position), new THREE.Vector3(PANEL_SIZE / 2, PANEL_SIZE / 2, Math.max(PANEL_DEPTH / 2, FACE_Z)), rotation);
}

test('forward and reverse sweep keeps all rigid panels disjoint through slide, seating and flip', () => {
  const total = 2000;
  for (let step = 0; step <= total; step++) {
    const p = step / total, pose = sampleSealPose(p), boxes = pose.panels.map(panelBox);
    const reversed = sampleSealPose(1 - (1 - p));
    for (let id = 0; id < 6; id++) {
      assert.equal(pose.panels[id].id, reversed.panels[id].id);
      pose.panels[id].position.forEach((value, axis) => approximately(value, reversed.panels[id].position[axis], 1e-12));
      approximately(pose.panels[id].rotationY, reversed.panels[id].rotationY, 1e-12);
    }
    for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
      assert.equal(boxes[a].intersectsOBB(boxes[b], 1e-9), false, `panel ${a} overlaps ${b} at ${p}`);
    }
    for (const panel of pose.panels) {
      const [x, y, z] = panel.position;
      assert.ok([x, y, z, panel.rotationY].every(Number.isFinite));
      const radiusX = Math.abs(Math.cos(panel.rotationY)) * .5 + Math.abs(Math.sin(panel.rotationY)) * FACE_Z;
      const radiusZ = Math.abs(Math.sin(panel.rotationY)) * .5 + Math.abs(Math.cos(panel.rotationY)) * FACE_Z;
      assert.ok(Math.abs(x) + radiusX <= SEAL_BOUNDS.width / 2);
      assert.ok(Math.abs(y) + .5 <= SEAL_BOUNDS.height / 2);
      assert.ok(Math.abs(z) + radiusZ <= SEAL_BOUNDS.depth / 2);
      if (panel.rotationY > 0) {
        const final = sampleSealPose(1).panels[panel.id];
        assert.deepEqual(panel.position, final.position, 'translation must finish before any plaque flips');
      }
    }
    for (const corner of pose.corners) {
      assert.ok(Math.abs(corner.position[0]) <= SEAL_BOUNDS.width / 2);
      assert.ok(Math.abs(corner.position[1]) <= SEAL_BOUNDS.height / 2);
    }
  }
});

test('UV and geometry helpers reject nonexistent plaques and sides', () => {
  for (const id of [-1, 6, 1.5, Number.NaN]) {
    assert.throws(() => frontUvForPanel(id, 0, 0), /Panel ID/);
    assert.throws(() => backUvForPanel(id, 0, 0), /Panel ID/);
    assert.throws(() => createPanelFaceGeometry(id), /Panel ID/);
  }
  assert.throws(() => createPanelFaceGeometry(0, 'sideways'), /Panel side/);
});

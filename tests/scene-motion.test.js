import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {configureVoxelMaterial,morphVisualState} from '../src/scene-shaders.js';

test('voxel morph reserves 200ms to decompose, 900ms to migrate and 400ms to settle',()=>{
  assert.deepEqual(morphVisualState(0),{solidOpacity:1,voxelOpacity:0,travel:0});
  assert.deepEqual(morphVisualState(1),{solidOpacity:0,voxelOpacity:1,travel:1});
  const decomposed=morphVisualState(200/1500),migrated=morphVisualState(1100/1500);
  assert.equal(decomposed.travel,0);assert.equal(decomposed.voxelOpacity,1);assert.equal(decomposed.solidOpacity,0);
  assert.equal(migrated.travel,.92);
  let previous=0;
  for(let i=0;i<=1500;i++){
    const state=morphVisualState(i/1500);
    assert.ok(state.travel>=previous&&state.travel<=1);previous=state.travel;
    assert.ok(Math.abs(state.solidOpacity+state.voxelOpacity-1)<1e-12);
  }
});

test('voxel shader patches the installed Three chunks without scaling away the gaps',()=>{
  const material=new THREE.MeshStandardMaterial(),uniforms={uProgress:{value:0}};
  configureVoxelMaterial(material,uniforms);
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,uniforms:{}};
  material.onBeforeCompile(shader);
  assert.strictEqual(shader.uniforms.uProgress,uniforms.uProgress);
  assert.ok(shader.vertexShader.includes('vec3 transformed = voxelTurn * vec3(position);'));
  assert.equal(shader.vertexShader.includes('#include <begin_vertex>'),false);
  assert.equal(shader.vertexShader.includes('#include <beginnormal_vertex>'),false);
  const colorIndex=shader.vertexShader.indexOf('vColor.rgb = mix');
  const normalIndex=shader.vertexShader.indexOf('float voxelT = migration');
  assert.ok(colorIndex<normalIndex);
  assert.match(shader.vertexShader.slice(colorIndex,normalIndex),/migration\(uProgress\)/);
  assert.ok(!shader.vertexShader.slice(colorIndex,normalIndex).includes('voxelT'));
  material.dispose();
});

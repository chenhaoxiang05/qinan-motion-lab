import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildShieldGeometry,createVoxelTargets,glyphShapes} from '../src/scene-geometry.js';

test('chrome shield meshes have finite normals, valid triangles and a convex face',()=>{
  const meshes=buildShieldGeometry();
  try{
    for(const [name,geometry] of Object.entries(meshes)){
      const {position,normal}=geometry.attributes;
      assert.ok(position.count>100,name);
      assert.equal(normal.count,position.count,name);
      assert.ok([...position.array,...normal.array].every(Number.isFinite),name);
      const indices=geometry.index;
      if(indices){assert.equal(indices.count%3,0,name);assert.ok([...indices.array].every(i=>i>=0&&i<position.count),name);}
    }
    const face=meshes.coreGeometry.attributes.position;
    let center=-Infinity,edge=-Infinity;
    for(let i=0;i<face.count;i++){
      if(Math.abs(face.getX(i))<.01&&Math.abs(face.getY(i))<.01)center=Math.max(center,face.getZ(i));
      if(Math.abs(face.getX(i))>.8)edge=Math.max(edge,face.getZ(i));
    }
    assert.ok(center>edge+.08,'front face must bow out from its border');
    assert.ok(meshes.glyphGeometry.boundingBox.min.z>meshes.coreGeometry.boundingBox.max.z+.2,'lettering floats clearly ahead of the core');
    assert.ok(meshes.coreGeometry.boundingBox.max.x<meshes.rimGeometry.boundingBox.max.x-.15,'inset core leaves a visible perimeter gap');
  }finally{Object.values(meshes).forEach(g=>g.dispose());}
});

test('bundled Chinese outlines preserve counters without device fonts',()=>{
  assert.equal(glyphShapes('安').reduce((n,s)=>n+s.holes.length,0),1);
  assert.equal(glyphShapes('再').reduce((n,s)=>n+s.holes.length,0),4);
  for(const char of '先核实放心')assert.ok(glyphShapes(char).length>0);
  assert.throws(()=>glyphShapes('X'),/Missing local glyph/);
});

function nearestDistance(array,dimensions=3) {
  let distance=Infinity;
  for(let i=0;i<array.length;i+=3)for(let j=i+3;j<array.length;j+=3){
    let squared=0;
    for(let axis=0;axis<dimensions;axis++)squared+=(array[i+axis]-array[j+axis])**2;
    distance=Math.min(distance,squared);
  }
  return Math.sqrt(distance);
}

for(const maximumCount of [2048,4096])test(`${maximumCount} budget produces complete, separated glyphs and regular shield particles`,()=>{
  const a=createVoxelTargets(maximumCount),b=createVoxelTargets(maximumCount);
  assert.ok(a.count<=maximumCount&&a.count>maximumCount*.6);
  assert.ok(a.count<maximumCount,'the budget is a cap, never filled with duplicate depth layers');
  assert.equal(a.cubeSize,a.pitch*.66);
  for(const key of ['starts','ends','colors']){
    assert.equal(a[key].length,a.count*3);
    assert.ok([...a[key]].every(Number.isFinite));
    assert.deepEqual(a[key],b[key]);
  }
  const regions=Array(6).fill(0),uniqueXY=new Set(),materials=new Set();
  for(let i=0;i<a.count;i++){
    const [x,y,z]=a.ends.slice(i*3,i*3+3);
    const column=x<-.5?0:x>.5?2:1;
    regions[(y>0?0:3)+column]++;
    uniqueXY.add(`${x},${y}`);
    assert.equal(z,0,'one text plane avoids overlaid cube reflections');
    materials.add(a.colors[i*3].toFixed(2));
  }
  assert.ok(regions.every(n=>n>100),'all six characters remain complete at both quality levels');
  assert.equal(uniqueXY.size,a.count);
  assert.equal(materials.size,3,'rim, core and raised lettering retain their material regions');
  const finalSpacing=nearestDistance(a.ends,2),shieldSpacing=nearestDistance(a.starts);
  assert.ok(finalSpacing>=a.pitch-1e-6,'glyph neighbors retain the intended grid spacing');
  assert.ok(finalSpacing-a.cubeSize>=a.pitch*.339,'the visible final gap is at least 33.9% of pitch');
  assert.ok(shieldSpacing>=a.startPitch-1e-6,'structured shield points never cluster');
  assert.ok(shieldSpacing>a.cubeSize);
});

test('voxel allocation enforces its GPU budget',()=>{
  for(const count of [0,-1,1.5,4097,Infinity])assert.throws(()=>createVoxelTargets(count),/Voxel count/);
});

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
      if(Math.abs(face.getX(i))>1)edge=Math.max(edge,face.getZ(i));
    }
    assert.ok(center>edge+.08,'front face must bow out from its border');
    assert.ok(meshes.glyphGeometry.boundingBox.min.z>.18,'raised lettering sits on the front');
  }finally{Object.values(meshes).forEach(g=>g.dispose());}
});

test('bundled Chinese outlines preserve counters without device fonts',()=>{
  assert.equal(glyphShapes('安').reduce((n,s)=>n+s.holes.length,0),1);
  assert.equal(glyphShapes('再').reduce((n,s)=>n+s.holes.length,0),4);
  for(const char of '先核实放心')assert.ok(glyphShapes(char).length>0);
  assert.throws(()=>glyphShapes('X'),/Missing local glyph/);
});

for(const count of [2048,4096])test(`${count} voxels cover all six slogan characters with stable particle identities`,()=>{
  const meshes=buildShieldGeometry();
  try{
    const a=createVoxelTargets(count,meshes),b=createVoxelTargets(count,meshes);
    for(const key of ['starts','ends','colors']){
      assert.equal(a[key].length,count*3);
      assert.ok([...a[key]].every(Number.isFinite));
      assert.deepEqual(a[key],b[key]);
    }
    const regions=Array(6).fill(0),unique=new Set();
    for(let i=0;i<count;i++){
      const [x,y,z]=a.ends.slice(i*3,i*3+3);
      const column=x<-.5?0:x>.5?2:1;
      regions[(y>0?0:3)+column]++;
      unique.add(`${x},${y},${z}`);
    }
    assert.ok(regions.every(n=>n>100),'each glyph remains legible at both quality levels');
    assert.equal(unique.size,count,'extra voxels occupy depth layers instead of z-fighting');
  }finally{Object.values(meshes).forEach(g=>g.dispose());}
});

test('voxel allocation enforces its GPU budget',()=>{
  for(const count of [0,-1,1.5,4097,Infinity])assert.throws(()=>createVoxelTargets(count),/Voxel count/);
});

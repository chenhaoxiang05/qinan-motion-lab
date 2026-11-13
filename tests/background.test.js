import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {screenVertex,fuiFragment} from '../src/scene-shaders.js';

function renderNative(t,options={}){
  // Three injects the geometry attributes, precision and output colour helper.
  // Compile the actual authored shader body; colour conversion is library code.
  const shader={
    vertex:'attribute vec3 position; attribute vec2 uv;\n'+screenVertex,
    fragment:'precision highp float;\n'+fuiFragment.replace('#include <colorspace_fragment>',''),
  };
  const result=spawnSync('python3',[fileURLToPath(new URL('./helpers/compile-background.py',import.meta.url))],{
    input:JSON.stringify({...shader,...options}),encoding:'utf8',timeout:15000,
  });
  if(result.error?.code==='ENOENT'||result.status===77){t.skip(result.stdout?.trim()||'Native Python/EGL compiler unavailable.');return;}
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/Compiled and linked background shader/);
  const line=result.stdout.split('\n').find(line=>line.startsWith('{'));
  return line?JSON.parse(line):null;
}

test('background shader compiles and links in the available native GLES compiler',t=>{
  renderNative(t);
});

test('an untouched homepage shows broad movement within two seconds while its title stays quiet',t=>{
  const rendered=renderNative(t,{
    regions:{title:[12,260,190,145]},
    frames:[0,.8,1.6].map(time=>({uTime:time,uAmbientTime:time})),
  });
  if(!rendered)return;
  assert.equal(new Set(rendered.frames.map(frame=>frame.hash)).size,3);
  assert.equal(new Set(rendered.frames.map(frame=>frame.regions.title)).size,1);
  assert.ok(rendered.changed_pixels.every(count=>count>8000),'movement must occupy a visible field, not only tiny registration marks');
});

test('hover replaces the automatic packet and a frozen background clock yields identical frames',t=>{
  const rendered=renderNative(t,{
    frames:[
      {uTime:1.1,uAmbientTime:.8,uActivePortal:2,uPortalAge:.3},
      {uTime:1.1,uAmbientTime:7.8,uActivePortal:2,uPortalAge:.3},
      {uTime:1.1,uAmbientTime:.8,uActivePortal:-1,uPortalAge:100},
      {uTime:1.1,uAmbientTime:.8,uActivePortal:-1,uPortalAge:100},
    ],
  });
  if(!rendered)return;
  assert.equal(rendered.frames[0].hash,rendered.frames[1].hash,'automatic phase must not leak into a hovered route');
  assert.notEqual(rendered.frames[1].hash,rendered.frames[2].hash,'leaving hover resumes the automatic route');
  assert.equal(rendered.frames[2].hash,rendered.frames[3].hash,'pause must not introduce random noise or wall-clock changes');
});

test('mobile retains ambient motion without portal paths and preparation leaves its architecture visible',t=>{
  const rendered=renderNative(t,{
    samples:{architecture:[420,210],outside:[10,10]},
    frames:[
      {uMobile:1,uTime:.2,uAmbientTime:.2},
      {uMobile:1,uTime:2.6,uAmbientTime:2.6},
      {uMobile:1,uTime:2.6,uAmbientTime:8.2},
      {uMobile:1,uTime:0,uAmbientTime:0,uEntranceProgress:0},
      {uMobile:1,uTime:3,uAmbientTime:3,uEntranceProgress:0},
    ],
  });
  if(!rendered)return;
  assert.notEqual(rendered.frames[0].hash,rendered.frames[1].hash);
  assert.equal(rendered.frames[1].hash,rendered.frames[2].hash,'mobile omits automatic route geometry');
  assert.equal(rendered.frames[3].hash,rendered.frames[4].hash,'decoration waits until the page entrance');
  assert.notEqual(rendered.frames[2].hash,rendered.frames[3].hash);
  assert.notDeepEqual(rendered.frames[3].samples.architecture,rendered.frames[3].samples.outside,'the large background panel remains visible before entrance');
});

test('a phone viewport has substantial early motion below its protected heading',t=>{
  const rendered=renderNative(t,{
    size:[390,844],
    uniforms:{uMobile:1,uCenter:[.5,.30],uFieldSize:[188,163],uTitleRect:[18,430,354,290]},
    regions:{title:[18,430,354,290]},
    frames:[0,.8,1.6].map(time=>({uTime:time,uAmbientTime:time})),
  });
  if(!rendered)return;
  assert.equal(new Set(rendered.frames.map(frame=>frame.regions.title)).size,1);
  assert.ok(rendered.changed_pixels.every(count=>count>8000),'phone motion must be visible without hovering or scrolling');
});

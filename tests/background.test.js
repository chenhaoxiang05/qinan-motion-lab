import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {screenVertex,fuiFragment} from '../src/scene-shaders.js';

test('background shader compiles and links in the available native GLES compiler',t=>{
  // Three injects the geometry attributes, precision and output colour helper.
  // Compile the actual authored shader body; colour conversion is library code.
  const shader={
    vertex:'attribute vec3 position; attribute vec2 uv;\n'+screenVertex,
    fragment:'precision highp float;\n'+fuiFragment.replace('#include <colorspace_fragment>',''),
  };
  const result=spawnSync('python3',[fileURLToPath(new URL('./helpers/compile-background.py',import.meta.url))],{
    input:JSON.stringify(shader),encoding:'utf8',timeout:15000,
  });
  if(result.error?.code==='ENOENT'||result.status===77){t.skip(result.stdout?.trim()||'Native Python/EGL compiler unavailable.');return;}
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/Compiled and linked background shader/);
});

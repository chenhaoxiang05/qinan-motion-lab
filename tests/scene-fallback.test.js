import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSanctuary,sculpturePlacement} from '../src/scene.js';

test('WebGL failure retains a correctly sized local shield, reversible slogan and clean disposal',async t=>{
  const dom=new JSDOM('<div id="world"><div class="scene-placeholder">安</div></div>',{pretendToBeVisual:true});
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  dom.window.HTMLCanvasElement.prototype.getContext=()=>{throw new Error('WebGL unavailable');};
  t.after(()=>{dom.window.close();globalThis.window=previousWindow;globalThis.document=previousDocument;});
  const host=document.querySelector('#world'),originalError=console.error;
  let scene;
  try{console.error=()=>{};scene=createSanctuary(host);}finally{console.error=originalError;}
  assert.ok(host.classList.contains('webgl-ready'));
  assert.equal(host.querySelector('.scene-fallback-shield svg').style.width,'100%');
  assert.equal(host.querySelector('canvas'),null);
  scene.pause();scene.focus(true);assert.equal(host.querySelector('.scene-fallback').style.opacity,'0.36');
  assert.equal(await scene.toggleForm(),'slogan');
  assert.equal(host.querySelectorAll('.scene-fallback-slogan path').length,6);
  assert.equal(await scene.toggleForm(),'shield');
  scene.dispose();
  assert.equal(host.querySelector('.scene-fallback'),null);assert.equal(host.classList.contains('webgl-ready'),false);
});


test('sculpture and SVG fallback follow the DOM anchor when the page scrolls',async t=>{
  const dom=new JSDOM('<div id="world"></div><div id="sculptureAnchor"></div>',{pretendToBeVisual:true});
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  dom.window.HTMLCanvasElement.prototype.getContext=()=>{throw new Error('WebGL unavailable');};
  t.after(()=>{dom.window.close();globalThis.window=previousWindow;globalThis.document=previousDocument;});
  let top=120;
  document.querySelector('#sculptureAnchor').getBoundingClientRect=()=>({left:420,top,width:400,height:360});
  assert.deepEqual(sculpturePlacement(),{x:620,y:300,size:316.8});
  const host=document.querySelector('#world'),originalError=console.error;
  let scene;
  try{console.error=()=>{};scene=createSanctuary(host);}finally{console.error=originalError;}
  const sculpture=host.querySelector('.scene-fallback-shield');
  assert.equal(sculpture.style.left,'620px');assert.equal(sculpture.style.top,'300px');
  top=-50;dom.window.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(sculpture.style.top,'130px');
  await scene.toggleForm();assert.equal(sculpture.style.width,'316.8px');
  scene.dispose();top=0;dom.window.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(sculpture.style.top,'130px','disposed anchor listeners no longer update detached DOM');
});

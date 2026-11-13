import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createFontReadiness} from '../src/font-ready.js';

const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function fixture(t,fonts) {
  const dom=new JSDOM('<!doctype html><html><body></body></html>');
  if(fonts)Object.defineProperty(dom.window.document,'fonts',{value:fonts});
  t.after(()=>dom.window.close());
  return dom.window.document;
}

test('display fonts are enabled together only after both local faces have loaded',async t=>{
  const pending=[],checks=[];
  const doc=fixture(t,{load:(font,text)=>new Promise(resolve=>pending.push({font,text,resolve})),check:(font,text)=>{checks.push({font,text});return true;}});
  const controller=createFontReadiness({document:doc});t.after(controller.destroy);
  await flush();assert.equal(pending.length,2);
  assert.match(pending[0].font,/Qinan Display/);assert.equal(pending[0].text,'先核实再放心，。');
  assert.match(pending[1].font,/Qinan Signal/);
  pending[0].resolve([{status:'loaded'}]);await flush();
  assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),false);
  pending[1].resolve([{status:'loaded'}]);
  assert.deepEqual(await controller.ready,{label:'字体已就绪'});
  assert.equal(checks.length,2);assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),true);
  controller.finalize();assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),true);
  controller.destroy();assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),false);
});

test('a font deadline fixes fallback for this visit even if both fonts arrive later',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const pending=[],doc=fixture(t,{load:()=>new Promise(resolve=>pending.push(resolve)),check:()=>true});
  const controller=createFontReadiness({document:doc,timeoutMs:1800});t.after(controller.destroy);
  await flush();t.mock.timers.tick(1800);
  assert.deepEqual(await controller.ready,{fallback:true,label:'基础字体已就绪'});
  pending.forEach(resolve=>resolve([{status:'loaded'}]));await flush();
  assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),false);
});

test('boot skip/finalize and destruction settle pending loads without a late class change',async t=>{
  for(const action of ['finalize','destroy']) {
    const pending=[],doc=fixture(t,{load:()=>new Promise(resolve=>pending.push(resolve)),check:()=>true});
    const controller=createFontReadiness({document:doc});await flush();
    controller[action]();assert.deepEqual(await controller.ready,{fallback:true,label:'基础字体已就绪'});
    pending.forEach(resolve=>resolve([{status:'loaded'}]));await flush();
    assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),false);
    controller.destroy();
  }
});

test('unavailable, empty, rejected or throwing font APIs preserve the normal readable UI',async t=>{
  const variants=[undefined,{load:()=>[],check:()=>true},{load:()=>Promise.reject(new Error('network')),check:()=>true},{load:()=>{throw new Error('font service');},check:()=>true},{load:()=>[{status:'loaded'}],check:()=>false},{load:()=>[{status:'loaded'}],check:()=>{throw new Error('font check');}}];
  for(const fonts of variants) {
    const doc=fixture(t,fonts),controller=createFontReadiness({document:doc});
    assert.deepEqual(await controller.ready,{fallback:true,label:'基础字体已就绪'});
    assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),false);controller.destroy();
  }
});

test('font controller destruction does not remove a readiness class it did not own',async t=>{
  const doc=fixture(t,{load:()=>[{status:'loaded'}],check:()=>true});
  doc.documentElement.classList.add('display-fonts-ready');
  const controller=createFontReadiness({document:doc});await controller.ready;controller.destroy();
  assert.equal(doc.documentElement.classList.contains('display-fonts-ready'),true);
});

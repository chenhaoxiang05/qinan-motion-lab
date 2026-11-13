import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createAmbientBackground} from '../src/ambient-background.js';

const css=readFileSync(new URL('../src/background-layer.css',import.meta.url),'utf8');
function setup(t,{reduced=false,enabled=true,animate}={}) {
  const dom=new JSDOM(`<style>${css}</style><div class="stage-background"><div class="field-axis"></div></div>`,{pretendToBeVisual:true});
  const {document}=dom.window,host=document.querySelector('.stage-background'),listeners=new Set();
  const media={matches:reduced,addEventListener(_name,fn){listeners.add(fn);},removeEventListener(_name,fn){listeners.delete(fn);}};
  dom.window.matchMedia=()=>media;
  const controller=createAmbientBackground({host,animate,motionEnabled:()=>enabled});
  const hidden=value=>{Object.defineProperty(document,'hidden',{value,configurable:true});document.dispatchEvent(new dom.window.Event('visibilitychange'));};
  const setReduced=value=>{media.matches=value;listeners.forEach(fn=>fn({matches:value}));};
  t.after(()=>{controller.destroy();dom.window.close();});
  return {dom,document,host,controller,listeners,hidden,setReduced,setEnabled(value){enabled=value;}};
}
const state=host=>host.dataset.ambientState;
function recorder(){
  const tweens=[];
  return {tweens,animate(target,options){const tween={target,options,cancelled:false,cancel(){this.cancelled=true;}};tweens.push(tween);return tween;}};
}

test('the initial corner composition exists independently of Three, React and Anime',t=>{
  const {dom,host,document,controller}=setup(t);
  assert.equal(state(host),'running');assert.equal(host.getAttribute('aria-hidden'),'true');
  assert.equal(host.querySelectorAll('.ambient-light-fill').length,2);
  assert.equal(host.querySelector('canvas,svg,.ambient-stream,.ambient-matrix-frame,.ambient-cobalt,.field-axis'),null);
  assert.notEqual(dom.window.getComputedStyle(host).backgroundColor,'rgba(0, 0, 0, 0)');
  assert.equal(dom.window.getComputedStyle(host).overflow,'hidden');
  for(const selector of ['.ambient-environment','.ambient-rotation','.ambient-sway','.ambient-depth','.ambient-light']){
    assert.equal(dom.window.getComputedStyle(host.querySelector(selector)).overflow,'visible',selector+' cannot crop rotated light edges');
  }
  document.documentElement.dataset.sceneRenderer='webgl';document.documentElement.classList.add('scene-ambient-paused');
  controller.setPaused(false);assert.equal(state(host),'running','seal renderer state cannot freeze the independent lights');
  assert.doesNotThrow(()=>controller.setPointer(.9,.2));
  assert.equal(host.style.opacity,'');assert.equal(host.style.visibility,'');
});

test('all pause reasons retain the same painted composition until every reason clears',t=>{
  const {dom,host,controller,hidden,setReduced,setEnabled}=setup(t);
  const composition=host.innerHTML;
  controller.setEntranceProgress(0);assert.equal(state(host),'paused');
  for(const node of host.querySelectorAll('.ambient-sway,.ambient-light-fill'))assert.equal(dom.window.getComputedStyle(node).animationPlayState,'paused');
  controller.setPaused(true);controller.setCovered(true);hidden(true);setReduced(true);
  controller.setEntranceProgress(1);controller.setPaused(false);controller.setCovered(false);
  assert.equal(state(host),'paused');hidden(false);assert.equal(state(host),'paused');
  setReduced(false);assert.equal(state(host),'running');
  setEnabled(false);controller.setPaused(false);assert.equal(state(host),'paused');
  setEnabled(true);controller.setPaused(false);assert.equal(state(host),'running');
  assert.equal(host.innerHTML,composition,'pause never blanks or reconstructs the corner lights');
  assert.equal(host.style.opacity,'');assert.equal(host.style.visibility,'');
});

test('pointer rotation and opposing shift use one bounded three-second tween',t=>{
  const {tweens,animate}=recorder(),{host,controller}=setup(t,{animate});
  controller.setPointer(4,-3);
  assert.equal(tweens[0].options.rotation,15);assert.equal(tweens[0].options.shift,-4);assert.equal(tweens[0].options.duration,3000);
  Object.assign(tweens[0].target,{rotation:6,shift:-1.5});tweens[0].options.onUpdate();
  assert.equal(host.style.getPropertyValue('--ambient-rotation'),'6.000deg');assert.equal(host.style.getPropertyValue('--ambient-shift'),'-1.5');
  controller.setPointer(.2,.8);assert.equal(tweens[0].cancelled,true);
  Object.assign(tweens[0].target,{rotation:12,shift:3});tweens[0].options.onUpdate();
  assert.equal(host.style.getPropertyValue('--ambient-rotation'),'6.000deg','obsolete callbacks cannot repaint');
  controller.setPaused(true);assert.equal(tweens[1].cancelled,true);
  controller.setPointer(1,1);assert.equal(tweens.length,2);
  tweens[1].options.onUpdate();assert.equal(host.style.getPropertyValue('--ambient-rotation'),'6.000deg');
  controller.setPaused(false);controller.setPointer(Number.NaN,undefined);
  assert.equal(tweens[2].options.rotation,0);assert.equal(tweens[2].options.shift,0);
});

test('responsive resize cancels old coordinates before the corner geometry changes',t=>{
  const {tweens,animate}=recorder(),{dom,host,controller}=setup(t,{animate});
  controller.setPointer(1,1);Object.assign(tweens[0].target,{rotation:13,shift:3});tweens[0].options.onUpdate();
  Object.defineProperty(dom.window,'innerWidth',{value:390,configurable:true});
  dom.window.dispatchEvent(new dom.window.Event('resize'));
  assert.equal(tweens[0].cancelled,true);assert.equal(host.style.getPropertyValue('--ambient-rotation'),'0.000deg');assert.equal(host.style.getPropertyValue('--ambient-shift'),'0');
  Object.assign(tweens[0].target,{rotation:15,shift:4});tweens[0].options.onUpdate();
  assert.equal(host.style.getPropertyValue('--ambient-rotation'),'0.000deg');
  controller.setPointer(.1,.5);tweens[0].options.onComplete();controller.setCovered(true);
  assert.equal(tweens[1].cancelled,true,'a late completion cannot discard the new tween handle');
});

test('replacing an owner cancels motion and removes the old lifecycle subscriptions',t=>{
  const {tweens,animate}=recorder(),{host,controller,listeners,hidden,dom}=setup(t,{animate});
  controller.setPointer(.8,.3);
  const replacement=createAmbientBackground({host});t.after(()=>replacement.destroy());
  assert.equal(tweens[0].cancelled,true);assert.equal(listeners.size,1,'only the replacement retains its media subscription');
  controller.setPaused(true);assert.equal(state(host),'running');
  hidden(true);assert.equal(state(host),'paused');
  replacement.destroy();assert.equal(listeners.size,0);assert.equal(host.childElementCount,0);
  assert.equal(host.hasAttribute('data-ambient-mounted'),false);
  hidden(false);dom.window.dispatchEvent(new dom.window.Event('resize'));tweens[0].options.onUpdate();
  assert.equal(host.dataset.ambientState,undefined);assert.equal(host.style.getPropertyValue('--ambient-rotation'),'');
  replacement.destroy();
});

test('reduced motion and animation-engine failure keep complete static corner lights',t=>{
  const {tweens,animate}=recorder(),{host,controller,setReduced}=setup(t,{reduced:true,animate});
  assert.equal(state(host),'paused');controller.setPointer(1,1);assert.equal(tweens.length,0);
  assert.equal(host.querySelectorAll('.ambient-light-fill').length,2);
  setReduced(false);assert.equal(state(host),'running');controller.setPointer(.8,.8);assert.equal(tweens.length,1);
  const other=setup(t,{animate(){throw new Error('optional pointer animation unavailable');}});
  assert.doesNotThrow(()=>other.controller.setPointer(.7,.2));
  assert.equal(state(other.host),'running');assert.equal(other.host.querySelectorAll('.ambient-light-fill').length,2);
});

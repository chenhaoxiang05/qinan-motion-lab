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

test('ambient colour and geometry exist immediately without Three, React or Anime',t=>{
  const {dom,host,document,controller}=setup(t);
  assert.equal(state(host),'running');assert.equal(host.getAttribute('aria-hidden'),'true');
  assert.equal(host.querySelectorAll('.ambient-light').length,2);
  assert.equal(host.querySelectorAll('.ambient-stream').length,5);
  assert.equal(host.querySelector('canvas'),null);
  assert.equal(host.querySelector('.field-axis'),null,'legacy equipment axes are replaced');
  assert.notEqual(dom.window.getComputedStyle(host).backgroundColor,'rgba(0, 0, 0, 0)');
  document.documentElement.dataset.sceneRenderer='webgl';
  document.documentElement.classList.add('scene-ambient-paused');
  controller.setPortalFocus('practice');
  assert.equal(state(host),'running','seal renderer diagnostics cannot stop the independent environment');
  assert.doesNotThrow(()=>controller.setPointer(.9,.2));
  assert.equal(host.style.opacity,'');assert.equal(host.style.visibility,'');
  for(const stream of host.querySelectorAll('.ambient-stream'))assert.notEqual(dom.window.getComputedStyle(stream).animationPlayState,'paused');
});

test('pause reasons compose and retain the painted composition until every reason clears',t=>{
  const {dom,host,controller,hidden,setReduced,setEnabled}=setup(t);
  const composition=host.innerHTML;
  controller.setEntranceProgress(0);assert.equal(state(host),'paused');
  assert.equal(dom.window.getComputedStyle(host.querySelector('.ambient-light')).animationPlayState,'paused');
  controller.setPaused(true);controller.setCovered(true);hidden(true);setReduced(true);
  controller.setEntranceProgress(1);controller.setPaused(false);controller.setCovered(false);
  assert.equal(state(host),'paused');hidden(false);assert.equal(state(host),'paused');
  setReduced(false);assert.equal(state(host),'running');
  setEnabled(false);controller.setPaused(false);assert.equal(state(host),'paused');
  setEnabled(true);controller.setPaused(false);assert.equal(state(host),'running');
  assert.equal(host.innerHTML,composition,'pausing neither blanks nor reconstructs the visual layers');
  assert.equal(host.style.opacity,'');assert.equal(host.style.visibility,'');
});

test('late Matrix mounts inherit state; repeated progress and hover do not rerender it',t=>{
  const {host,controller,hidden}=setup(t),updates=[];
  controller.setCovered(true);controller.setPortalFocus('contacts');
  let mounts=0,destroys=0;
  const islands={mountMatrixField(slot,props){mounts++;slot.append(slot.ownerDocument.createElement('canvas'));updates.push({...props});return {update(value){updates.push({...value});},destroy(){assert.ok(slot.firstChild,'unmount precedes slot removal');destroys++;}};}};
  controller.refreshIslands(islands);
  assert.deepEqual(updates,[{paused:true,activePortal:'contacts'}]);
  for(let i=0;i<20;i++){controller.setEntranceProgress(i/20);controller.setPortalFocus('contacts');}
  controller.refreshIslands(islands);assert.equal(updates.length,1);
  controller.setEntranceProgress(1);controller.setCovered(false);
  assert.deepEqual(updates.at(-1),{paused:false,activePortal:'contacts'});
  controller.setPortalFocus('practice');assert.deepEqual(updates.at(-1),{paused:false,activePortal:'practice'});
  hidden(true);assert.equal(updates.at(-1).paused,true);
  hidden(false);assert.equal(updates.at(-1).paused,false);
  controller.refreshIslands({});assert.equal(destroys,1);assert.equal(mounts,1);
  assert.equal(host.querySelector('canvas'),null);assert.equal(host.querySelector('.ambient-matrix-slot').hasAttribute('data-matrix-mounted'),false);
});

test('pointer parallax has one bounded Anime tween and stale callbacks cannot write after pause',t=>{
  const tweens=[];
  const animate=(target,options)=>{const tween={target,options,cancelled:false,cancel(){this.cancelled=true;}};tweens.push(tween);return tween;};
  const {host,controller}=setup(t,{animate});
  controller.setPointer(4,-3);
  assert.equal(tweens[0].options.x,36);assert.equal(tweens[0].options.y,-36);assert.equal(tweens[0].options.duration,1000);
  Object.assign(tweens[0].target,{x:12,y:-8});tweens[0].options.onUpdate();
  assert.equal(host.style.getPropertyValue('--ambient-pointer-x'),'12.00px');
  controller.setPointer(.2,.8);assert.equal(tweens[0].cancelled,true);
  Object.assign(tweens[0].target,{x:30,y:30});tweens[0].options.onUpdate();
  assert.equal(host.style.getPropertyValue('--ambient-pointer-x'),'12.00px','cancelled callbacks cannot repaint');
  controller.setPaused(true);assert.equal(tweens[1].cancelled,true);
  controller.setPointer(1,1);assert.equal(tweens.length,2);
  tweens[1].options.onUpdate();assert.equal(host.style.getPropertyValue('--ambient-pointer-x'),'12.00px');
  controller.setPaused(false);controller.setPointer(Number.NaN,undefined);
  assert.equal(tweens[2].options.x,0);assert.equal(tweens[2].options.y,0);
});

test('replacing an owner disposes live React before DOM and disconnects old lifecycle hooks',t=>{
  const {host,controller,listeners,hidden}=setup(t);let destroyed=0;
  controller.refreshIslands({mountMatrixField(slot){slot.append(slot.ownerDocument.createElement('canvas'));return {update(){},destroy(){assert.ok(slot.querySelector('canvas'));destroyed++;}};}});
  const replacement=createAmbientBackground({host});
  t.after(()=>replacement.destroy());
  assert.equal(destroyed,1);assert.equal(listeners.size,1,'only the replacement retains its media subscription');
  controller.setPaused(true);assert.equal(state(host),'running');
  hidden(true);assert.equal(state(host),'paused');
  replacement.destroy();assert.equal(listeners.size,0);assert.equal(host.childElementCount,0);
  assert.equal(host.hasAttribute('data-ambient-mounted'),false);
  hidden(false);assert.equal(host.dataset.ambientState,undefined);
  replacement.destroy();assert.equal(destroyed,1);
});

test('reduced motion starts with a complete still environment and optional island failure does not remove it',t=>{
  const {host,controller,setReduced}=setup(t,{reduced:true});
  assert.equal(state(host),'paused');
  controller.refreshIslands({mountMatrixField(){throw new Error('optional adapter unavailable');}});
  assert.equal(host.querySelectorAll('.ambient-light').length,2);assert.equal(host.querySelectorAll('.ambient-stream').length,5);
  assert.equal(host.querySelector('.ambient-matrix-slot').hasAttribute('data-matrix-mounted'),false);
  setReduced(false);assert.equal(state(host),'running');
});

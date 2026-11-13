import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkspaceIntro} from '../src/workspace-intro.js';

function fixture(t,{enabled=true,width=1440,throwing=false,islands={}}={}){
  const dom=new JSDOM('<main id="content"><p>Old view</p></main>',{pretendToBeVisual:true}),doc=dom.window.document,host=doc.querySelector('main');
  Object.defineProperty(dom.window,'innerWidth',{value:width,configurable:true});
  const animations=[];let commits=0,ready=0;
  const controller=createWorkspaceIntro({host,motionEnabled:()=>enabled,getIslands:()=>islands,animate(target,params){
    if(throwing)throw new Error('driver unavailable');
    const entry={target,params,cancelled:false,cancel(){this.cancelled=true;}};animations.push(entry);return entry;
  },onReady(){ready++;}});
  const prepare=(key='practice')=>controller.prepare({key,render(){commits++;host.innerHTML='<div class="page-heading">Readable heading</div><section class="surface">Usable contents <button>Choose</button></section>';}});
  const clock=()=>animations.findLast(item=>item.target?.value===0);
  t.after(()=>{controller.destroy();dom.window.close();});
  return {dom,doc,host,controller,animations,prepare,clock,get commits(){return commits;},get ready(){return ready;}};
}

test('each module prepares a distinct presentation but starts its buffer only after the shell opens',t=>{
  for(const key of ['check','contacts','practice','history','report']){
    const f=fixture(t);f.prepare(key);
    assert.equal(f.commits,0);assert.equal(f.controller.pending,true);assert.equal(f.host.getAttribute('aria-busy'),'true');
    assert.ok(f.host.querySelector(`.entry-${key}`));assert.ok(f.host.querySelector('[data-entry-skip]'));
    assert.equal(f.animations.length,0,'preparation must not consume the visible animation behind shell geometry');
    assert.doesNotMatch(f.host.textContent,/%|正在检测|模型/);
    f.controller.start();assert.ok(f.host.querySelector('.is-playing'));assert.equal(f.clock().params.duration,700);
    const clock=f.clock();clock.params.onComplete();
    assert.equal(f.commits,1);assert.equal(f.ready,1);assert.equal(f.controller.pending,false);assert.equal(f.host.getAttribute('aria-busy'),null);
    clock.params.onComplete();assert.equal(f.commits,1);f.controller.finish();assert.equal(f.host.querySelector('.page-heading').style.opacity,'');
  }
});

test('mobile is shorter and skip replaces the intro immediately without accepting stale callbacks',t=>{
  const f=fixture(t,{width:390});f.prepare();f.controller.start();const clock=f.clock();assert.equal(clock.params.duration,500);
  f.host.querySelector('[data-entry-skip]').click();assert.equal(f.commits,1);assert.equal(f.host.querySelector('.workspace-entry'),null);
  clock.params.onComplete();assert.equal(f.commits,1);
  const button=f.host.querySelector('button');button.dispatchEvent(new f.dom.window.Event('pointerdown',{bubbles:true}));
  assert.equal(f.host.querySelector('.page-heading').style.opacity,'','first interaction restores all staged content');
});

test('Rare UI mounts after visible start and unmounts before the vanilla render replaces its host',t=>{
  let mounted=0,destroyed=0,slot;
  const f=fixture(t,{islands:{mountStatus(host,props){mounted++;slot=host;assert.match(props.label,/情景练习/);return {update(){},destroy(){assert.equal(host.isConnected,true);destroyed++;}};}}});
  f.controller.prepare({key:'practice',render(){assert.equal(destroyed,1);f.host.innerHTML='<h2>Question</h2>';}});
  assert.equal(mounted,0);f.controller.start();assert.equal(mounted,1);f.controller.refreshIslands();assert.equal(mounted,1);
  f.controller.finish();assert.equal(slot.isConnected,false);assert.equal(destroyed,1);f.controller.cancel();assert.equal(destroyed,1);
});

test('pause and hidden tabs settle one complete view; cancellation and destroy never repaint a later route',t=>{
  const f=fixture(t);f.prepare();f.controller.start();let old=f.clock();f.controller.setPaused(true);assert.equal(f.commits,1);old.params.onComplete();assert.equal(f.commits,1);
  f.prepare('contacts');f.controller.start();Object.defineProperty(f.doc,'hidden',{value:true,configurable:true});f.doc.dispatchEvent(new f.dom.window.Event('visibilitychange'));assert.equal(f.commits,2);
  Object.defineProperty(f.doc,'hidden',{value:false,configurable:true});f.prepare('history');f.controller.start();old=f.clock();f.controller.cancel();f.host.textContent='Different route';old.params.onComplete();assert.equal(f.host.textContent,'Different route');assert.equal(f.commits,2);
  f.prepare();f.controller.start();old=f.clock();f.controller.destroy();f.host.textContent='Destroyed';old.params.onComplete();assert.equal(f.host.textContent,'Destroyed');
});

test('reduced motion, missing drivers and driver errors expose usable contents without waiting',t=>{
  const reduced=fixture(t,{enabled:false});reduced.prepare();assert.equal(reduced.commits,1);assert.equal(reduced.animations.length,0);
  const failure=fixture(t,{throwing:true});failure.prepare();failure.controller.start();assert.equal(failure.commits,1);assert.equal(failure.host.querySelector('.page-heading').style.opacity,'');
  const bare=fixture(t);const controller=createWorkspaceIntro({host:bare.host});let calls=0;controller.prepare({key:'check',render(){calls++;}});assert.equal(calls,1);controller.destroy();
});

test('a missing completion callback is bounded and an async old view cannot animate the next route',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture(t);f.prepare();f.controller.start();t.mock.timers.tick(949);assert.equal(f.commits,0);t.mock.timers.tick(1);assert.equal(f.commits,1);
  let resolve;const response=new Promise(r=>{resolve=r;});f.controller.prepare({key:'history',render(){f.host.innerHTML='<p>Reading history</p>';return response;}});f.controller.start();f.controller.finish();
  f.controller.cancel();f.host.textContent='New page';const animationCount=f.animations.length;resolve();await Promise.resolve();await Promise.resolve();assert.equal(f.host.textContent,'New page');assert.equal(f.animations.length,animationCount);
});

test('real Anime keeps the module buffer visible, then commits and smoothly reveals readable sections',async t=>{
  const dom=new JSDOM('<main id="content"></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main'),previous=new Map();
  for(const key of ['window','document','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key],configurable:true,writable:true});
  }
  const {animate,engine}=await import('animejs');let committed=0;const animations=[];
  const controller=createWorkspaceIntro({host,animate(target,params){const animation=animate(target,params);animations.push({target,animation});return animation;}});
  t.after(()=>{controller.destroy();engine.pause();w.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  controller.prepare({key:'practice',render(){committed++;host.innerHTML='<div class="page-heading">Question ready</div><div class="practice-stage"><section class="surface">Three answers</section></div>';}});
  assert.equal(animations.length,0);controller.start();const clock=animations.find(item=>item.target?.value===0).animation;
  clock.pause();clock.seek(350);assert.equal(committed,0);assert.ok(host.querySelector('.entry-tickets'));assert.equal(host.querySelector('.practice-stage'),null);
  clock.seek(700);assert.equal(committed,1);assert.equal(host.querySelector('.workspace-entry'),null);
  const heading=host.querySelector('.page-heading'),headingAnimation=animations.find(item=>item.target===heading).animation;
  headingAnimation.pause();headingAnimation.seek(150);assert.ok(+heading.style.opacity>0&&+heading.style.opacity<1);assert.doesNotMatch(heading.style.transform,/NaN/);
  controller.finish();assert.equal(heading.style.opacity,'');assert.equal(heading.style.transform,'');
});

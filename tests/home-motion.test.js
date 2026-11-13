import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createHomeMotion} from '../src/home-motion.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const managed='.site-header,.edition,.home-line-original,.intro-copy>p,.intro-coordinate,#sculptureAnchor,.portal-node,.portal-content,.core-controller,.stage-index,.home-bottom,.site-footer,.art-caption';
function setup(t,{hash='',enabled=true,throwing=false,missingBoot=false,bootFinished=false}={}){
  const dom=new JSDOM(html,{url:'https://qinan.test/'+hash,pretendToBeVisual:true}),doc=dom.window.document;
  if(missingBoot)doc.querySelector('#boot').remove();else doc.querySelector('#boot').hidden=bootFinished;
  const calls=[],progress=[];
  const createTimeline=options=>{
    if(throwing)throw new Error('animation unavailable');
    const entry={options,cancelled:false,add(){return entry;},play(){},cancel(){entry.cancelled=true;}};calls.push(entry);return entry;
  };
  const controller=createHomeMotion({root:doc,createTimeline,visual:{setEntranceProgress(value){progress.push(value);}},motionEnabled:()=>enabled});
  t.after(()=>{controller.destroy();dom.window.close();});
  return {dom,doc,controller,calls,progress};
}
function assertSettled(doc,progress){
  assert.equal(doc.documentElement.classList.contains('home-prepared'),false);
  assert.equal(doc.documentElement.classList.contains('home-arriving'),false);
  assert.equal(doc.querySelectorAll('.home-word-scan,.home-line-slice,.portal-arrival-marker').length,0);
  for(const node of doc.querySelectorAll(managed)){
    assert.notEqual(node.style.opacity,'0',node.className+' is visible');assert.equal(node.style.clipPath,'');
  }
  assert.equal(progress.at(-1),1);
}
function start(controller,doc,options){controller.prepare();doc.querySelector('#boot').hidden=true;controller.play(options);}

test('prepare hides the complete homepage and the entire card before boot finishes',t=>{
  const {controller,doc,progress,calls}=setup(t);
  assert.equal(controller.prepare(),true);
  assert.equal(controller.active,true);assert.equal(calls.length,0,'preparing does not start an entrance timeline');
  for(const node of doc.querySelectorAll('.site-header,.home-line-original,.portal-node,.core-controller,.home-bottom,.site-footer'))assert.equal(node.style.opacity,'0');
  assert.equal(progress.at(-1),0,'the real scene is also held behind the poster');
  assert.equal(doc.querySelector('.portal-content').style.opacity,'','a parent mask hides the card border and pseudo-elements together');
  assert.equal(controller.prepare(),false,'preparing twice cannot capture hidden styles as the original state');
  controller.finish();assertSettled(doc,progress);
});

test('finite entrance removes its inaccessible word-light copy and restores every layer on navigation',t=>{
  const {doc,dom,controller,calls,progress}=setup(t);
  start(controller,doc,{variant:'first',reason:'ready'});
  assert.equal(calls.length,1);const scan=doc.querySelector('.home-word-scan');assert.ok(scan);
  assert.equal(scan.textContent,'核实');assert.equal(scan.getAttribute('aria-hidden'),'true');assert.ok(scan.hasAttribute('inert'));assert.equal(scan.querySelector('[id]'),null);
  dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  assert.equal(calls[0].cancelled,true);assertSettled(doc,progress);
  controller.play();assert.equal(calls.length,1,'returning home does not replay the entrance');
  calls[0].options.onComplete();assertSettled(doc,progress);
});

test('skip, timeout, reduced motion, deep links and an unavailable engine expose complete text',t=>{
  for(const [options,reason] of [[{},'skip'],[{},'timeout'],[{enabled:false},'ready'],[{hash:'#practice'},'ready'],[{throwing:true},'ready'],[{missingBoot:true},'ready'],[{bootFinished:true},'ready']]){
    const {controller,doc,progress}=setup(t,options);controller.prepare();controller.play({reason});assertSettled(doc,progress);
  }
});

test('interruption while prepared cannot be undone by a late boot completion',t=>{
  const {controller,doc,dom,progress,calls}=setup(t);
  controller.prepare();dom.window.dispatchEvent(new dom.window.Event('resize'));assertSettled(doc,progress);
  controller.play({reason:'ready'});assert.equal(calls.length,0);assertSettled(doc,progress);
});

test('preparation deadline fails open even if boot completion never reaches the controller',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {controller,doc,progress,calls}=setup(t);
  controller.prepare();t.mock.timers.tick(4999);assert.equal(doc.querySelector('.portal-node').style.opacity,'0');
  t.mock.timers.tick(1);assertSettled(doc,progress);
  controller.play();assert.equal(calls.length,0);
});

test('keyboard focus and pointer input restore the complete page before the target handler',t=>{
  for(const type of ['focusin','pointerdown','pointermove']){
    const {controller,doc,dom,progress,calls}=setup(t);start(controller,doc);
    const portal=doc.querySelector('.portal-node');let visibleInTarget=false;
    portal.addEventListener(type,()=>{visibleInTarget=portal.style.opacity!=='0'&&portal.style.transform==='';});
    portal.dispatchEvent(new dom.window.Event(type,{bubbles:true}));
    assert.equal(visibleInTarget,true,type+' is settled in the capture phase');assert.equal(calls[0].cancelled,true);assertSettled(doc,progress);
  }
});

test('manual pause restores authored styles and hidden-tab interruption releases all masks',t=>{
  const {controller,doc,dom,progress,calls}=setup(t);
  const line=doc.querySelector('.home-line-original');line.style.transform='translateY(0px)';
  const header=doc.querySelector('.site-header');header.style.opacity='.8';
  start(controller,doc);controller.setPaused(true);
  assert.equal(line.style.transform,'translateY(0px)');assert.equal(header.style.opacity,'0.8');
  assert.equal(calls[0].cancelled,true);assertSettled(doc,progress);
  const other=setup(t);other.controller.prepare();
  Object.defineProperty(other.doc,'hidden',{value:true,configurable:true});other.doc.dispatchEvent(new other.dom.window.Event('visibilitychange'));
  assertSettled(other.doc,other.progress);
});

test('an optional scene failure cannot prevent visible DOM recovery',t=>{
  const dom=new JSDOM(html,{url:'https://qinan.test/',pretendToBeVisual:true}),doc=dom.window.document;
  const controller=createHomeMotion({root:doc,createTimeline(){throw new Error('engine unavailable');},visual:{setEntranceProgress(){throw new Error('context lost');}}});
  t.after(()=>{controller.destroy();dom.window.close();});
  assert.equal(controller.prepare(),true);assert.doesNotThrow(()=>controller.play());
  assert.equal(controller.active,false);
  for(const node of doc.querySelectorAll(managed))assert.notEqual(node.style.opacity,'0');
});

test('real Anime reveals title first and whole cards later, then fully releases the entrance',async t=>{
  const dom=new JSDOM(html,{url:'https://qinan.test/',pretendToBeVisual:true}),w=dom.window,previous=new Map();
  for(const key of ['window','document','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key],configurable:true,writable:true});
  }
  const {createTimeline,engine}=await import('animejs');let timeline;const progress=[];
  const controller=createHomeMotion({root:w.document,createTimeline(options){timeline=createTimeline(options);return timeline;},visual:{setEntranceProgress(value){progress.push(value);}}});
  t.after(()=>{controller.destroy();engine.pause();w.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  controller.prepare();assert.equal(timeline,undefined);w.document.querySelector('#boot').hidden=true;controller.play({variant:'first',reason:'ready'});
  const deadline=Date.now()+1500;
  while((!timeline||timeline.currentTime===0)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(timeline?.currentTime>0,'the actual timeline starts');timeline.pause();timeline.seek(200);
  const line=w.document.querySelector('.home-line-original'),cards=[...w.document.querySelectorAll('.portal-node')];
  assert.ok(Number(line.style.opacity)>0&&Number(line.style.opacity)<1,'title is entering');
  assert.equal(cards[0].style.opacity,'0','card surface remains absent until its beat');
  assert.ok(progress.some(value=>value>0&&value<1),'the scene follows the entrance');
  timeline.seek(500);assert.ok(Number(cards[0].style.opacity)>0&&Number(cards[0].style.opacity)<1,'complete card surface enters');assert.equal(cards[3].style.opacity,'0');
  const scan=w.document.querySelector('.home-word-scan');assert.ok(scan.style.clipPath.includes('polygon'));assert.doesNotMatch(scan.style.clipPath,/NaN/);
  timeline.seek(900);assert.ok(Number(cards[3].style.opacity)>.9);assert.ok(line.textContent.includes('核实'));
  timeline.seek(1050);assertSettled(w.document,progress);
  const content=cards[0].getAttribute('style');await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(cards[0].getAttribute('style'),content,'completion never writes a new transform or opacity');
});

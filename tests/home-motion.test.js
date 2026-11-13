import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createHomeMotion} from '../src/home-motion.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function setup(t,{hash='',enabled=true,throwing=false}={}){
  const dom=new JSDOM(html,{url:'https://qinan.test/'+hash,pretendToBeVisual:true}),doc=dom.window.document;
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
  assert.equal(doc.documentElement.classList.contains('home-arriving'),false);
  assert.equal(doc.querySelectorAll('.home-line-slice,.portal-arrival-marker').length,0);
  for(const node of doc.querySelectorAll('.home-line-original,.portal-content,.title-period')){
    assert.notEqual(node.style.opacity,'0');assert.equal(node.style.clipPath,'');
  }
  assert.equal(progress.at(-1),1);
}

test('home entrance is finite and cleans its temporary text copies on navigation',t=>{
  const {doc,dom,controller,calls,progress}=setup(t);
  controller.play({variant:'first',reason:'ready'});
  assert.equal(calls.length,1);assert.ok(doc.querySelector('.home-line-slice'));
  for(const copy of doc.querySelectorAll('.home-line-slice')){
    assert.equal(copy.getAttribute('aria-hidden'),'true');assert.equal(copy.querySelector('[id]'),null);
  }
  dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  assert.equal(calls[0].cancelled,true);assertSettled(doc,progress);
  controller.play();assert.equal(calls.length,1,'returning home does not replay the first entrance');
  calls[0].options.onComplete();assertSettled(doc,progress);
});

test('skip, reduced motion, a deep link and an unavailable animation engine expose complete text',t=>{
  for(const [options,reason] of [[{},'skip'],[{},'timeout'],[{enabled:false},'ready'],[{hash:'#practice'},'ready'],[{throwing:true},'ready']]){
    const {controller,doc,progress}=setup(t,options);controller.play({reason});assertSettled(doc,progress);
  }
});

test('manual pause restores existing styles and releases every decorative layer',t=>{
  const {controller,doc,progress,calls}=setup(t);
  const line=doc.querySelector('.home-line-original');line.style.setProperty('transform','translateY(0px)','important');
  controller.play();controller.setPaused(true);
  assert.equal(line.style.getPropertyValue('transform'),'translateY(0px)');
  assert.equal(calls[0].cancelled,true);assertSettled(doc,progress);
});

test('real Anime reveals readable home text and drives the scene before completing',async t=>{
  const dom=new JSDOM(html,{url:'https://qinan.test/',pretendToBeVisual:true}),w=dom.window,previous=new Map();
  for(const key of ['window','document','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key],configurable:true,writable:true});
  }
  const {createTimeline,engine}=await import('animejs');let timeline;const progress=[];
  const controller=createHomeMotion({root:w.document,createTimeline(options){timeline=createTimeline(options);return timeline;},visual:{setEntranceProgress(value){progress.push(value);}}});
  t.after(()=>{controller.destroy();engine.pause();w.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  controller.play({variant:'first',reason:'ready'});
  const deadline=Date.now()+1500;
  while((!timeline||timeline.currentTime===0)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(timeline?.currentTime>0,'the actual timeline starts');timeline.pause();timeline.seek(650);
  assert.ok(progress.some(value=>value>0&&value<1),'the scene shares the entrance progress');
  const line=w.document.querySelector('.home-line-original');
  assert.ok(line.textContent.includes('核实'));assert.doesNotMatch(line.style.transform,/NaN/);
  assert.notEqual(line.style.clipPath,'inset(100% 0 0 0)');
  timeline.seek(1250);assertSettled(w.document,progress);
  const content=w.document.querySelector('.portal-content').getAttribute('style');
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(w.document.querySelector('.portal-content').getAttribute('style'),content,'completed entrance never remasks a usable portal');
});

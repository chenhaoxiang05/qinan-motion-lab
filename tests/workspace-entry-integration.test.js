import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initApp} from '../src/app.js';

test('real Anime completes the visible module intro before exposing quiz controls and cancels it on close',async t=>{
  const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://qinan.test/',pretendToBeVisual:true});
  const w=dom.window,prior=new Map(),errors=[];
  const keys=['window','document','location','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
  for(const key of keys){prior.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key],configurable:true,writable:true});}
  prior.set('innerWidth',Object.getOwnPropertyDescriptor(globalThis,'innerWidth'));Object.defineProperty(globalThis,'innerWidth',{value:1440,configurable:true,writable:true});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.fetch=()=>Promise.reject(new TypeError('offline'));w.addEventListener('error',event=>errors.push(event.error));
  const {animate,utils,createSpring,engine}=await import('animejs'),animations=[];
  const app=initApp({animate(target,params){
    const record={target,params,done:false,animation:null};animations.push(record);
    record.animation=animate(target,{...params,onComplete(){record.done=true;params.onComplete?.();}});record.animation.pause();return record.animation;
  },utils,createSpring,visual:{pause(){},resume(){},focus(){},dispose(){},async toggleForm(){return 'shield';}}});
  t.after(()=>{app.destroy();engine.pause();w.close();for(const [key,descriptor] of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}assert.deepEqual(errors,[]);});
  const $=selector=>w.document.querySelector(selector),tick=()=>new Promise(resolve=>setTimeout(resolve,8));
  const finishShell=()=>{
    for(let count=0;count<4&&!$('.workspace-entry.is-playing');count++){
      const phase=animations.findLast(record=>!record.done&&[90,220,240,520].includes(record.params.duration));
      assert.ok(phase,'an opening shell phase exists before the module intro');phase.animation.complete();
    }
    assert.ok($('.workspace-entry.is-playing'));
  };
  $('.node-practice').click();await tick();
  assert.ok($('.workspace-entry'));assert.equal($('.workspace-entry.is-playing'),null);assert.equal($('#questionTitle'),null);
  finishShell();
  const clock=animations.findLast(record=>record.params.duration===700&&record.target?.value===0);
  assert.ok(clock);assert.equal($('#workspaceBody').style.opacity,'1');assert.equal($('#workspace').classList.contains('is-transitioning'),false);
  clock.animation.seek(350);assert.equal($('#questionTitle'),null);assert.equal($('#practiceDock'),null);
  clock.animation.complete();
  assert.ok($('#questionTitle'));assert.equal(w.document.querySelectorAll('[data-answer]').length,3);assert.ok($('#practiceDock'));assert.equal($('#nextQuestion').disabled,true);
  $('[data-answer="1"]').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));$('[data-answer="1"]').click();
  assert.ok($('#feedback'));const exits=animations.filter(record=>record.params.duration===360&&!record.done);for(const record of exits)record.animation.complete();
  assert.equal($('#nextQuestion').disabled,false,'answered content becomes actionable after its own exit animation');
  w.location.hash='contacts';await tick();assert.ok($('.entry-contacts'));
  const cancelled=animations.findLast(record=>record.params.duration===700&&record.target?.value===0);
  $('#closeWorkspace').click();await tick();assert.equal($('#workspaceBackdrop').classList.contains('is-visible'),false);
  cancelled.params.onComplete?.();cancelled.animation.complete();assert.equal($('#contactForm'),null,'the old intro cannot commit during return');
  for(let count=0;count<3&&$('#workspace').open;count++){
    const phase=animations.findLast(record=>!record.done&&[90,200,460].includes(record.params.duration));assert.ok(phase);phase.animation.complete();
  }
  assert.equal($('#workspace').open,false);assert.equal($('#workspaceBody').children.length,0);
});

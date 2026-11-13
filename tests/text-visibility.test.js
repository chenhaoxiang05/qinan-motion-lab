import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initApp} from '../src/app.js';

// Regression for answer -> close -> reopen: the old window layout snapshot restored
// a nested feedback opacity captured during its own entrance animation.
test('an answered quiz reopens with visible feedback and never replays its local entrance',async t=>{
  const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://qinan.test/',pretendToBeVisual:true});
  const w=dom.window,keys=['window','document','location','innerWidth','URL','File','Blob','FormData'];
  const prior=new Map(keys.map(key=>[key,globalThis[key]]));
  for(const key of keys)globalThis[key]=key==='innerWidth'?1440:w[key];
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.fetch=()=>Promise.reject(new TypeError('offline'));
  const feedbackEnters=[],layoutRoots=[];
  const app=initApp({entryDuration:0,
    animate(target,params){
      if(target?.id==='feedback'){
        target.style.opacity='0';const pending={cancel(){pending.cancelled=true;}};feedbackEnters.push(pending);return pending;
      }
      params.onComplete?.();return {cancel(){},pause(){},resume(){},complete(){params.onComplete?.();}};
    },
    createLayout(root){layoutRoots.push(root);return {revert(){},update(change,params){change();params.onComplete();return {complete(){},cancel(){}};}};},
    createSpring:()=> 'linear',utils:{remove(){}},visual:{pause(){},resume(){},focus(){},dispose(){},async toggleForm(){return 'shield';}},
  });
  t.after(()=>{app.destroy();w.close();for(const [key,value] of prior)globalThis[key]=value;});
  const $=selector=>w.document.querySelector(selector),tick=()=>new Promise(resolve=>setTimeout(resolve,12));
  $('.node-practice').click();await tick();
  $('[data-answer="0"]').click();assert.equal(feedbackEnters.length,1);assert.equal($('#feedback').style.opacity,'0');
  $('#closeWorkspace').click();await tick();assert.equal(feedbackEnters[0].cancelled,true);
  $('.node-practice').click();await tick();
  assert.equal(feedbackEnters.length,1,'restored answers must not animate from invisible');
  assert.ok($('#feedback').textContent.length>20);assert.equal(w.getComputedStyle($('#feedback')).opacity,'1');
  assert.equal($('#workspaceBody').style.opacity,'1');assert.equal($('#workspace').open,true);
  assert.ok(layoutRoots.length>=2);assert.ok(layoutRoots.every(root=>root.classList.contains('quiz-progress')),'only quiz progress uses layout snapshots');
});

test('auxiliary modals recover from interrupted entrances, pause, animation failure and destroy',t=>{
  const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://qinan.test/',pretendToBeVisual:true});
  const w=dom.window,keys=['window','document','location','innerWidth','URL','File','Blob','FormData'];
  const prior=new Map(keys.map(key=>[key,globalThis[key]]));
  for(const key of keys)globalThis[key]=key==='innerWidth'?1440:w[key];
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.fetch=()=>Promise.reject(new TypeError('offline'));
  const entrances=[],errors=[];let failNext=false;
  w.addEventListener('error',event=>errors.push(event.error));
  const app=initApp({entryDuration:0,
    animate(target,params){
      if(target?.id==='modal'){
        target.style.opacity='.12';target.style.transform='translateY(12px) scale(.96)';
        if(failNext){failNext=false;throw new Error('injected modal animation failure');}
        const animation={params,cancel(){animation.cancelled=true;}};entrances.push(animation);return animation;
      }
      params.onComplete?.();return {cancel(){},pause(){},resume(){},complete(){params.onComplete?.();}};
    },
    createSpring:()=> 'linear',utils:{remove(){}},visual:{pause(){},resume(){},focus(){},dispose(){},async toggleForm(){return 'shield';}},
  });
  let destroyed=false;
  t.after(()=>{if(!destroyed)app.destroy();w.close();for(const [key,value] of prior)globalThis[key]=value;});
  const $=selector=>w.document.querySelector(selector),modal=$('#modal');
  const visible=()=>{assert.equal(modal.open,true);assert.equal(modal.style.opacity,'1');assert.equal(modal.style.transform,'none');assert.ok($('#modalBody').textContent.length>10);};
  $('#settings').click();assert.equal(modal.style.opacity,'0.12');
  $('#closeModal').click();assert.equal(entrances[0].cancelled,true);assert.equal(modal.style.opacity,'1');
  $('#motionButton').click();$('#settings').click();visible();assert.equal(entrances.length,1,'paused reopen does not restart the entrance');
  $('#toggleMotion').click();$('#closeModal').click();$('#settings').click();assert.equal(entrances.length,2);
  $('#toggleMotion').click();visible();assert.equal(entrances[1].cancelled,true,'pausing during entrance settles the modal');
  entrances[0].params.onComplete();visible();
  $('#closeModal').click();$('#motionButton').click();failNext=true;$('#settings').click();visible();assert.deepEqual(errors,[]);
  $('#closeModal').click();$('#settings').click();const last=entrances.at(-1);
  app.destroy();destroyed=true;assert.equal(modal.open,false);assert.equal(last.cancelled,true);assert.equal(modal.style.opacity,'1');assert.equal(modal.style.transform,'none');
});

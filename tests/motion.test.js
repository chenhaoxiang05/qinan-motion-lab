import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initApp} from '../src/app.js';

test('the real Anime.js engine opens, pauses and switches types without replaying the window animation', async t=>{
  const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://qinan.test/',pretendToBeVisual:true});
  const w=dom.window;
  for(const key of ['window','document','location','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=typeof w[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key];
  globalThis.innerWidth=1440;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.fetch=()=>Promise.reject(new TypeError('offline'));
  const {animate,utils,createSpring,engine}=await import('animejs');
  const app=initApp({animate,utils,createSpring,visual:{pause(){},resume(){},focus(){},burst(){return true;},dispose(){}}});
  t.after(()=>{app.destroy();engine.pause();w.close();});
  const $=s=>w.document.querySelector(s);
  $('#motionButton').click();
  w.location.hash='check';await new Promise(r=>setTimeout(r,40));
  assert.equal($('#workspace').open,true);assert.equal($('#workspace').style.opacity,'1');
  $('#type-image').click();const panel=$('#uploadPanel');
  $('#type-video').click();assert.strictEqual($('#uploadPanel'),panel);assert.equal($('#workspace').style.opacity,'1');
  $('#settings').click();$('#toggleMotion').click();$('#settingsDone').click();
  $('#backHome').click();await new Promise(r=>setTimeout(r,300));assert.equal($('#workspace').open,false);
  w.location.hash='contacts';await new Promise(r=>setTimeout(r,650));
  assert.equal($('#workspace').open,true);assert.ok(Number($('#workspace').style.opacity)>.99);assert.ok($('#contactForm'));
});

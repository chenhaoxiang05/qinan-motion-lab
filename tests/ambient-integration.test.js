import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';

const base=fileURLToPath(new URL('../',import.meta.url));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Bundle the real entry point, Anime and React for each browser lifecycle. Only
// platform APIs absent in JSDOM are supplied; application controllers stay real.
async function mountMain({rejectScene=false}={}) {
  const directory=await mkdtemp(join(base,'node_modules/.ambient-integration-'));
  const output=join(directory,'main.mjs');
  const errors=[],orphans=[],requests=[],prior=new Map();
  const virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(await readFile(join(base,'index.html'),'utf8'),{
    url:'https://qinan.test/',pretendToBeVisual:true,virtualConsole,
  });
  const w=dom.window,doc=w.document;
  const $=selector=>doc.querySelector(selector);
  const install=(name,value)=>{
    prior.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  };
  const originalError=console.error;
  console.error=(...args)=>{
    // Three emits this before its actual createSanctuary SVG fallback.
    if(!String(args[0]).startsWith('THREE.WebGLRenderer:'))errors.push(args.map(String).join(' '));
  };
  let exposed,destroyed=false;
  const destroy=()=>{if(!destroyed){destroyed=true;exposed?.app.destroy();exposed?.engine.pause();}};
  async function cleanup() {
    try{destroy();await wait(30);}
    finally{
      w.close();console.error=originalError;
      for(const [name,descriptor] of prior){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
      await rm(directory,{recursive:true,force:true});
    }
  }
  try{
    for(const name of ['window','document','HTMLElement','HTMLDialogElement','HTMLInputElement','SVGElement','Element','Node','NodeList','HTMLCollection','Image','screen','navigator','location','localStorage','sessionStorage','File','Blob','FormData','Event','MouseEvent','CustomEvent'])install(name,w[name]);
    install('innerWidth',1440);install('innerHeight',900);w.innerWidth=1440;w.innerHeight=900;
    for(const name of ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])install(name,w[name].bind(w));
    install('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});w.ResizeObserver=globalThis.ResizeObserver;
    const mediaListeners=new Set();
    const media={matches:false,addEventListener(type,callback){if(type==='change')mediaListeners.add(callback);},removeEventListener(type,callback){mediaListeners.delete(callback);},addListener(){},removeListener(){}};
    w.matchMedia=()=>media;
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    w.HTMLDialogElement.prototype.close=function(){this.open=false;};
    w.HTMLMediaElement.prototype.load=function(){};
    let objectUrl=0;w.URL.createObjectURL=()=>`blob:qinan-test/${++objectUrl}`;w.URL.revokeObjectURL=()=>{};install('URL',w.URL);
    w.HTMLElement.prototype.scrollIntoView=function(){};
    w.HTMLCanvasElement.prototype.getContext=()=>null;
    // These rectangles only let native-dialog transitions run; no layout or
    // visual result is inferred from the test browser's synthetic geometry.
    const rect=(left,top,width,height)=>({x:left,y:top,left,top,width,height,right:left+width,bottom:top+height,toJSON(){return this;}});
    w.HTMLElement.prototype.getBoundingClientRect=function(){
      if(this.classList.contains('portal-node'))return rect(80,560,260,210);
      if(this.classList.contains('workspace-surface'))return rect(120,70,1200,760);
      if(this.id==='sculptureAnchor')return rect(780,130,440,440);
      return rect(120,100,500,60);
    };
    w.fetch=async url=>{requests.push(String(url));throw new Error(`Unexpected network request: ${url}`);};
    w.addEventListener('error',event=>errors.push(String(event.error||event.message)));
    const innerHTML=Object.getOwnPropertyDescriptor(w.Element.prototype,'innerHTML');
    const recordReplacement=host=>{
      const active=host.querySelectorAll('.rare-island');
      const count=active.length+(host.classList?.contains('rare-island')?1:0);
      if(count)orphans.push({host:host.id||host.className,count});
    };
    Object.defineProperty(w.Element.prototype,'innerHTML',{...innerHTML,set(value){recordReplacement(this);innerHTML.set.call(this,value);}});
    const replaceChildren=w.Element.prototype.replaceChildren;
    w.Element.prototype.replaceChildren=function(...nodes){recordReplacement(this);return replaceChildren.apply(this,nodes);};
    for(const file of ['background-layer.css','portal-motion.css','interaction-feedback.css']){
      const style=doc.createElement('style');style.textContent=await readFile(join(base,`src/${file}`),'utf8');doc.head.append(style);
    }
    install('__ambientIntegration',undefined);
    await build({
      entryPoints:[join(base,'src/main.js')],bundle:true,format:'esm',platform:'browser',outfile:output,
      loader:{'.css':'empty'},define:{'import.meta.env.VITE_API_BASE_URL':'"/api"','import.meta.hot':'undefined','process.env.NODE_ENV':'"development"'},
      plugins:[{name:'actual-main-harness',setup(builder){
        builder.onLoad({filter:/\/src\/main\.js$/},async args=>({
          contents:(await readFile(args.path,'utf8'))+'\nimport {engine as testEngine} from "animejs"; globalThis.__ambientIntegration={app,boot,homeMotion,ambient,portalMotion,islands,engine:testEngine};',loader:'js',
        }));
        if(rejectScene){
          builder.onResolve({filter:/^\.\/scene\.js$/},args=>args.importer.endsWith('/src/main.js')?{path:'optional-scene',namespace:'failed-scene'}:undefined);
          builder.onLoad({filter:/.*/,namespace:'failed-scene'},()=>({contents:'throw new Error("Optional scene chunk unavailable");',loader:'js'}));
        }
      }}],logLevel:'silent',
    });
    await import(pathToFileURL(output).href);
    exposed=globalThis.__ambientIntegration;
    const until=async(condition,label,timeout=4500)=>{
      const deadline=Date.now()+timeout;
      while(Date.now()<deadline){if(condition())return;await wait(15);}
      assert.fail(`Timed out waiting for ${label}; route=${w.location.hash}; ambient=${$('.stage-background')?.dataset.ambientState}; errors=${errors.join('; ')}`);
    };
    const pointer=(x,y=.3,target=w)=>target.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:x*w.innerWidth,clientY:y*w.innerHeight}));
    const setHidden=value=>{Object.defineProperty(doc,'hidden',{value,configurable:true});doc.dispatchEvent(new w.Event('visibilitychange'));};
    const setReduced=value=>{media.matches=value;for(const callback of [...mediaListeners])callback({matches:value});};
    return {w,doc,$,exposed,errors,orphans,requests,until,pointer,setHidden,setReduced,destroy,cleanup};
  }catch(error){await cleanup();throw error;}
}

function assertEnvironment(harness,state) {
  const {$,w}=harness,host=$('.stage-background');
  assert.equal(host.dataset.ambientMounted,'true');
  assert.equal(host.dataset.ambientState,state);
  assert.equal(host.querySelectorAll('.ambient-light').length,2);
  assert.equal(host.querySelectorAll('.ambient-light-fill').length,2);
  assert.equal(host.querySelector('svg,canvas,.ambient-stream,.ambient-matrix-slot'),null,'only the two corner fields remain');
  assert.match(w.getComputedStyle(host).getPropertyValue('--ambient-light-art'),/radial-gradient/,'colour is owned by the independent DOM environment');
  for(const node of host.querySelectorAll('.ambient-sway,.ambient-light-fill'))assert.equal(w.getComputedStyle(node).animationPlayState,state==='paused'?'paused':'');
}

function assertPortalLoops({$,doc,w},state) {
  assert.equal(doc.documentElement.dataset.portalMotion,state);
  assert.equal(doc.querySelectorAll('[data-portal-icon] .portal-icon-svg').length,4);
  const parts=[...doc.querySelectorAll('.portal-icon-svg .portal-motion-part')];
  assert.ok(parts.length>=4);
  for(const part of parts)assert.equal(w.getComputedStyle(part).animationPlayState,state);
  assert.ok($('.title-rule-shine'),'the complete title rule retains a separate decorative shine');
}

async function assertFrozen(harness) {
  const {$,pointer}=harness,host=$('.stage-background');
  assertEnvironment(harness,'paused');assertPortalLoops(harness,'paused');
  const position=host.style.getPropertyValue('--ambient-rotation');
  pointer(.05,.9);await wait(75);
  assert.equal(host.style.getPropertyValue('--ambient-rotation'),position,'paused state cancels in-flight Anime and ignores new pointer motion');
}

async function assertPointerRuns(harness,x) {
  const {$,pointer,until}=harness,host=$('.stage-background');
  assertEnvironment(harness,'running');assertPortalLoops(harness,'running');
  const before=host.style.getPropertyValue('--ambient-rotation');
  pointer(x);
  await until(()=>host.style.getPropertyValue('--ambient-rotation')!==before,'real Anime pointer interpolation');
}

test('actual main releases the independent environment after boot and coordinates real Anime, Gooey upload and React cleanup',async t=>{
  const h=await mountMain();t.after(h.cleanup);
  const {$,w,doc,exposed,until}=h;
  await until(()=>typeof exposed.islands.mountUpload==='function','real React adapters');
  assertEnvironment(h,'paused');assertPortalLoops(h,'paused');
  assert.equal(doc.documentElement.dataset.sceneRenderer,'fallback');
  assert.ok($('.scene-fallback'),'actual Three construction failure renders the SVG core');
  assert.equal($('.scene-fallback').contains($('.stage-background')),false,'the environment is outside the optional scene');
  const shine=$('.title-rule-shine');
  assert.equal(shine.textContent,'');assert.equal(shine.getAttribute('aria-hidden'),'true');
  const result=await exposed.boot.finished;
  assert.equal(result.reason,'ready','exercise the complete boot, not its skip path');
  await until(()=>!exposed.homeMotion.active&&$('.stage-background').dataset.ambientState==='running','home entrance releases ambient');
  assert.equal($('#boot').hidden,true);
  assert.equal($('.title-rule-shine'),shine,'home entrance preserves the existing decorative rule');
  assert.equal(doc.querySelectorAll('.title-rule-shine').length,1);assert.equal($('.home-word-scan'),null);
  assert.equal($('.intro-copy h1').textContent,'先核实，再放心。');
  assert.equal($('.home-stage').hasAttribute('inert'),false);
  await assertPointerRuns(h,.9);
  h.pointer(.8,.7,$('.node-check'));
  assert.equal($('.stage-background').hasAttribute('data-active-portal'),false,'portal feedback does not recreate the corner field');
  assertEnvironment(h,'running');
  $('.node-check').dispatchEvent(new w.Event('pointerleave'));
  assert.equal($('.stage-background').hasAttribute('data-active-portal'),false);

  $('#motionButton').click();await assertFrozen(h);
  $('#motionButton').click();await assertPointerRuns(h,.15);
  h.setHidden(true);await assertFrozen(h);
  h.setHidden(false);await assertPointerRuns(h,.85);
  h.setReduced(true);await assertFrozen(h);
  h.setReduced(false);await assertPointerRuns(h,.2);

  $('.node-check').click();
  await until(()=>$('.entry-check.is-playing'),'check module intro');
  await assertFrozen(h);
  $('[data-entry-skip]').click();
  await until(()=>$('[data-slot="gooey-nav"]')&&$('[data-upload-action="choose"]'),'actual Gooey and Folder islands');
  await until(()=>!$('#workspaceBody').classList.contains('content-arriving'),'settled upload content');
  const panel=$('#uploadPanel'),dropzone=$('#dropzone'),tabs=$('[data-slot="gooey-nav"]'),imageTab=$('#type-image');
  const trigger=$('[data-upload-action="choose"]'),titleCopy=$('.qi-upload-title .qi-copy-current');
  trigger.focus();
  const intros=[];
  const observer=new w.MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&(node.matches('.workspace-entry')||node.querySelector('.workspace-entry')))intros.push(node);
  });
  observer.observe($('#workspaceBody'),{childList:true,subtree:true});
  imageTab.click();
  assert.equal($('[data-upload-action="choose"]'),trigger,'type feedback retains the trusted picker trigger');
  assert.equal(doc.activeElement,trigger,'a programmatic type change cannot discard the focused trigger');
  assert.equal($('.qi-upload-title .qi-copy-current'),titleCopy);
  assert.match(titleCopy.textContent,/选择照片/);
  assert.equal($('.qi-upload-title .qi-copy-previous').getAttribute('aria-hidden'),'true');
  await until(()=>+titleCopy.style.opacity>.62&&+titleCopy.style.opacity<.999,'actual Anime copy interpolation');
  assert.notEqual(titleCopy.style.transform,'none');
  assert.equal($('#type-image').getAttribute('aria-selected'),'true');
  assert.equal($('#uploadPanel').getAttribute('aria-labelledby'),'type-image');
  const photoAccept=$('#fileInput').accept;
  assert.match(photoAccept,/\.png/);
  assert.equal($('#uploadPanel'),panel);assert.equal($('#dropzone'),dropzone);assert.equal($('[data-slot="gooey-nav"]'),tabs);assert.equal($('#type-image'),imageTab);
  assert.equal(doc.querySelectorAll('#workspaceBody [role="tablist"]').length,1);
  assert.equal(doc.querySelectorAll('[data-slot="gooey-nav-segment"][data-active="true"]').length,1);
  for(const kind of ['video','audio','chat'])$('#type-'+kind).click();
  assert.match(titleCopy.textContent,/选择截图/,'rapid switching commits the newest copy immediately');
  assert.equal(doc.querySelectorAll('.qi-upload-title .qi-copy-previous').length,1,'each field has at most one inaccessible outgoing line');
  await until(()=>!$('.qi-copy-previous')&&!$('[data-feedback-running]'),'rapid type feedback reaches a clean terminal state');
  assert.equal(titleCopy.style.opacity,'');assert.equal(titleCopy.style.transform,'');
  assert.equal($('#type-chat').getAttribute('aria-selected'),'true');
  let insideClick=false,pickerCalls=0,pickerState;
  $('#fileInput').click=()=>{pickerCalls++;pickerState={synchronous:insideClick,folderOpen:$('.qi-upload').dataset.open,accept:$('#fileInput').accept};};
  insideClick=true;$('[data-upload-action="choose"]').click();insideClick=false;
  assert.equal(pickerCalls,1);
  assert.deepEqual(pickerState,{synchronous:true,folderOpen:'true',accept:photoAccept},'Folder phase two commits and the native picker remains in the same activation stack');
  $('#fileInput').dispatchEvent(new w.Event('cancel'));
  assert.equal(doc.activeElement,trigger,'canceling a native picker leaves its stable trigger focused');
  $('#type-video').click();
  assert.equal($('#type-video').getAttribute('aria-selected'),'true');
  assert.equal($('#uploadPanel'),panel);assert.equal($('#dropzone'),dropzone);
  h.setHidden(true);await wait(20);
  assert.equal(titleCopy.style.opacity,'');assert.equal($('.qi-copy-previous'),null,'hidden-tab interruption settles current copy');
  h.setHidden(false);
  $('#type-audio').click();h.setReduced(true);await wait(20);
  assert.equal(titleCopy.style.opacity,'');assert.equal($('.qi-copy-previous'),null,'live reduced motion clears outgoing copy');
  h.setReduced(false);
  const input=$('#fileInput');
  Object.defineProperty(input,'files',{value:[new w.File(['RIFF sample'],'family.wav',{type:'audio/wav'})],configurable:true});
  input.dispatchEvent(new w.Event('change'));
  assert.equal($('.qi-file-name').textContent,'family.wav');
  const remove=$('[data-upload-action="remove"]');remove.focus();remove.click();
  assert.equal($('.qi-selected-file'),null);
  assert.equal($('[data-upload-action="choose"]'),trigger);
  assert.equal(doc.activeElement,trigger,'removing the selected file restores the surviving picker control');
  await wait(80);observer.disconnect();
  assert.deepEqual(intros,[],'changing material type does not replay entry or replace the page');
  assert.equal($('.workspace-entry'),null);assert.notEqual($('#workspaceBody').style.opacity,'0');
  assert.equal($('#workspaceBody').classList.contains('content-arriving'),false);

  w.location.hash='contacts';
  await until(()=>$('.entry-contacts.is-playing'),'replacement module intro');
  assert.equal(dropzone.classList.contains('rare-island'),false,'Folder root unmounts before its view is removed');
  assert.equal(tabs.isConnected,false);
  $('[data-entry-skip]').click();
  await until(()=>$('#contactForm'),'contact content');
  const form=$('#contactForm'),name=$('#contactName'),phone=$('#contactPhone');
  form.requestSubmit();
  assert.equal($('#contactError').dataset.feedbackKind,'error','native invalid events give immediate local feedback');
  assert.equal(name.getAttribute('aria-invalid'),'true');
  name.value='测试家人';phone.value='13800138000';
  for(const field of [name,phone])field.dispatchEvent(new w.Event('input',{bubbles:true}));
  form.requestSubmit();
  assert.match($('#contactStatus').textContent,/已保存.*测试家人/);
  assert.equal($('#contactList .contact-row').dataset.feedbackKind,'success');
  const status=$('#contactStatus');
  await until(()=>{const value=Number(status.style.getPropertyValue('--feedback-light'));return value>0&&value<1;},'actual Anime contact success feedback');
  assert.notEqual(status.style.opacity,'0','local feedback leaves committed copy visible');
  name.value='测试家人';phone.value='13800138000';form.requestSubmit();
  assert.match($('#contactError').textContent,/已经保存/);
  assert.equal($('#contactError').dataset.feedbackKind,'error');
  form.requestSubmit();assert.equal($('#contactError').dataset.feedbackKind,'error','identical errors restart feedback');
  h.setHidden(true);assert.equal($('#contactError').hasAttribute('data-feedback-kind'),false);
  assert.equal(status.hasAttribute('data-feedback-kind'),false);h.setHidden(false);
  $('[data-remove="0"]').click();assert.equal($('#modal').open,true);assertPortalLoops(h,'paused');
  $('#confirmRemove').click();
  assert.equal($('#modal').open,false);assert.equal($('#contactList .contact-row'),null);
  assert.match($('#contactStatus').textContent,/已移除.*测试家人/);
  assert.equal(doc.activeElement,name,'deleting the final contact restores focus to the form');
  const removedStatus=$('#contactStatus');
  $('#closeWorkspace').click();
  await until(()=>!$('#workspace').open,'return home');
  await assertPointerRuns(h,.9);
  assert.equal(removedStatus.hasAttribute('data-feedback-kind'),false,'route cancellation clears feedback before removing its DOM');
  $('#helpButton').click();assert.equal($('#modal').open,true);assertPortalLoops(h,'paused');
  $('#closeModal').click();assertPortalLoops(h,'running');
  assert.deepEqual(h.requests,[],'navigation and selection alone do not submit material');
  h.destroy();
  assert.equal($('.stage-background').children.length,0);
  assert.deepEqual(h.orphans,[],'React roots unmount before vanilla innerHTML or replaceChildren');
  assert.deepEqual(h.errors,[],'actual main, Anime and React produce no runtime errors');
});

test('a rejected optional scene import leaves the independent coloured environment usable after skipped boot',async t=>{
  const h=await mountMain({rejectScene:true});t.after(h.cleanup);
  const {$,doc,exposed,until}=h;
  await until(()=>typeof exposed.islands.mountUpload==='function'&&$('.placeholder-slogan'),'optional scene rejection is handled');
  assert.equal(doc.documentElement.dataset.sceneRenderer,'fallback');
  assert.equal($('.scene-fallback'),null,'this case exercises import rejection rather than renderer fallback');
  assert.match($('.scene-placeholder').textContent,/安/);
  assertEnvironment(h,'paused');
  $('[data-boot-skip]').click();
  assert.equal((await exposed.boot.finished).reason,'skip');
  await until(()=>$('.stage-background').dataset.ambientState==='running','skip releases the independent environment');
  await assertPointerRuns(h,.85);
  $('.node-practice').focus();
  assert.equal($('.stage-background').hasAttribute('data-active-portal'),false);
  assertEnvironment(h,'running');
  $('#motionButton').click();await assertFrozen(h);
  $('#motionButton').click();await assertPointerRuns(h,.1);
  h.destroy();
  assert.deepEqual(h.orphans,[]);
  assert.deepEqual(h.errors,[]);
});

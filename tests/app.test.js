import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initApp,moduleResult} from '../src/app.js';
import {quiz} from '../src/quiz.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,8));
const pending=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function setup(t,options={}){
  const dom=new JSDOM(html,{url:options.url||'https://qinan.test/',pretendToBeVisual:true});
  const w=dom.window;const errors=[];w.addEventListener('error',ev=>errors.push(ev.error));
  const mediaListeners=new Set();
  const media={matches:!!options.reduced,addEventListener(type,listener){if(type==='change')mediaListeners.add(listener);},removeEventListener(type,listener){if(type==='change')mediaListeners.delete(listener);}};
  w.matchMedia=()=>media;
  const setReduced=value=>{media.matches=value;for(const listener of [...mediaListeners])listener({matches:value});};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.HTMLMediaElement.prototype.load=function(){};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=options.fetch||(url=>url.endsWith('/cases')?Promise.resolve({ok:true,json:async()=>[]}):Promise.reject(new TypeError('offline')));
  for(const [key,value] of Object.entries(options.storage||{}))w.localStorage.setItem(key,value);
  for(const [key,value] of Object.entries(options.session||{}))w.sessionStorage.setItem(key,value);
  const keys=['window','document','location','innerWidth','URL','File','Blob','FormData'];const previous={};
  for(const key of keys){previous[key]=globalThis[key];globalThis[key]=key==='innerWidth'?1440:w[key];}
  let objectCount=0;const revoked=[];URL.createObjectURL=()=>`blob:test-${++objectCount}`;URL.revokeObjectURL=url=>revoked.push(url);
  const animations=[];
  const motion={animate(target,params){animations.push({target,params});if(options.animate)return options.animate(target,params);if(params.onComplete)params.onComplete();return {pause(){},resume(){},cancel(){},complete(){params.onComplete?.();}};},utils:{remove(){}},createSpring:()=> 'linear'};
  const visual={pause(){},resume(){},focus(){},async toggleForm(){return 'slogan';},dispose(){},...options.visual};
  const app=initApp({...motion,createLayout:options.createLayout,visual,apiBase:options.apiBase,homeMotion:options.homeMotion,portalMotion:options.portalMotion,islands:options.islands,startReady:options.startReady,entryDuration:options.entryDuration??0,...(options.delay?{delay:options.delay}:{})});
  const $=s=>w.document.querySelector(s);
  const goto=async hash=>{w.location.hash=hash;await tick();};
  const selectFile=async file=>{Object.defineProperty($('#fileInput'),'files',{value:[file],configurable:true});$('#fileInput').dispatchEvent(new w.Event('change'));await tick();};
  t.after(()=>{app.destroy();w.close();for(const key of keys)globalThis[key]=previous[key];assert.deepEqual(errors,[],'No uncaught UI errors');});
  return {w,$,goto,selectFile,animations,revoked,app,setReduced};
}

test('floating entry opens a window; switching material types preserves the window, panel and dropzone',async t=>{
  const {$,goto,animations,w}=setup(t);
  assert.equal($('#backHome'),null);assert.match($('#closeWorkspace').textContent,/返回主页/);assert.equal($('aside.sidebar'),null);assert.equal(w.document.querySelectorAll('.portal-node').length,4);
  await goto('check');
  const windowNode=$('#workspace'),panel=$('#uploadPanel'),dropzone=$('#dropzone'),count=animations.length;
  for(const type of ['video','image','chat','audio','image']){
    $(`#type-${type}`).click();
    assert.strictEqual($('#workspace'),windowNode);assert.strictEqual($('#uploadPanel'),panel);assert.strictEqual($('#dropzone'),dropzone);
    assert.equal($(`#type-${type}`).getAttribute('aria-selected'),'true');
    assert.equal($('#analyzeButton').disabled,true);
  }
  assert.ok(animations.slice(count).every(animation=>animation.target.feedbackKind==='change'),'type switches only animate local copy, without replaying any window entrance');
  assert.equal($('#fileInput').accept,'.jpg,.jpeg,.png,.webp');
});

test('type tabs support arrow keys without rebuilding the page',async t=>{
  const {$,goto,w}=setup(t);await goto('check');
  const panel=$('#uploadPanel');$('#type-audio').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.strictEqual($('#uploadPanel'),panel);assert.equal(w.document.activeElement.id,'type-video');
  assert.equal($('#type-video').getAttribute('aria-selected'),'true');
  assert.equal($('.tab-marker').style.transform,'translateX(100%)','native tabs keep their sliding marker without the optional chunk');
});

function trackedMaterialTabs(){
  const tabs=[];
  return {tabs,mountMaterialTabs(host,initial){
    const entry={host,props:initial,destroyed:false,connectedOnDestroy:false,updates:0};tabs.push(entry);
    host.innerHTML=['audio','video','image','chat'].map(kind=>`<button id="type-${kind}" class="type-tab" data-type="${kind}" role="tab" aria-controls="uploadPanel">${kind}</button>`).join('');
    const update=props=>{
      entry.props={...entry.props,...props};entry.updates++;
      host.querySelectorAll('button').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.type===entry.props.value));button.tabIndex=button.dataset.type===entry.props.value?0:-1;button.disabled=!!entry.props.disabled;});
    };
    host.querySelectorAll('button').forEach(button=>button.onclick=()=>entry.props.onChange(button.dataset.type));update(initial);
    return {update,destroy(){entry.destroyed=true;entry.connectedOnDestroy=host.isConnected;host.replaceChildren();}};
  }};
}

test('material tabs stay controlled in one island, preserve the panel, and dispose before leaving',async t=>{
  const islands={...trackedIslands(),...trackedMaterialTabs()};
  const {$,goto,w,selectFile,revoked,animations,app}=setup(t,{islands});await goto('check');
  const tabs=islands.tabs[0],host=$('.type-tabs'),panel=$('#uploadPanel'),dropzone=$('#dropzone'),count=animations.length;
  assert.equal(tabs.props.value,'audio');assert.equal(tabs.props.disabled,false);
  $('#type-image').click();await selectFile(new w.File(['image'],'material.png',{type:'image/png'}));
  const oldUrl=islands.uploads[0].props.url;
  $('#type-video').click();
  assert.equal(tabs.props.value,'video');assert.equal($('#type-video').getAttribute('aria-selected'),'true');assert.equal($('#type-video').tabIndex,0);
  assert.equal($('#uploadPanel').getAttribute('aria-labelledby'),'type-video');assert.equal($('#fileInput').accept,'.mp4,.mov,.avi,.webm');
  assert.equal(islands.uploads[0].props.file,null);assert.ok(revoked.includes(oldUrl));assert.equal($('#analyzeButton').disabled,true);
  tabs.props.onChange('unsupported');assert.equal(tabs.props.value,'video');
  assert.strictEqual($('.type-tabs'),host);assert.strictEqual($('#uploadPanel'),panel);assert.strictEqual($('#dropzone'),dropzone);
  app.refreshIslands();app.refreshIslands();assert.equal(islands.tabs.length,1);assert.equal(islands.uploads.length,1);assert.equal(animations.length,count);
  $('#motionButton').click();assert.equal(tabs.props.paused,true);const stale=tabs.props.onChange;
  await goto('contacts');assert.equal(tabs.destroyed,true);assert.equal(tabs.connectedOnDestroy,true);
  stale('chat');assert.ok($('#contactForm'));assert.equal($('#fileInput').accept,'.mp4,.mov,.avi,.webm');
});

test('a late material tab chunk waits for the module intro and then mounts only once',async t=>{
  const islands={};const {$,goto,app}=setup(t,{islands,entryDuration:700,animate(target,params){
    if(!target?.nodeType&&!Array.isArray(target)&&params.duration===700)return {cancel(){}};
    params.onComplete?.();return {cancel(){},pause(){},resume(){}};
  }});
  await goto('check');const intro=$('.workspace-entry');const loaded=trackedMaterialTabs();Object.assign(islands,loaded);
  app.refreshIslands();app.refreshIslands();assert.equal(loaded.tabs.length,0);assert.strictEqual($('.workspace-entry'),intro);
  $('[data-entry-skip]').click();assert.equal(loaded.tabs.length,1);assert.equal($('.workspace-entry'),null);
  $('#type-chat').click();app.refreshIslands();assert.equal(loaded.tabs.length,1);assert.equal(loaded.tabs[0].props.value,'chat');assert.equal($('.workspace-entry'),null);
});

test('hydrating an already focused native tab preserves its selection and keyboard focus',async t=>{
  const islands={};const {$,goto,w,app}=setup(t,{islands});await goto('check');$('#type-image').click();$('#type-image').focus();
  const loaded=trackedMaterialTabs();Object.assign(islands,loaded);app.refreshIslands();
  assert.equal(loaded.tabs.length,1);assert.equal(loaded.tabs[0].props.value,'image');assert.equal(w.document.activeElement.id,'type-image');
  assert.equal($('#type-image').getAttribute('aria-selected'),'true');assert.equal($('#uploadPanel').getAttribute('aria-labelledby'),'type-image');
});

test('submitting materials unmounts its tabs while connected and ignores callbacks from the old root',async t=>{
  const submit=pending(),islands={...trackedIslands(),...trackedMaterialTabs()};
  const {$,goto,w,selectFile}=setup(t,{islands,fetch:()=>submit.promise});await goto('check');
  const tabs=islands.tabs[0],stale=tabs.props.onChange;await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();
  assert.equal(tabs.destroyed,true);assert.equal(tabs.connectedOnDestroy,true);assert.ok($('#progressTitle'));
  stale('image');assert.ok($('#progressTitle'));assert.equal($('#fileInput').accept,'.wav,.mp3,.m4a,.flac,.ogg');
  submit.reject(new TypeError('offline'));await tick();assert.equal(islands.tabs.length,2);assert.equal(islands.tabs[1].props.value,'audio');
});

test('a stored motion pause remains paused and has a readable Chinese restore action',t=>{
  const {$,w}=setup(t,{storage:{'qinan-motion-paused':'true'}});
  assert.equal($('#motionButton .motion-button-label').textContent,'恢复动效');assert.equal($('#motionButton').dataset.paused,'true');
  assert.equal(w.localStorage.getItem('qinan-motion-paused'),'true');
  $('#motionButton').click();assert.equal($('#motionButton .motion-button-label').textContent,'暂停动效');assert.equal($('#motionButton').dataset.paused,'false');assert.equal(w.localStorage.getItem('qinan-motion-paused'),'false');
});

test('the sculpture control prevents duplicate morphs and updates its label only after settling',async t=>{
  const morph=pending();let calls=0;
  const {$}=setup(t,{visual:{toggleForm(){calls++;return morph.promise;}}});
  const control=$('#scatterButton');control.click();control.click();
  assert.equal(calls,1);assert.equal(control.disabled,true);assert.equal(control.getAttribute('aria-busy'),'true');
  assert.match(control.textContent,/展开安心宣言/);
  morph.resolve('slogan');await tick();
  assert.equal(control.disabled,false);assert.equal(control.getAttribute('aria-busy'),'false');assert.match(control.textContent,/合拢安印/);
});

test('image selection, invalid formats, replacement and removal remain safe and revoke previews',async t=>{
  const {$,goto,selectFile,w,revoked}=setup(t);await goto('check');$('#type-image').click();
  await selectFile(new w.File(['image'],'<script>alert(1)</script>.png',{type:'image/png'}));
  assert.equal($('#analyzeButton').disabled,false);assert.equal($('#dropzone script'),null);assert.match($('.selected-name').textContent,/<script>/);
  await selectFile(new w.File(['x'],'wrong.mp3',{type:'audio/mpeg'}));assert.match($('#fileError').textContent,/照片/);
  $('#removeFile').click();assert.equal($('#analyzeButton').disabled,true);assert.equal(revoked.length,1);
  await selectFile(new w.File([],'empty.png',{type:'image/png'}));assert.match($('#fileError').textContent,/为空/);
});

test('a stale video validation cannot remove a later photo selection',async t=>{
  const {$,goto,w,selectFile}=setup(t);await goto('check');$('#type-video').click();
  const create=w.document.createElement.bind(w.document);const videos=[];
  w.document.createElement=(tag,...args)=>{const el=create(tag,...args);if(tag==='video')videos.push(el);return el;};
  await selectFile(new w.File(['video'],'old.mp4',{type:'video/mp4'}));
  assert.equal($('#analyzeButton').disabled,true);
  const staleHandler=videos[0].onloadedmetadata;
  $('#type-image').click();await selectFile(new w.File(['image'],'new.png',{type:'image/png'}));
  Object.defineProperty(videos[0],'duration',{value:500});staleHandler();await tick();
  assert.equal($('.selected-name').textContent,'new.png');assert.equal($('#analyzeButton').disabled,false);
});

test('overlong video is removed before submitting',async t=>{
  const {$,goto,w,selectFile}=setup(t);await goto('check');$('#type-video').click();
  const create=w.document.createElement.bind(w.document);let metadata;
  w.document.createElement=(tag,...args)=>{const el=create(tag,...args);if(tag==='video')metadata=el;return el;};
  await selectFile(new w.File(['video'],'long.mp4',{type:'video/mp4'}));
  Object.defineProperty(metadata,'duration',{value:181});metadata.onloadedmetadata();await tick();
  assert.equal($('#analyzeButton').disabled,true);assert.match($('#fileError').textContent,/超过 3 分钟/);assert.equal($('.selected-name'),null);
});

test('contacts update their count immediately, reject duplicate numbers and confirm deletion',async t=>{
  const {$,goto,w}=setup(t);await goto('contacts');
  const submit=()=>$('#contactForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  $('#contactName').value='妈妈';$('#contactPhone').value='+86 138 0013 8000';submit();
  assert.equal($('#contactCount').textContent,'/ 1');assert.equal($('.contact-row a').getAttribute('href'),'tel:+8613800138000');
  $('#contactName').value='家人';$('#contactPhone').value='+8613800138000';submit();assert.match($('#contactError').textContent,/已经保存/);
  $('[data-remove]').click();assert.equal($('#modal').open,true);$('#keepContact').click();assert.equal($('#contactCount').textContent,'/ 1');
  $('[data-remove]').click();$('#confirmRemove').click();assert.equal($('#contactCount').textContent,'/ 0');
  assert.deepEqual(JSON.parse(w.localStorage.getItem('qinan-contacts')),[]);
});

test('local upload feedback preserves current contents, trusted picker timing and focus after removal',async t=>{
  const local=[];const {$,goto,w,selectFile}=setup(t,{animate(target,params){
    if('feedbackProgress' in target){const job={target,params,cancelled:false,cancel(){this.cancelled=true;}};local.push(job);return job;}
    params.onComplete?.();return {cancel(){},pause(){},resume(){}};
  }});await goto('check');$('#type-image').click();
  assert.equal($('#dropzone h2').dataset.feedbackKind,'change');assert.equal($('#dropzone>p').dataset.feedbackKind,'change');
  let clicks=0;$('#fileInput').click=()=>{clicks++;assert.equal($('#dropzone').dataset.pickerOpen,'true');};$('#chooseFile').click();assert.equal(clicks,1);$('#fileInput').dispatchEvent(new w.Event('cancel'));
  await selectFile(new w.File(['photo'],'one.png',{type:'image/png'}));const preview=$('.file-preview');
  await selectFile(new w.File(['bad'],'wrong.mp3'));assert.strictEqual($('.file-preview'),preview);assert.equal($('#fileError').dataset.feedbackKind,'error');
  const error=local.at(-1);await selectFile(new w.File(['bad'],'wrong.mp3'));assert.equal(error.cancelled,true);
  $('#removeFile').focus();$('#removeFile').click();assert.equal(w.document.activeElement.id,'chooseFile');assert.equal($('#analyzeButton').disabled,true);
  $('#motionButton').click();assert.equal($('#dropzone [data-feedback-kind]'),null);assert.equal(w.document.documentElement.dataset.feedbackMotion,'paused');
});

test('contact required and storage errors stay inline, preserve data, and recover with correct focus',async t=>{
  const {$,goto,w}=setup(t);await goto('contacts');$('#contactForm').requestSubmit();
  assert.match($('#contactError').textContent,/称呼/);assert.equal($('#contactName').getAttribute('aria-invalid'),'true');assert.equal($('#contactPhone').getAttribute('aria-invalid'),'true');
  const prototype=Object.getPrototypeOf(w.localStorage),original=prototype.setItem;let fail=true;
  prototype.setItem=function(key,value){if(fail&&key==='qinan-contacts')throw new Error('blocked');return original.call(this,key,value);};t.after(()=>{prototype.setItem=original;});
  $('#contactName').value='妈妈';$('#contactPhone').value='13800138000';$('#contactForm').requestSubmit();
  assert.equal($('#contactCount').textContent,'/ 0');assert.match($('#contactError').textContent,/无法保存/);assert.equal($('#contactName').value,'妈妈');
  fail=false;$('#contactForm').requestSubmit();assert.match($('#contactStatus').textContent,/已保存 妈妈/);assert.equal($('#contactName').hasAttribute('aria-invalid'),false);
  $('[data-remove]').click();fail=true;$('#confirmRemove').click();assert.equal($('#modal').open,true);assert.match($('#contactRemoveError').textContent,/仍然保留/);assert.equal($('#contactCount').textContent,'/ 1');
  fail=false;$('#confirmRemove').click();assert.equal($('#modal').open,false);assert.equal($('#contactCount').textContent,'/ 0');assert.match($('#contactStatus').textContent,/已移除 妈妈/);assert.equal(w.document.activeElement.id,'contactName');
});

test('history retries only its existing list and cannot repaint a new route',async t=>{
  const retry=pending();let calls=0;const {$,goto}=setup(t,{fetch:()=>++calls===1?Promise.reject(new TypeError('offline')):retry.promise});await goto('history');
  const list=$('#historyList'),heading=$('.page-heading');$('#workspaceBody').scrollTop=120;$('#retryHistory').click();
  assert.strictEqual($('#historyList'),list);assert.strictEqual($('.page-heading'),heading);assert.equal(list.getAttribute('aria-busy'),'true');assert.match(list.textContent,/正在读取/);assert.equal($('#workspaceBody').scrollTop,120);
  await goto('contacts');retry.resolve({ok:true,json:async()=>[{id:'late',filename:'late.mp3'}]});await tick();assert.ok($('#contactForm'));assert.equal($('#historyList'),null);
});

test('a report error retries the known id and details remain synchronous through pause and print',async t=>{
  const retry=pending();let calls=0;const local=[];
  const {$,goto,w}=setup(t,{fetch:()=>++calls===1?Promise.reject(new TypeError('offline')):retry.promise,animate(target,params){
    if('feedbackProgress' in target){const job={params,cancel(){}};local.push(job);return job;}params.onComplete?.();return {cancel(){},pause(){},resume(){}};
  }});await goto('report/known');const heading=$('.page-heading'),host=$('#reportLoadState');$('#retryReport').click();assert.strictEqual($('.page-heading'),heading);assert.strictEqual($('#reportLoadState'),host);assert.equal(host.getAttribute('aria-busy'),'true');
  retry.resolve({ok:true,json:async()=>({id:'known',filename:'saved.mp3',modules:{audio:{status:'completed',score:0,threshold:.5}}})});await tick();
  const details=$('.report-details');details.open=true;await tick();assert.equal($('.raw-report').dataset.feedbackKind,'change');assert.ok($('.raw-report').textContent.includes('known'));
  details.open=false;await tick();assert.equal($('.raw-report').hasAttribute('data-feedback-kind'),false);
  w.dispatchEvent(new w.Event('beforeprint'));assert.equal(details.open,true);assert.equal(w.document.documentElement.dataset.feedbackMotion,'paused');w.dispatchEvent(new w.Event('afterprint'));assert.equal(details.open,false);
  $('#motionButton').click();details.open=true;await tick();assert.equal($('.raw-report').hasAttribute('data-feedback-kind'),false);assert.ok(local.length>0);
});

test('portal loops wait for startup and stay covered through modal and workspace return',async t=>{
  const ready=pending(),calls=[],pendingClose=[];let hold=false;
  const {$,goto,w}=setup(t,{startReady:ready.promise,portalMotion:{setReady(value){calls.push(['ready',value]);},setPaused(value){calls.push(['paused',value]);},setCovered(value){calls.push(['covered',value]);},destroy(){calls.push(['destroy']);}},animate(target,params){
    if(hold&&[90,460].includes(params.duration)){pendingClose.push(params);return {cancel(){}};}params.onComplete?.();return {cancel(){},pause(){},resume(){}};
  }});assert.equal(calls.some(([kind])=>kind==='ready'),false);ready.resolve();await tick();assert.ok(calls.some(([kind,value])=>kind==='ready'&&value));
  const covered=()=>calls.findLast(([kind])=>kind==='covered')[1];$('#settings').click();assert.equal(covered(),true);$('#closeModal').click();assert.equal(covered(),false);
  await goto('check');assert.equal(covered(),true);$('#settings').click();$('#closeModal').click();assert.equal(covered(),true);
  hold=true;$('#closeWorkspace').click();await tick();assert.equal(w.location.hash,'#home');assert.equal(covered(),true);
  pendingClose.shift().onComplete();assert.equal(covered(),true);pendingClose.shift().onComplete();assert.equal(covered(),false);
  $('.node-check').dispatchEvent(new w.Event('pointermove'));assert.equal(covered(),false,'hover never pauses the independent loop');
});

test('quiz answers update in place and repeated clicks do not increase the score',async t=>{
  const {$,goto}=setup(t);await goto('practice');
  const card=$('.question-card');assert.equal(wrongCount(),6);function wrongCount(){return $('#workspaceBody').querySelectorAll('.quiz-tile').length;}$('[data-answer="1"]').click();assert.equal(wrongCount(),5);
  assert.strictEqual($('.question-card'),card);assert.equal($('#scoreCount').textContent,'已答对 1 题');
  $('[data-answer="1"]').click();assert.equal($('#scoreCount').textContent,'已答对 1 题');
  assert.match($('#feedback').textContent,/这一步/);$('#nextQuestion').click();assert.match($('.question-meta').textContent,/02/);
});

test('a real job finishing after navigation does not hijack the current page',async t=>{
  const waits=[],report={id:'case-complete',filename:'voice.mp3',summary:'已完成声音核验',modules:{audio:{status:'completed',score:.7,threshold:.5}}};
  const {$,goto,w,selectFile}=setup(t,{delay:()=>new Promise(r=>waits.push(r)),fetch:async url=>({ok:true,json:async()=>url.endsWith('/analyze')?{job_id:'job-one'}:url.includes('/jobs/')?{status:'completed',result:report}:url.endsWith('/cases')?[report]:report})});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();assert.ok($('#progressTitle'));
  await goto('contacts');const form=$('#contactForm');waits[0]();await tick();
  assert.strictEqual($('#contactForm'),form);assert.equal(w.location.hash,'#contacts');assert.equal(w.localStorage.getItem('qinan-demo-history'),null);
  await goto('history');$('[data-report]').click();await tick();assert.match($('#workspaceTitle').textContent,/核验报告/);assert.match($('.result-banner').textContent,/已完成声音核验/);
});

test('a background task failure preserves the returning check intro and unmounts its island before rendering',async t=>{
  const waits=[],islands=trackedIslands();
  const {$,goto,w,selectFile,animations}=setup(t,{entryDuration:700,islands,delay:()=>new Promise(resolve=>waits.push(resolve)),
    animate(target,params){
      if(!target?.nodeType&&!Array.isArray(target)&&params.duration===700)return {cancel(){}};
      params.onComplete?.();return {cancel(){},pause(){},resume(){}};
    },
    fetch:async url=>({ok:true,json:async()=>url.endsWith('/analyze')?{job_id:'pending-return'}:{status:'failed'}}),
  });
  await goto('check');$('[data-entry-skip]').click();await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();
  await goto('contacts');$('[data-entry-skip]').click();await goto('check');
  const intro=$('.workspace-entry'),island=islands.statuses.at(-1),clock=animations.findLast(item=>item.params.duration===700);
  waits[0]();await tick();
  assert.strictEqual($('.workspace-entry'),intro);assert.equal(island.destroyed,false);assert.equal($('#fileError'),null);
  $('[data-entry-skip]').click();
  assert.equal(island.destroyed,true);assert.equal(island.connectedOnDestroy,true);assert.match($('#fileError').textContent,/未能完成/);
  assert.equal($('#analyzeButton').disabled,false);clock.params.onComplete();assert.equal($('.workspace-entry'),null);
});

test('a late history request failure cannot overwrite a newer view',async t=>{
  const history=pending();
  const {$,goto}=setup(t,{storage:{'qinan-real-mode':'true'},fetch:url=>url==='/api/health'?Promise.resolve({ok:true,json:async()=>({models:{audio:true,video:true}})}):history.promise});
  await goto('history');await goto('contacts');const form=$('#contactForm');
  history.reject(new TypeError('offline'));await tick();
  assert.strictEqual($('#contactForm'),form);assert.equal($('#historyList'),null);
});

test('old mode settings cannot turn a submitted file into a fabricated report',async t=>{
  let uploads=0;const {$,goto,w,selectFile}=setup(t,{storage:{'qinan-real-mode':'false'},fetch:async()=>{uploads++;throw new TypeError('offline');}});
  $('#settings').click();assert.equal($('#demoMode'),null);assert.equal($('#realMode'),null);$('#settingsDone').click();
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();
  assert.equal(uploads,1);assert.match($('#fileError').textContent,/无法连接/);assert.equal($('.selected-name').textContent,'voice.mp3');assert.equal($('#analyzeButton').disabled,false);
  assert.equal(w.localStorage.getItem('qinan-demo-history'),null);assert.equal($('#exportReport'),null);
});

test('malformed stored data does not break the interface',async t=>{
  const {$,goto}=setup(t,{storage:{'qinan-contacts':'{"invalid":true}','qinan-demo-history':'null','qinan-motion-paused':'true'}});
  assert.equal($('#motionState').textContent,'MOTION OFF');
  await goto('contacts');assert.equal($('#contactCount').textContent,'/ 0');await goto('history');assert.ok($('#firstCheck'));
});

test('an old sample remains readable only through its saved link',t=>{
  const report={id:'demo-saved',demo:true,name:'已保存示例',date:'2026-11-13T08:00:00Z'};
  const {$}=setup(t,{url:'https://qinan.test/#report/demo-saved',storage:{'qinan-demo-history':JSON.stringify([report])}});
  assert.equal($('#workspace').open,true);assert.match($('.page-heading').textContent,/已保存示例/);assert.ok($('#exportReport'));assert.match($('.mode-notice').textContent,/旧版示例/);
});

test('report logic respects per-segment thresholds and uncertain image scores',()=>{
  assert.equal(moduleResult({status:'completed',score:.4,threshold:.7,segments:[{score:.65,threshold:.5}]}).status,'flagged');
  assert.equal(moduleResult({status:'completed',segments:[{score:.72,threshold:.7}]}).status,'flagged');
  assert.equal(moduleResult({status:'completed',score:.008,threshold:.5,sensitivity_threshold:.007}).status,'uncertain');
  assert.equal(moduleResult({status:'failed',score:.9}).status,'unavailable');
  assert.equal(moduleResult({status:'completed',score:.9}).status,'flagged','legacy reports keep the documented default threshold of .5');
  assert.equal(moduleResult({status:'completed',score:0}).status,'below');
  assert.equal(moduleResult({status:'completed'}).status,'unavailable');
  assert.equal(moduleResult({status:'completed',score:.4,threshold:.5,secondary_check:{score:.65,threshold:.7}}).status,'below');
});

function trackedIslands(){
  const uploads=[],statuses=[];
  const mount=(list)=>(host,initial)=>{
    const entry={host,props:initial,updates:[initial],destroyed:false,connectedOnDestroy:false};list.push(entry);
    if(list===uploads){
      host.innerHTML='<button data-folder="true">选择文件</button><button data-remove-file="true">移除文件</button>';
      host.querySelector('[data-folder]').onclick=()=>entry.props.onChoose();
      host.querySelector('[data-remove-file]').onclick=()=>entry.props.onRemove();
    }
    return {update(props){entry.props={...entry.props,...props};entry.updates.push(entry.props);},destroy(){entry.destroyed=true;entry.connectedOnDestroy=host.isConnected;host.replaceChildren();}};
  };
  return {uploads,statuses,mountUpload:mount(uploads),mountStatus:mount(statuses)};
}

function drag(w,node,event,files=[]){
  const ev=new w.Event(event,{bubbles:true,cancelable:true});
  Object.defineProperty(ev,'dataTransfer',{value:{types:['Files'],files,dropEffect:'none'}});
  node.dispatchEvent(ev);return ev;
}

test('folder second phase updates before the same click opens the picker once; cancel preserves selection',async t=>{
  const islands=trackedIslands();const {$,goto,w,selectFile,revoked}=setup(t,{islands});await goto('check');$('#type-image').click();
  await selectFile(new w.File(['image'],'kept.png',{type:'image/png'}));
  const upload=islands.uploads[0],url=upload.props.url;let clicks=0;
  $('#fileInput').click=()=>{clicks++;assert.equal(upload.props.open,true,'second phase is visible in the input click stack');};
  $('[data-folder]').click();assert.equal(clicks,1);assert.equal(upload.props.file.name,'kept.png');
  $('[data-folder]').click();assert.equal(clicks,1,'pending native picker cannot be opened twice');
  $('#fileInput').dispatchEvent(new w.Event('cancel'));assert.equal(upload.props.open,false);
  assert.equal(upload.props.file.name,'kept.png');assert.equal(upload.props.url,url);assert.equal(revoked.length,0);
  assert.equal($('#analyzeButton').disabled,false);
  $('[data-folder]').click();assert.equal(clicks,2);assert.equal($('#fileInput').value,'');
  await selectFile(upload.props.file);assert.equal(upload.props.file.name,'kept.png');assert.equal(revoked.length,1,'same file can be selected again with a fresh preview');
});

test('empty dropzone keyboard and background clicks activate once; nested drag events stay open until the last leave',async t=>{
  const islands=trackedIslands();const {$,goto,w}=setup(t,{islands});await goto('check');
  const zone=$('#dropzone'),upload=islands.uploads[0];let clicks=0;$('#fileInput').click=()=>clicks++;
  zone.click();assert.equal(clicks,1);$('#fileInput').dispatchEvent(new w.Event('cancel'));
  zone.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));assert.equal(clicks,2);$('#fileInput').dispatchEvent(new w.Event('cancel'));
  const child=$('[data-folder]');drag(w,zone,'dragenter');drag(w,child,'dragenter');
  drag(w,child,'dragleave');assert.equal(upload.props.open,true);assert.equal(zone.classList.contains('dragover'),true);
  drag(w,zone,'dragleave');assert.equal(upload.props.open,false);assert.equal(zone.classList.contains('dragover'),false);
  drag(w,zone,'dragenter');drag(w,child,'drop',[new w.File(['audio'],'voice.mp3',{type:'audio/mpeg'})]);
  assert.equal(clicks,2,'drop never opens the native picker');assert.equal(upload.props.file.name,'voice.mp3');assert.equal(upload.props.open,false);
});

test('upload islands update in place, ignore stale preview errors and unmount before the view disappears',async t=>{
  const islands=trackedIslands();const {$,goto,w,selectFile}=setup(t,{islands});await goto('check');
  const upload=islands.uploads[0];$('#type-image').click();assert.equal(islands.uploads.length,1);
  await selectFile(new w.File(['image'],'first.png',{type:'image/png'}));const staleError=upload.props.onPreviewError;
  await selectFile(new w.File(['image'],'second.png',{type:'image/png'}));staleError();assert.equal($('#fileError').textContent,'');
  $('#motionButton').click();assert.equal(upload.props.paused,true);
  upload.props.onPreviewError();assert.match($('#fileError').textContent,/无法预览/);
  await goto('contacts');assert.equal(upload.destroyed,true);assert.equal(upload.connectedOnDestroy,true);
  staleError();assert.ok($('#contactForm'));assert.equal($('#fileError'),null);
});

test('drop validation preserves an existing file when multiple or oversized files arrive',async t=>{
  const islands=trackedIslands();const {$,goto,w,selectFile,revoked}=setup(t,{islands});await goto('check');
  const first=new w.File(['audio'],'first.mp3',{type:'audio/mpeg'});await selectFile(first);
  const zone=$('#dropzone'),upload=islands.uploads[0];
  drag(w,zone,'drop',[first,new w.File(['audio'],'second.mp3')]);assert.match($('#fileError').textContent,/一个文件/);
  const large=new w.File(['audio'],'large.mp3');Object.defineProperty(large,'size',{value:104857601});drag(w,zone,'drop',[large]);
  assert.match($('#fileError').textContent,/100MB/);assert.equal(upload.props.file,first);assert.equal(revoked.length,0);
});

test('startup defers direct hash routes and entrance motion, including hash changes, then opens the latest route',async t=>{
  const ready=pending();const {$,goto,animations}=setup(t,{url:'https://qinan.test/#check',startReady:ready.promise});
  assert.equal($('#workspace').open,false);assert.equal($('#dropzone'),null);assert.equal(animations.length,0);
  await goto('practice');assert.equal($('#workspace').open,false);
  ready.resolve();await tick();assert.equal($('#workspace').open,true);assert.ok($('.question-card'));assert.ok(animations.length>0);
});

test('late optional islands hydrate an already usable native upload after startup skip',async t=>{
  const islands={};const {$,goto,app}=setup(t,{islands});await goto('check');assert.ok($('#chooseFile'));
  const ready=trackedIslands();Object.assign(islands,ready);app.refreshIslands();
  assert.equal(ready.uploads.length,1);assert.ok($('[data-folder]'));assert.equal($('#chooseFile'),null);
});

test('inline status follows submitted job responses, never a simulated timer',async t=>{
  const submit=pending(),islands=trackedIslands(),waits=[];let polls=0;
  const {$,goto,w,selectFile}=setup(t,{islands,delay:()=>new Promise(r=>waits.push(r)),fetch:url=>url.endsWith('/analyze')?submit.promise:Promise.resolve({ok:true,json:async()=>++polls===1?{status:'processing',message:'正在检查声音片段'}:{status:'completed',result:{id:'job-result',filename:'voice.mp3',summary:'声音核验已完成',modules:{audio:{status:'completed',score:0,threshold:.5}}}}})});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();
  const status=islands.statuses[0];assert.equal(status.props.state,'loading');assert.equal(waits.length,0);
  submit.resolve({ok:true,json:async()=>({job_id:'job-one'})});await tick();assert.equal(status.props.state,'analyzing');assert.match(status.props.detail,/已提交/);
  waits[0]();await tick();assert.equal(status.props.label,'正在检查声音片段');
  $('#motionButton').click();assert.equal(status.props.paused,true);
  waits[1]();await tick();assert.equal(status.destroyed,true);assert.equal(status.connectedOnDestroy,true);assert.ok($('#exportReport'));
});

test('picker focus-return fallback settles the folder without discarding the previous file',async t=>{
  const islands=trackedIslands();const {$,goto,w,selectFile,revoked}=setup(t,{islands});await goto('check');
  await selectFile(new w.File(['voice'],'voice.mp3',{type:'audio/mpeg'}));
  const upload=islands.uploads[0];$('#fileInput').click=()=>{};$('[data-folder]').click();
  w.dispatchEvent(new w.Event('focus'));await new Promise(resolve=>setTimeout(resolve,280));
  assert.equal(upload.props.open,false);assert.equal(upload.props.file.name,'voice.mp3');assert.equal(revoked.length,0);
  assert.equal($('#analyzeButton').disabled,false);
});


function trackedPracticeIslands(){
  const counters=[],faqs=[];
  const mount=list=>(host,props)=>{
    const entry={host,props:{...props},updates:[],destroyed:false,connectedOnDestroy:false};list.push(entry);
    host.textContent=list===counters?String(props.value):'更多核实提醒';
    return {update(next){entry.props={...entry.props,...next};entry.updates.push(entry.props);},destroy(){entry.destroyed=true;entry.connectedOnDestroy=host.isConnected;host.replaceChildren();}};
  };
  return {counters,faqs,mountCounter:mount(counters),mountFaq:mount(faqs)};
}

test('practice preserves the frame, queue and counter across all six cases and builds an actual wrong-first review',async t=>{
  const islands=trackedPracticeIslands();const {$,goto,w}=setup(t,{islands});await goto('practice');
  const frame=$('.practice-frame'),queue=$('.quiz-progress'),stage=$('#practiceStage'),counterHost=$('#practiceCounter');
  assert.equal(queue.querySelectorAll('.ticket-title').length,6);assert.match(queue.textContent,/换号求助/);
  const mistakes=new Set([1,4]);let score=0;
  for(let i=0;i<quiz.length;i++){
    const q=quiz[i];assert.match($('#practiceMaterial').textContent,/虚构情景/);assert.equal($('#practiceMaterial button, #practiceMaterial audio, #practiceMaterial video'),null,'fictional media has no pretend playback');
    assert.equal($('.material-segment.is-clue'),null);
    const chosen=mistakes.has(i)?(q.correct+1)%3:q.correct;$(`[data-answer="${chosen}"]`).click();if(!mistakes.has(i))score++;
    assert.equal(islands.counters[0].props.value,score);assert.equal(w.document.querySelectorAll('.quiz-tile').length,5-i);
    assert.ok($('.material-segment.is-clue'));assert.equal($('#materialClues').hidden,false);
    assert.equal(islands.faqs.at(-1).props.items[0].id,q.reviewQA.id);
    const faq=islands.faqs.at(-1);$('#nextQuestion').click();assert.equal(faq.destroyed,true);assert.equal(faq.connectedOnDestroy,true);
    assert.strictEqual($('.practice-frame'),frame);assert.strictEqual($('.quiz-progress'),queue);assert.strictEqual($('#practiceStage'),stage);assert.strictEqual($('#practiceCounter'),counterHost);
  }
  assert.equal(islands.counters.length,1,'the animated score island persists between questions and completion');
  assert.match($('.practice-result-score').textContent,/4 \/ 6/);
  assert.deepEqual(islands.faqs.at(-1).props.items.slice(0,2).map(item=>item.id),[quiz[1].reviewQA.id,quiz[4].reviewQA.id]);
  assert.equal(islands.faqs.at(-1).props.items.length,6);
  $('#restartQuiz').click();assert.equal(islands.counters[0].destroyed,true);assert.equal(islands.counters[1].props.value,0);assert.equal(w.document.querySelectorAll('.quiz-tile').length,6);
});

test('a perfect round still offers all six practical review tips',async t=>{
  const islands=trackedPracticeIslands();const {$,goto}=setup(t,{islands,reduced:true});await goto('practice');
  for(const q of quiz){$(`[data-answer="${q.correct}"]`).click();$('#nextQuestion').click();}
  assert.match($('.practice-result-score').textContent,/6 \/ 6/);assert.match($('.practice-review-list').textContent,/六条核实提醒/);
  assert.deepEqual(islands.faqs.at(-1).props.items.map(item=>item.id),quiz.map(q=>q.reviewQA.id));
});

test('answered practice reopens with the chosen FAQ, score and highlighted clues intact',async t=>{
  const islands=trackedPracticeIslands();const {$,goto,animations}=setup(t,{islands});await goto('practice');
  $('[data-answer="1"]').click();const faq=islands.faqs.at(-1);faq.props.onValueChange(quiz[0].reviewQA.id);
  assert.equal(faq.props.value,quiz[0].reviewQA.id);
  const enters=animations.filter(a=>a.target?.id==='feedback').length;
  await goto('home');assert.equal(faq.destroyed,true);await goto('practice');
  assert.equal(islands.counters.at(-1).props.value,1);assert.equal(islands.faqs.at(-1).props.value,quiz[0].reviewQA.id);
  assert.ok($('.material-segment.is-clue'));assert.equal($('[data-answer="1"]').disabled,true);assert.equal($('#feedback').style.opacity,'1');
  assert.equal(animations.filter(a=>a.target?.id==='feedback').length,enters,'restored answers never replay the feedback entrance');
});

test('official queue exit removes one ticket, blocks next until settled and ignores repeated answer activation',async t=>{
  const exits=[];const {$,goto}=setup(t,{createLayout(){return {revert(){},update(change,params){change();const exit={finish:params.onComplete,complete(){params.onComplete();}};exits.push(exit);return exit;}};}});await goto('practice');
  const frame=$('.practice-frame');$('[data-answer="1"]').click();$('[data-answer="1"]').click();
  assert.equal(exits.length,1);assert.equal($('#nextQuestion').disabled,true);assert.ok($('[data-question="0"]'));
  $('#nextQuestion').click();assert.match($('#questionTitle').textContent,/换号码/);
  exits[0].finish();assert.equal($('[data-question="0"]'),null);assert.equal($('#nextQuestion').disabled,false);assert.equal($('#quizRemaining').textContent,'5 / 6');
  $('#nextQuestion').click();assert.strictEqual($('.practice-frame'),frame);assert.match($('#questionTitle').textContent,/视频/);
});

test('pause and close settle an interrupted local question swap once, without leaving invisible text',async t=>{
  const swaps=[];const {$,goto}=setup(t,{animate(target,params){
    if(target?.id==='practiceStage'){target.style.opacity='.16';target.style.transform='translateY(-8px)';const animation={params,cancel(){animation.cancelled=true;}};swaps.push(animation);return animation;}
    params.onComplete?.();return {pause(){},resume(){},cancel(){},complete(){params.onComplete?.();}};
  }});await goto('practice');
  const frame=$('.practice-frame');$('[data-answer="1"]').click();$('#nextQuestion').click();$('#nextQuestion').click();assert.equal(swaps.length,1);
  $('#motionButton').click();assert.equal(swaps[0].cancelled,true);assert.equal($('#practiceStage').style.opacity,'1');assert.equal($('#practiceStage').style.transform,'none');assert.match($('#questionTitle').textContent,/视频/);assert.strictEqual($('.practice-frame'),frame);
  swaps[0].params.onComplete();assert.match($('#questionTitle').textContent,/视频/,'stale completion cannot advance twice');
  $('#motionButton').click();$('[data-answer="2"]').click();$('#nextQuestion').click();assert.equal(swaps.length,2);
  await goto('home');assert.equal(swaps[1].cancelled,true);await goto('practice');
  assert.match($('#questionTitle').textContent,/验证码/);assert.equal($('#practiceStage').style.opacity,'');assert.equal($('#scoreCount').textContent,'已答对 2 题');assert.equal($('#feedback').textContent,'');
  swaps[1].params.onComplete();assert.match($('#questionTitle').textContent,/验证码/);
});

test('advancing from scrolled feedback brings the next material into the workspace viewport',async t=>{
  const {$,goto,w}=setup(t,{reduced:true});await goto('practice');
  const body=$('#workspaceBody'),stage=$('#practiceStage');body.scrollTop=600;
  body.getBoundingClientRect=()=>({top:100,bottom:800});stage.getBoundingClientRect=()=>({top:-350,bottom:1100});
  $('[data-answer="1"]').click();$('#nextQuestion').click();
  assert.ok(body.scrollTop<600&&body.scrollTop>=0,'only the workspace scroll position is brought back to the new material');
  assert.equal(w.scrollY,0);assert.equal(w.document.activeElement.id,'questionTitle');assert.match($('#questionTitle').textContent,/视频/);
});


test('practice navigation stays outside scrolling feedback and waits for the ticket exit before continuing',async t=>{
  const exits=[];const {$,goto,w}=setup(t,{createLayout(){return {revert(){},update(change,params){change();const exit={finish:params.onComplete,complete(){params.onComplete();}};exits.push(exit);return exit;}};}});await goto('practice');
  const dock=$('#practiceDock'),button=$('#nextQuestion'),body=$('#workspaceBody'),surface=$('.workspace-surface');
  assert.strictEqual(dock.parentElement,surface);assert.strictEqual(dock.nextElementSibling,$('.workspace-footer'));assert.equal(body.contains(dock),false);
  assert.equal(surface.classList.contains('has-practice'),true);assert.equal(button.disabled,true);assert.match($('#practiceDockHint').textContent,/选择一个答案/);
  button.click();assert.match($('#questionTitle').textContent,/换号码/);
  $('[data-answer="1"]').click();assert.equal(button.disabled,true);assert.equal($('#feedback #nextQuestion'),null);assert.equal($('#feedback').tabIndex,0);
  body.scrollTop=900;$('#feedback').scrollTop=300;exits[0].finish();
  assert.strictEqual($('#nextQuestion'),button);assert.equal(button.disabled,false);assert.strictEqual(button.closest('nav'),dock);
  button.click();assert.strictEqual($('#practiceDock'),dock);assert.strictEqual($('#nextQuestion'),button);assert.equal(button.disabled,true);
  assert.equal($('#practiceDockStep').textContent,'情景 02 / 06');assert.match($('#practiceDockHint').textContent,/选择一个答案/);
  assert.equal(w.document.querySelectorAll('#nextQuestion').length,1);assert.equal($('#feedback').textContent,'');
});

test('practice dock remains through completion and restart, and does not leak into other modules',async t=>{
  const {$,goto,w}=setup(t,{reduced:true});await goto('practice');const dock=$('#practiceDock'),button=$('#nextQuestion');
  for(const [index,q] of quiz.entries()){
    $(`[data-answer="${q.correct}"]`).click();
    if(index===quiz.length-1)assert.match(button.textContent,/查看本轮结果/);
    button.click();assert.strictEqual($('#practiceDock'),dock);
  }
  assert.strictEqual($('#restartQuiz'),button);assert.equal($('#nextQuestion'),null);assert.equal($('#workspaceBody #restartQuiz'),null);assert.match($('#practiceDockHint').textContent,/6 \/ 6/);
  button.click();assert.strictEqual($('#practiceDock'),dock);assert.strictEqual($('#nextQuestion'),button);assert.equal(button.disabled,true);assert.equal(w.document.querySelectorAll('.quiz-tile').length,6);
  $('[data-answer="1"]').click();await goto('contacts');assert.equal($('#practiceDock'),null);assert.equal($('.workspace-surface').classList.contains('has-practice'),false);
  await goto('practice');assert.equal($('#nextQuestion').disabled,false);assert.equal($('#scoreCount').textContent,'已答对 1 题');assert.equal(w.document.querySelectorAll('#practiceDock').length,1);
  await goto('home');assert.equal($('#practiceDock'),null);assert.equal($('.workspace-surface').classList.contains('has-practice'),false);
});


test('the familiar-voice premise remains readable in the narrow-screen audio case',async t=>{
  const {$,goto,w}=setup(t,{reduced:true});await goto('practice');
  for(const q of quiz.slice(0,4)){$(`[data-answer="${q.correct}"]`).click();$('#nextQuestion').click();}
  const style=w.document.createElement('style');style.textContent=readFileSync(new URL('../src/practice.css',import.meta.url),'utf8');w.document.head.append(style);
  // JSDOM has no viewport media evaluation. Apply the real stylesheet's rules
  // for each target viewport to verify content visibility, not browser geometry.
  const rules=[...style.sheet.cssRules];
  const atViewport=(list,width,height)=>list.flatMap(rule=>{
    if(rule.type===w.CSSRule.STYLE_RULE)return [rule.cssText];
    if(rule.type!==w.CSSRule.MEDIA_RULE)return [];
    const applies=rule.conditionText.split(/\s+and\s+/).every(part=>{
      const match=part.trim().match(/^\((max|min)-(width|height):\s*(\d+)px\)$/);if(!match)return false;
      const actual=match[2]==='width'?width:height,limit=+match[3];return match[1]==='max'?actual<=limit:actual>=limit;
    });
    return applies?atViewport([...rule.cssRules],width,height):[];
  });
  for(const [width,height] of [[320,640],[390,844]]){
    style.textContent=atViewport(rules,width,height).join('\n');
    const premise=$('#practiceMaterial .sender-meta');assert.match(premise.textContent,/声音熟悉/);
    for(let node=premise;node&&node!==w.document.body;node=node.parentElement)assert.notEqual(w.getComputedStyle(node).display,'none',`familiar voice remains visible at ${width}px`);
  }
});


test('configured API submits the selected screenshot once with the existing multipart contract',async t=>{
  const calls=[];const {$,goto,w,selectFile}=setup(t,{apiBase:'https://service.test/api/',delay:()=>new Promise(()=>{}),fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({job_id:'job-remote'})};}});
  await goto('check');$('#type-chat').click();await selectFile(new w.File(['pixels'],'chat.png',{type:'image/png'}));const button=$('#analyzeButton');button.click();button.click();await tick();
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://service.test/api/analyze');assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.body.get('file').name,'chat.png');assert.equal(calls[0].options.body.get('scene'),'chat');assert.equal(calls[0].options.body.get('context'),'');
  assert.deepEqual(JSON.parse(w.sessionStorage.getItem('qinan-active-task')),{id:'job-remote',source:'https://service.test/api'});
});

test('old samples never populate the formal history list',async t=>{
  const sample={id:'demo-old',demo:true,name:'旧文件'};const {$,goto}=setup(t,{storage:{'qinan-demo-history':JSON.stringify([sample]),'qinan-real-mode':'false'}});
  await goto('history');assert.ok($('#firstCheck'));assert.equal($('[data-report]'),null);assert.doesNotMatch($('#historyList').textContent,/旧文件|演示/);
});

test('a legacy pending job resumes against the default API without uploading again',async t=>{
  const calls=[];const {$,goto,w}=setup(t,{session:{'qinan-active-job':'old-job'},delay:async()=>{},fetch:async url=>{calls.push(url);return {ok:true,json:async()=>({status:'completed',result:{id:'saved-case',filename:'saved.mp3',summary:'已从保存的报告恢复',modules:{}}})};}});
  await goto('check');$('#resumeTask').click();await tick();
  assert.deepEqual(calls,['/api/jobs/old-job']);assert.ok($('#exportReport'));assert.equal(w.sessionStorage.getItem('qinan-active-job'),null);
});

test('tasks from another API are not offered for recovery',async t=>{
  let calls=0;const {$,goto}=setup(t,{apiBase:'https://new.test/api',session:{'qinan-active-task':JSON.stringify({id:'foreign-job',source:'https://old.test/api'}),'qinan-active-job':'old-job'},fetch:async()=>{calls++;return {ok:true,json:async()=>[]};}});
  await goto('check');assert.equal($('#resumeTask'),null);assert.equal(calls,0);
});

test('poll failures retain the task and selected file; explicit recovery completes without a second POST',async t=>{
  const waits=[];let posts=0,polls=0;
  const {$,goto,w,selectFile}=setup(t,{delay:()=>new Promise(r=>waits.push(r)),fetch:async url=>{
    if(url.endsWith('/analyze')){posts++;return {ok:true,json:async()=>({job_id:'recoverable'})};}
    polls++;return polls<=3?{ok:false,status:503,json:async()=>({})}:{ok:true,json:async()=>({status:'completed',result:{id:'case-recovered',filename:'voice.mp3',modules:{}}})};
  }});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();
  for(let i=0;i<3;i++){waits[i]();await tick();}
  assert.match($('#fileError').textContent,/任务已保留/);assert.equal($('.selected-name').textContent,'voice.mp3');assert.ok($('#resumeTask'));
  $('#resumeTask').click();await tick();waits[3]();await tick();assert.equal(posts,1);assert.ok($('#exportReport'));assert.equal(w.sessionStorage.getItem('qinan-active-task'),null);
});

test('an incomplete completed-job response cannot produce a successful report',async t=>{
  const {$,goto,w,selectFile}=setup(t,{delay:async()=>{},fetch:async url=>({ok:true,json:async()=>url.endsWith('/analyze')?{job_id:'bad-job'}:{status:'completed',result:{}}})});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();
  assert.match($('#fileError').textContent,/无法读取|格式有误/);assert.ok($('#resumeTask'));assert.equal($('#exportReport'),null);assert.equal($('.selected-name').textContent,'voice.mp3');
});

test('service reports preserve escaped summaries, partial module states and collapsed complete data',async t=>{
  const report={id:'case-direct',filename:'voice.mp3',summary:'<script>unsafe()</script>真实摘要',modules:{audio:{status:'failed'},image:{status:'completed',score:0,threshold:.5}},next_steps:['拨打已保存的号码']};
  const {$}=setup(t,{url:'https://qinan.test/#report/case-direct',fetch:async()=>({ok:true,json:async()=>report})});await tick();
  assert.equal($('#workspaceBody script'),null);assert.match($('.result-banner').textContent,/<script>unsafe/);assert.match($('[data-status="unavailable"]').textContent,/未形成判断/);assert.ok($('[data-status="below"]'));
  assert.equal($('.report-details').open,false);assert.match($('.raw-report').textContent,/case-direct/);assert.match($('.report-next').textContent,/拨打已保存/);
});

test('homepage motion receives pause/finish lifecycle and real portal identity',async t=>{
  const calls=[],focus=[];const {$,goto,w}=setup(t,{homeMotion:{finish(){calls.push('finish');},setPaused(value){calls.push(value);},destroy(){calls.push('destroy');}},visual:{setPortalFocus(value){focus.push(value);}}});
  $('.node-check').dispatchEvent(new w.Event('focus'));assert.equal(focus.at(-1).portalId,'check');
  $('#motionButton').click();assert.ok(calls.includes(true));await goto('check');assert.ok(calls.includes('finish'));
});

test('system reduced motion reports the effective state without overwriting the saved manual preference',t=>{
  const {$,w,setReduced}=setup(t,{reduced:true,storage:{'qinan-motion-paused':'true'}});
  assert.equal($('#motionState').textContent,'MOTION OFF');
  $('#motionButton').click();
  assert.equal(w.localStorage.getItem('qinan-motion-paused'),'false','restore clears only the manual pause preference');
  assert.equal($('#motionState').textContent,'MOTION OFF','system reduction still controls effective motion');
  assert.equal($('#motionButton').dataset.paused,'true');
  assert.match($('#toast').textContent,/系统.*减少动态/);
  assert.doesNotMatch($('#toast').textContent,/已恢复/);
  assert.match($('#motionButton').textContent,/系统.*减少动态/);
  setReduced(false);
  assert.equal($('#motionState').textContent,'MOTION ON','removing the system preference restores the saved enabled choice');
  $('#motionButton').click();
  assert.equal(w.localStorage.getItem('qinan-motion-paused'),'true');
  setReduced(true);setReduced(false);
  assert.equal($('#motionState').textContent,'MOTION OFF','system changes do not discard an explicit manual pause');
  assert.equal(w.localStorage.getItem('qinan-motion-paused'),'true');
});

test('unreadable video metadata exposes a nonblocking service-validation warning and preserves the upload',async t=>{
  const calls=[];
  const {$,goto,w,selectFile}=setup(t,{delay:()=>new Promise(()=>{}),fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({job_id:'metadata-unreadable'})};}});
  await goto('check');$('#type-video').click();
  const create=w.document.createElement.bind(w.document);let metadata;
  w.document.createElement=(tag,...args)=>{const node=create(tag,...args);if(tag==='video')metadata=node;return node;};
  await selectFile(new w.File(['unreadable-video'],'unknown.avi',{type:'video/x-msvideo'}));
  assert.equal($('#analyzeButton').disabled,true,'submission waits for the metadata attempt');
  assert.ok(metadata);metadata.onerror();await tick();
  const warning=$('#fileWarning');
  assert.ok(warning);assert.equal(warning.getAttribute('role'),'status');
  assert.match(warning.textContent,/无法.*时长/);assert.match(warning.textContent,/服务|核验/);
  assert.equal($('#fileError').textContent,'','an unknown duration is explained as a warning, not a failed upload');
  assert.equal($('#analyzeButton').disabled,false);
  assert.equal($('.selected-name').textContent,'unknown.avi');
  $('#analyzeButton').click();await tick();
  assert.equal(calls.length,1);assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.body.get('file').name,'unknown.avi');
});

test('removing an unverified video clears its warning before choosing a new material type',async t=>{
  const {$,goto,w,selectFile}=setup(t);await goto('check');$('#type-video').click();
  const create=w.document.createElement.bind(w.document);let metadata;
  w.document.createElement=(tag,...args)=>{const node=create(tag,...args);if(tag==='video')metadata=node;return node;};
  await selectFile(new w.File(['video'],'unknown.mp4',{type:'video/mp4'}));metadata.onerror();await tick();
  assert.ok($('#fileWarning').textContent);
  $('#removeFile').click();assert.equal($('#fileWarning').textContent,'');
  $('#type-image').click();await selectFile(new w.File(['photo'],'safe.png',{type:'image/png'}));
  assert.equal($('#fileWarning').textContent,'');assert.equal($('#fileError').textContent,'');assert.equal($('#analyzeButton').disabled,false);
});

test('destroy detaches persistent controls and suppresses a late sculpture result',async t=>{
  const sculpture=pending();let toggles=0;
  const {$,w,app,setReduced}=setup(t,{visual:{toggleForm(){toggles++;return sculpture.promise;}}});
  const scatter=$('#scatterButton');scatter.click();assert.equal(toggles,1);
  app.destroy();
  const snapshot={html:scatter.innerHTML,busy:scatter.getAttribute('aria-busy'),disabled:scatter.disabled,motion:$('#motionState').textContent,stored:w.localStorage.getItem('qinan-motion-paused')};
  for(const selector of ['#helpButton','#howItWorks','#settings','#motionButton','#startCheck','#closeWorkspace'])$(selector).click();
  setReduced(true);
  assert.equal($('#modal').open,false);assert.equal($('#workspace').open,false);
  assert.equal(w.location.hash,'','persistent controls cannot navigate after destruction');
  assert.equal($('#motionState').textContent,snapshot.motion);assert.equal(w.localStorage.getItem('qinan-motion-paused'),snapshot.stored);
  sculpture.resolve('slogan');await tick();
  assert.equal(scatter.innerHTML,snapshot.html,'a late form result cannot repaint a destroyed view');
  assert.equal(scatter.getAttribute('aria-busy'),snapshot.busy);assert.equal(scatter.disabled,snapshot.disabled);
  scatter.disabled=false;scatter.click();assert.equal(toggles,1,'the old sculpture handler is detached');
  $('#modal').dispatchEvent(new w.Event('cancel',{cancelable:true}));
  $('#workspace').dispatchEvent(new w.Event('cancel',{cancelable:true}));
  assert.equal(w.location.hash,'');
});

test('native processing status remains live and follows the actual backend message without an island',async t=>{
  const submit=pending(),waits=[];
  const {$,goto,w,selectFile}=setup(t,{delay:()=>new Promise(resolve=>waits.push(resolve)),fetch:url=>url.endsWith('/analyze')?submit.promise:Promise.resolve({ok:true,json:async()=>({status:'processing',message:'服务正在核验声音片段'})})});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();
  const progress=$('#progressTitle');
  assert.ok(progress.closest('[role="status"],[aria-live="polite"],[aria-live="assertive"]'),'native fallback has a live region independent of the optional island');
  assert.match(progress.textContent,/提交/);
  submit.resolve({ok:true,json:async()=>({job_id:'native-status'})});await tick();
  waits[0]();await tick();
  assert.equal($('#progressTitle').textContent,'服务正在核验声音片段');
  assert.ok($('#progressTitle').closest('[role="status"],[aria-live="polite"],[aria-live="assertive"]'));
  assert.equal($('[data-slot="ai-status"]'),null);
});

test('streamed partial text remains escaped and survives lazy status hydration and route changes until a validated report completes',async t=>{
  let socket,posts=0;const islands={};
  const stream=new ReadableStream({start(controller){socket=controller;}});
  const encoder=new TextEncoder();
  const send=(id,event,data)=>socket.enqueue(encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  const {$,goto,w,selectFile,app}=setup(t,{islands,fetch:async url=>{
    if(url.endsWith('/analyze')){posts++;return {ok:true,json:async()=>({job_id:'stream-live',events_url:'/api/jobs/stream-live/events'})};}
    if(url.endsWith('/events'))return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});
    throw new Error(`Unexpected request ${url}`);
  }});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();
  send('1','delta',{text:'服务片段：<img src=x onerror=alert(1)>'});
  await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal($('#streamPanel').hidden,false);assert.match($('#streamText').textContent,/<img src=x/);assert.equal($('#streamText img'),null);
  assert.equal($('#exportReport'),null,'partial output is never presented as a completed report');
  const received=$('#streamText').textContent;Object.assign(islands,trackedIslands());app.refreshIslands();
  assert.equal($('#streamText').textContent,received,'lazy status hydration retains the partial content');
  const log=$('#streamText');Object.defineProperty(log,'scrollHeight',{value:500,configurable:true});Object.defineProperty(log,'clientHeight',{value:100,configurable:true});log.scrollTop=50;
  send('2','delta',{text:'\n第二个片段。'});await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(log.scrollTop,50,'new fragments do not pull someone away from earlier text');
  await goto('contacts');const form=$('#contactForm');
  send('3','completed',{result:{id:'stream-report',summary:'服务最终报告',modules:{}}});await tick();
  assert.equal($('#contactForm'),form,'a completed background stream does not hijack navigation');
  assert.equal(w.sessionStorage.getItem('qinan-active-task'),null);
  await goto('report/stream-report');assert.ok($('#exportReport'));assert.match($('.result-banner').textContent,/服务最终报告/);assert.equal(posts,1);
});

test('destroy cancels a streaming reader and pending text batch without reopening or repainting the interface',async t=>{
  let socket,cancelled=0,streamSignal;
  const stream=new ReadableStream({start(controller){socket=controller;},cancel(){cancelled++;}});
  const {$,goto,w,selectFile,app}=setup(t,{fetch:async(url,options)=>{
    if(url.endsWith('/analyze'))return {ok:true,json:async()=>({job_id:'stream-dispose',events_url:'/api/jobs/stream-dispose/events'})};
    streamSignal=options.signal;return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});
  }});
  await goto('check');await selectFile(new w.File(['voice'],'voice.mp3'));$('#analyzeButton').click();await tick();
  socket.enqueue(new TextEncoder().encode('id: 1\nevent: delta\ndata: {"text":"待显示片段"}\n\n'));
  await tick();app.destroy();await new Promise(resolve=>setTimeout(resolve,55));
  assert.equal(streamSignal.aborted,true);assert.equal(cancelled,1);assert.equal($('#streamText'),null);assert.equal($('#workspaceBody').textContent,'');
  $('#helpButton').click();assert.equal($('#modal').open,false);assert.equal($('#scatterButton').disabled,false);
});

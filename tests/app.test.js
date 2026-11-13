import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initApp,moduleResult} from '../src/app.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,8));
const pending=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function setup(t,options={}){
  const dom=new JSDOM(html,{url:options.url||'https://qinan.test/',pretendToBeVisual:true});
  const w=dom.window;const errors=[];w.addEventListener('error',ev=>errors.push(ev.error));
  w.matchMedia=()=>({matches:!!options.reduced,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.HTMLMediaElement.prototype.load=function(){};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=options.fetch||(()=>Promise.reject(new TypeError('offline')));
  for(const [key,value] of Object.entries(options.storage||{}))w.localStorage.setItem(key,value);
  const keys=['window','document','location','innerWidth','URL','File','Blob','FormData'];const previous={};
  for(const key of keys){previous[key]=globalThis[key];globalThis[key]=key==='innerWidth'?1440:w[key];}
  let objectCount=0;const revoked=[];URL.createObjectURL=()=>`blob:test-${++objectCount}`;URL.revokeObjectURL=url=>revoked.push(url);
  const animations=[];
  const motion={animate(target,params){animations.push({target,params});if(params.onComplete)params.onComplete();return {pause(){},resume(){},cancel(){},complete(){params.onComplete?.();}};},utils:{remove(){}},createSpring:()=> 'linear'};
  const visual={pause(){},resume(){},focus(){},async toggleForm(){return 'slogan';},dispose(){},...options.visual};
  const app=initApp({...motion,visual,islands:options.islands,startReady:options.startReady,...(options.delay?{delay:options.delay}:{})});
  const $=s=>w.document.querySelector(s);
  const goto=async hash=>{w.location.hash=hash;await tick();};
  const selectFile=async file=>{Object.defineProperty($('#fileInput'),'files',{value:[file],configurable:true});$('#fileInput').dispatchEvent(new w.Event('change'));await tick();};
  t.after(()=>{app.destroy();w.close();for(const key of keys)globalThis[key]=previous[key];assert.deepEqual(errors,[],'No uncaught UI errors');});
  return {w,$,goto,selectFile,animations,revoked,app};
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
  assert.equal(animations.length,count,'type switches do not replay any entrance animation');
  assert.equal($('#fileInput').accept,'.jpg,.jpeg,.png,.webp');
});

test('type tabs support arrow keys without rebuilding the page',async t=>{
  const {$,goto,w}=setup(t);await goto('check');
  const panel=$('#uploadPanel');$('#type-audio').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.strictEqual($('#uploadPanel'),panel);assert.equal(w.document.activeElement.id,'type-video');
  assert.equal($('#type-video').getAttribute('aria-selected'),'true');
});

test('the sculpture control prevents duplicate morphs and updates its label only after settling',async t=>{
  const morph=pending();let calls=0;
  const {$}=setup(t,{visual:{toggleForm(){calls++;return morph.promise;}}});
  const control=$('#scatterButton');control.click();control.click();
  assert.equal(calls,1);assert.equal(control.disabled,true);assert.equal(control.getAttribute('aria-busy'),'true');
  assert.match(control.textContent,/化作安心标语/);
  morph.resolve('slogan');await tick();
  assert.equal(control.disabled,false);assert.equal(control.getAttribute('aria-busy'),'false');assert.match(control.textContent,/复原为盾牌/);
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

test('quiz answers update in place and repeated clicks do not increase the score',async t=>{
  const {$,goto}=setup(t);await goto('practice');
  const card=$('.question-card');assert.equal(wrongCount(),6);function wrongCount(){return $('#workspaceBody').querySelectorAll('.quiz-tile').length;}$('[data-answer="1"]').click();assert.equal(wrongCount(),5);
  assert.strictEqual($('.question-card'),card);assert.equal($('#scoreCount').textContent,'已答对 1 题');
  $('[data-answer="1"]').click();assert.equal($('#scoreCount').textContent,'已答对 1 题');
  assert.match($('#feedback').textContent,/这一步/);$('#nextQuestion').click();assert.match($('.question-meta').textContent,/02/);
});

test('finishing a demo after leaving does not hijack the current page',async t=>{
  const waits=[];const {$,goto,w}=setup(t,{delay:()=>new Promise(r=>waits.push(r))});
  $('#watchDemo').click();$('#runDemo').click();await tick();assert.ok($('#progressTitle'));
  await goto('contacts');const form=$('#contactForm');
  for(let i=0;i<3;i++){assert.ok(waits[i]);waits[i]();await tick();}
  assert.strictEqual($('#contactForm'),form);assert.equal(w.location.hash,'#contacts');
  assert.equal(JSON.parse(w.localStorage.getItem('qinan-demo-history')).length,1);
  await goto('history');$('[data-report]').click();await tick();assert.match($('#workspaceTitle').textContent,/核验报告/);
  assert.match($('.mode-notice').textContent,/虚构示例/);
});

test('a late history request failure cannot overwrite a newer view',async t=>{
  const history=pending();
  const {$,goto}=setup(t,{storage:{'qinan-real-mode':'true'},fetch:url=>url==='/api/health'?Promise.resolve({ok:true,json:async()=>({models:{audio:true,video:true}})}):history.promise});
  await goto('history');await goto('contacts');const form=$('#contactForm');
  history.reject(new TypeError('offline'));await tick();
  assert.strictEqual($('#contactForm'),form);assert.equal($('#historyList'),null);
});

test('changing real/demo mode ignores stale health responses',async t=>{
  const health=pending();const {$}=setup(t,{fetch:()=>health.promise});
  $('#settings').click();$('#realMode').click();$('#demoMode').click();
  health.resolve({ok:true,json:async()=>({models:{audio:true,video:true}})});await tick();
  assert.equal($('#modeLabel').textContent,'交互演示');assert.equal($('#modal').open,true);
});

test('malformed stored data does not break the interface',async t=>{
  const {$,goto}=setup(t,{storage:{'qinan-contacts':'{"invalid":true}','qinan-demo-history':'null','qinan-motion-paused':'true'}});
  assert.equal($('#motionState').textContent,'MOTION OFF');
  await goto('contacts');assert.equal($('#contactCount').textContent,'/ 0');await goto('history');assert.ok($('#firstCheck'));
});

test('a saved demo report can be reopened directly after a refresh',t=>{
  const report={id:'demo-saved',demo:true,name:'已保存示例',date:'2026-11-13T08:00:00Z'};
  const {$}=setup(t,{url:'https://qinan.test/#report/demo-saved',storage:{'qinan-demo-history':JSON.stringify([report])}});
  assert.equal($('#workspace').open,true);assert.match($('.page-heading').textContent,/已保存示例/);assert.ok($('#exportReport'));
});

test('report logic respects per-segment thresholds and uncertain image scores',()=>{
  assert.equal(moduleResult({status:'completed',score:.4,threshold:.7,segments:[{score:.65,threshold:.5}]}).status,'flagged');
  assert.equal(moduleResult({status:'completed',segments:[{score:.72,threshold:.7}]}).status,'flagged');
  assert.equal(moduleResult({status:'completed',score:.008,threshold:.5,sensitivity_threshold:.007}).status,'uncertain');
  assert.equal(moduleResult({status:'failed',score:.9}).status,'unavailable');
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

test('inline status follows actual demo stages and is explicitly labeled as a simulation',async t=>{
  const islands=trackedIslands(),waits=[];const {$}=setup(t,{islands,delay:()=>new Promise(r=>waits.push(r))});
  $('#watchDemo').click();$('#runDemo').click();await tick();
  const status=islands.statuses[0];assert.equal(status.props.state,'thinking');assert.match(status.props.detail,/交互演示/);
  waits[0]();await tick();assert.equal(status.props.state,'analyzing');
  waits[1]();await tick();assert.equal(status.props.state,'writing');
  $('#motionButton').click();assert.equal(status.props.paused,true);
  waits[2]();await tick();assert.equal(status.destroyed,true);assert.equal(status.connectedOnDestroy,true);assert.ok($('#exportReport'));
});

test('picker focus-return fallback settles the folder without discarding the previous file',async t=>{
  const islands=trackedIslands();const {$,goto,w,selectFile,revoked}=setup(t,{islands});await goto('check');
  await selectFile(new w.File(['voice'],'voice.mp3',{type:'audio/mpeg'}));
  const upload=islands.uploads[0];$('#fileInput').click=()=>{};$('[data-folder]').click();
  w.dispatchEvent(new w.Event('focus'));await new Promise(resolve=>setTimeout(resolve,280));
  assert.equal(upload.props.open,false);assert.equal(upload.props.file.name,'voice.mp3');assert.equal(revoked.length,0);
  assert.equal($('#analyzeButton').disabled,false);
});

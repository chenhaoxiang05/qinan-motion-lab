import { icon } from './icons.js';
import { quiz } from './quiz.js';
import { createWorkspaceTransitions } from './transitions.js';
import { createWorkspaceDismiss } from './workspace-dismiss.js';
import { createApiClient } from './api-client.js';
import { createWorkspaceIntro } from './workspace-intro.js';
import { guideMarkup, mountUsageGuide } from './usage-guide.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fileTypes = {
  audio: { label:'声音', icon:'sound', accept:'.wav,.mp3,.m4a,.flac,.ogg', hint:'MP3 / WAV / M4A / FLAC / OGG', detail:'单个文件不超过 100MB' },
  video: { label:'视频', icon:'video', accept:'.mp4,.mov,.avi,.webm', hint:'MP4 / MOV / AVI / WEBM', detail:'不超过 100MB，时长不超过 3 分钟' },
  image: { label:'照片', icon:'image', accept:'.jpg,.jpeg,.png,.webp', hint:'JPG / PNG / WEBP', detail:'单张照片不超过 100MB' },
  chat: { label:'截图', icon:'chat', accept:'.jpg,.jpeg,.png,.webp', hint:'JPG / PNG / WEBP', detail:'每次一张聊天截图，不超过 100MB' }
};
const pages = { check:['检查材料','01'],contacts:['联系家人','02'],practice:['情景练习','03'],history:['核验记录','04'],report:['核验报告','01'] };

export function moduleResult(module) {
  const threshold = Number.isFinite(module.threshold) ? module.threshold : .5;
  const scores = [];
  if (Number.isFinite(module.score)) scores.push({score:module.score,threshold});
  for (const segment of Array.isArray(module.segments) ? module.segments : []) {
    const segmentThreshold=Number.isFinite(segment?.threshold)?segment.threshold:threshold;
    if (Number.isFinite(segment?.score)) scores.push({score:segment.score,threshold:segmentThreshold});
  }
  const secondary = module.secondary_check;
  if (secondary && Number.isFinite(secondary.score) && Number.isFinite(secondary.threshold)) scores.push(secondary);
  if (module.status !== 'completed' || !scores.length) return {status:'unavailable',threshold};
  if (scores.some(s=>s.score>=s.threshold)) return {status:'flagged',threshold};
  if (Number.isFinite(module.sensitivity_threshold) && Number.isFinite(module.score) && module.score>=module.sensitivity_threshold) return {status:'uncertain',threshold};
  return {status:'below',threshold};
}

export function initApp({animate,utils,createSpring,createLayout,visual,islands={},homeMotion={},apiBase=import.meta.env?.VITE_API_BASE_URL||'/api',startReady=null,entryDuration,delay=ms=>new Promise(r=>setTimeout(r,ms))}) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const body = $('#workspaceBody'), workspace = $('#workspace'), modal = $('#modal');
  $$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  $('#closeWorkspace').innerHTML='返回主页 '+icon('close');
  if($('.mini-signal'))$('.mini-signal').innerHTML=Array.from({length:10},(_,i)=>`<i style="height:${7+Math.sin(i*1.8)**2*15}px;animation-delay:${-i*.15}s"></i>`).join('');
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = getStored('qinan-motion-paused','false') === 'true' || mediaQuery.matches;
  const api=createApiClient({baseUrl:apiBase,fetchImpl:(...args)=>window.fetch(...args)});
  let contacts = readArray('qinan-contacts').filter(c=>c && typeof c.name==='string' && typeof c.phone==='string');
  const legacyRecords = readArray('qinan-demo-history').filter(r=>r && typeof r.id==='string' && r.demo);
  let destroyed=false, startupPending=!!startReady;
  let uploadIsland=null, uploadHost=null, statusIsland=null, pickerPending=false, pickerReturnTimer=null, dragDepth=0;
  let page='home', routeRevision=0, viewController=null;
  let type='audio',selectedFile=null,previewURL=null,selectionRevision=0,validating=false,validationCleanup=null,fileError='';
  let activeTask=null, currentReport=null, currentQuiz=0, answer=null, correctCount=0, mistakes=[];
  let practiceCounter=null, practiceFaq=null, practiceFaqValue=null, practiceFaqItems=[], questionSwap=null, practiceDock=null;
  let lastPortal=null, toastTimer=null, quizLayout=null, quizExit=null, feedbackAnimation=null, windowReady=false, modalAnimation=null, modalRevision=0, guide=null;
  const pointerDisposers=[];
  const motionEnabled=()=>!paused&&!mediaQuery.matches;
  const entry=createWorkspaceIntro({host:body,animate,motionEnabled,getIslands:()=>islands,duration:entryDuration,onReady(){windowReady=transitions.state==='open';updatePracticeDock();}});
  const transitions=createWorkspaceTransitions({
    dialog:workspace,surface:$('.workspace-surface'),backdrop:$('#workspaceBackdrop'),portals:$$('.portal-node'),
    animate,createLayout,motionEnabled,
    onBusy(){if(transitions.state==='closing')entry.cancel();windowReady=false;finishQuestionSwap();updatePracticeDock();finishFeedback();pauseAmbient();finishQuizExit();visual.setPortalFocus?.(null);visual.focus(transitions.state!=='closing');},
    onHome(){visual.focus(false);},
    onClosed(){windowReady=false;disposeView();body.innerHTML='';},
    onOpened(){entry.start();if(!entry.pending){windowReady=true;updatePracticeDock();}},
  });
  const exteriorDismiss=createWorkspaceDismiss({dialog:workspace,surface:$('.workspace-surface'),canDismiss:()=>transitions.state==='open'&&!modal.open&&!pickerPending,onDismiss:()=>go('home')});
  const e=escapeHTML;
  const heading=(label,title,desc)=>`<div class="page-heading"><span class="eyebrow">${label}</span><h1>${title}</h1><p>${desc}</p></div>`;

  function getStored(key,fallback,storage='localStorage') {try{return window[storage].getItem(key)??fallback;}catch{return fallback;}}
  function setStored(key,value,storage='localStorage') {try{window[storage].setItem(key,value);return true;}catch{return false;}}
  function removeStored(key,storage='localStorage') {try{window[storage].removeItem(key);}catch{/* Storage may be unavailable in private browsing. */}}
  function readArray(key){try{const parsed=JSON.parse(getStored(key,'[]'));return Array.isArray(parsed)?parsed:[];}catch{return [];}}
  function saveArray(key,value){const saved=setStored(key,JSON.stringify(value));if(!saved)toast('当前浏览器无法保存数据，请检查存储设置。');return saved;}
  function toast(text){
    const el=$('#toast');el.textContent=text;
    if(typeof el.showPopover==='function'){if(!el.matches(':popover-open'))el.showPopover();}
    else (modal.open?modal:workspace.open?workspace:document.body).append(el);
    el.classList.add('visible');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{el.classList.remove('visible');if(typeof el.hidePopover==='function')el.hidePopover();},3800);
  }
  function normalizeModal(){modal.style.opacity='1';modal.style.transform='none';}
  function settleModal(){
    modalRevision++;const animation=modalAnimation;modalAnimation=null;
    try{animation?.cancel?.();}catch{/* The visible terminal state is independent of the engine. */}
    utils.remove(modal);normalizeModal();
  }
  function openModal(html){
    const alreadyOpen=modal.open;
    settleModal();guide?.destroy();guide=null;
    utils.remove($('#modalBody').querySelectorAll('*'));
    $('#modalBody').innerHTML=html;
    if(!alreadyOpen){
      modal.showModal();
      if(motionEnabled()){
        const revision=modalRevision;let completed=false;
        const finish=()=>{if(revision!==modalRevision)return;completed=true;modalAnimation=null;normalizeModal();};
        try{
          const animation=animate(modal,{opacity:[0,1],scale:[.96,1],y:[15,0],duration:360,ease:'outExpo',onComplete:finish});
          if(!completed)modalAnimation=animation;
        }catch{settleModal();}
      }
    }
  }
  function closeModal(){settleModal();guide?.destroy();guide=null;if(modal.open)modal.close();}
  const cancelModal=event=>{event.preventDefault();closeModal();};
  const modalVisibility=()=>{if(document.hidden)settleModal();};
  $('#closeModal').onclick=closeModal;
  modal.addEventListener('cancel',cancelModal);
  document.addEventListener('visibilitychange',modalVisibility);
  modal.addEventListener('click',ev=>{if(ev.target===modal){const r=modal.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)closeModal();}});

  const request=(path,options={},signal=null,timeout=25000)=>api.request(path,options,signal,timeout);
  function pendingJob(){
    const raw=getStored('qinan-active-task','','sessionStorage');
    if(raw){try{const task=JSON.parse(raw);if(task&&typeof task.id==='string'&&task.source===api.source)return task.id;}catch{/* Ignore malformed session state. */}return '';}
    return api.baseUrl==='/api'?getStored('qinan-active-job','','sessionStorage'):'';
  }
  function savePendingJob(id){
    if(setStored('qinan-active-task',JSON.stringify({id,source:api.source}),'sessionStorage'))removeStored('qinan-active-job','sessionStorage');
  }
  function clearPendingJob(id){
    if(pendingJob()!==id)return;
    removeStored('qinan-active-task','sessionStorage');removeStored('qinan-active-job','sessionStorage');
  }
  function reportFromResponse(data){
    if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.id!=='string'||!data.id)throw new Error('这份报告暂时无法读取，请稍后重试。');
    return {...data,demo:false};
  }

  function go(next){
    if(location.hash.slice(1)===next)route();else location.hash=next;
  }
  function finishQuizExit(){const exit=quizExit;if(exit){exit.animation?.complete?.();exit.finish();}}
  function finishFeedback(){const animation=feedbackAnimation;feedbackAnimation=null;animation?.cancel?.();const feedback=$('#feedback');if(feedback){feedback.style.opacity='1';feedback.style.transform='none';}}
  function disposeQuizLayout(){finishQuestionSwap();finishFeedback();finishQuizExit();quizLayout?.revert();quizLayout=null;}
  function disposePracticeIslands(){practiceCounter?.destroy();practiceCounter=null;disposePracticeFaq();}
  function disposePracticeFaq(){practiceFaq?.destroy();practiceFaq=null;}
  function disposeIslands(){
    clearTimeout(pickerReturnTimer);pickerReturnTimer=null;pickerPending=false;dragDepth=0;
    uploadIsland?.destroy();uploadIsland=null;uploadHost=null;
    statusIsland?.destroy();statusIsland=null;disposePracticeIslands();
  }
  function disposeView(){entry.cancel();disposeQuizLayout();disposeIslands();disposePracticeDock();if(body.contains($('#toast')))document.body.append($('#toast'));viewController?.abort();viewController=new AbortController();utils.remove(body.querySelectorAll('*'));}
  function route(){
    if(destroyed||startupPending)return;
    const raw=location.hash.slice(1)||'home';
    const [next,rawReportId]=raw.split('/');
    let reportId=rawReportId;try{if(rawReportId)reportId=decodeURIComponent(rawReportId);}catch{reportId='';}
    const target=pages[next]?next:'home';
    const revision=++routeRevision;
    // Abort old requests immediately, but retain the visible DOM until its close
    // transition finishes. Reverting a quiz layout before fade-out caused jumps.
    entry.cancel();viewController?.abort();page=target;
    transitions.navigate({key:target,portal:target==='report'?lastPortal:$(`[data-portal="${target}"]`),render(){
      if(revision!==routeRevision)return;
      disposeView();
      $('#workspaceTitle').textContent=pages[target][0];$('#sectionNumber').textContent=pages[target][1];
      windowReady=false;
      entry.prepare({key:target,render(){
        if(destroyed||revision!==routeRevision)return;
        body.scrollTop=0;
        if(target==='report'){
          const saved=legacyRecords.find(r=>r.id===reportId);
          if(saved)currentReport=saved;
          if(!currentReport||reportId&&currentReport.id!==reportId)return renderReportFromId(reportId,revision);
          return renderReport();
        }
        if(target==='check')return renderCheck();
        if(target==='contacts')return renderContacts();
        if(target==='practice')return renderQuiz();
        return renderHistory(revision);
      }});
      body.scrollTop=0;
    }});
  }
  window.addEventListener('hashchange',route);
  workspace.addEventListener('cancel',ev=>{ev.preventDefault();go('home');});
  $('#closeWorkspace').onclick=()=>go('home');
  $$('.portal-node').forEach(node=>node.addEventListener('click',()=>{lastPortal=node;}));

  function renderCheck(){
    if(activeTask){renderProcessing();return;}
    disposeIslands();
    const recoverable=pendingJob();
    body.innerHTML=heading('01 / 材料核验','把疑问交给亲安。','一段声音，一张照片，一条消息。先核实，再放心。')+
      `${recoverable?`<div class="notice mode-notice">上次的任务仍可继续查看，不需要重复上传。<button id="resumeTask" class="text-button">恢复查看 ↗</button></div>`:''}`+
      `<div class="upload-layout"><section class="surface upload-card"><div class="type-tabs" role="tablist" aria-label="选择材料类型"><span class="tab-marker" aria-hidden="true"></span>${Object.entries(fileTypes).map(([key,t])=>`<button class="type-tab" id="type-${key}" role="tab" aria-controls="uploadPanel" aria-selected="${type===key}" tabindex="${type===key?0:-1}" data-type="${key}">${icon(t.icon)}${t.label}</button>`).join('')}</div><div id="uploadPanel" role="tabpanel" aria-labelledby="type-${type}"><div id="dropzone" class="dropzone"></div><p id="fileError" class="inline-error" role="alert"></p><div class="upload-meta"><span>${icon('lock')}提交后开始核验</span><button id="analyzeButton" class="primary" disabled>开始核验 ${icon('arrow')}</button></div></div></section><aside class="safety-card"><div class="safety-top">A GENTLE REMINDER ${icon('heart')}</div><h2>真正的关心，<br>经得起一次<span>确认。</span></h2><p>遇到借钱、转账或索要验证码，<br>先停一停，用熟悉的号码联系家人。</p><button id="familyLink" class="family-link">${icon('phone')} 联系我的家人 ${icon('arrow')}</button></aside></div><div class="hint-line"><span>一次一份材料，结果保存在核验记录中。</span><button id="uploadHelp" class="text-button">了解核验流程 ${icon('arrow')}</button></div><div class="steps-strip"><span><b>01 /</b> 选择材料</span><i></i><span><b>02 /</b> 看懂线索</span><i></i><span><b>03 /</b> 独立核实</span></div>`;
    $('#familyLink').onclick=()=>go('contacts');$('#uploadHelp').onclick=helpModal;$('#analyzeButton').onclick=analyze;
    if($('#resumeTask'))$('#resumeTask').onclick=()=>resumeJob(recoverable);
    $$('.type-tab').forEach(tab=>{
      tab.onclick=()=>selectType(tab.dataset.type);
      tab.onkeydown=ev=>{
        const keys=Object.keys(fileTypes),index=keys.indexOf(type);let next;
        if(ev.key==='ArrowRight')next=keys[(index+1)%keys.length];
        if(ev.key==='ArrowLeft')next=keys[(index+keys.length-1)%keys.length];
        if(ev.key==='Home')next=keys[0];if(ev.key==='End')next=keys.at(-1);
        if(next){ev.preventDefault();selectType(next);$(`#type-${next}`).focus();}
      };
    });
    const dropzone=$('#dropzone');
    const hasDraggedFiles=ev=>Array.from(ev.dataTransfer?.types||[]).includes('Files')||!!ev.dataTransfer?.files?.length;
    const syncDrag=()=>{
      dropzone.classList.toggle('dragover',dragDepth>0);
      updateUploadIsland();
    };
    dropzone.addEventListener('dragenter',ev=>{
      if(activeTask||!hasDraggedFiles(ev))return;
      ev.preventDefault();dragDepth++;syncDrag();
    });
    dropzone.addEventListener('dragover',ev=>{
      if(activeTask||!hasDraggedFiles(ev))return;
      ev.preventDefault();if(ev.dataTransfer)ev.dataTransfer.dropEffect='copy';
      if(!dragDepth){dragDepth=1;syncDrag();}
    });
    dropzone.addEventListener('dragleave',ev=>{
      ev.preventDefault();dragDepth=Math.max(0,dragDepth-1);syncDrag();
    });
    dropzone.addEventListener('drop',ev=>{
      ev.preventDefault();dragDepth=0;syncDrag();if(activeTask)return;
      if(ev.dataTransfer?.files?.length!==1){setError('每次检查一份材料，请选择一个文件。');return;}
      finishPicker();setFile(ev.dataTransfer.files[0]);
    });
    // The visual folder and its controls own their clicks; blank dropzone space
    // remains a single activation target without wrapping nested buttons.
    dropzone.onclick=ev=>{
      if(!selectedFile&&!ev.target.closest('button,a,input,video,audio,[role="button"]'))chooseFile();
    };
    dropzone.onkeydown=ev=>{
      if(ev.target===dropzone&&!selectedFile&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();chooseFile();}
    };
    syncType();renderFile();
  }
  function selectType(next){
    if(type===next||activeTask)return;
    finishPicker();dragDepth=0;type=next;clearFile();fileError='';
    // Keep the same tablist, panel, dropzone and surrounding scene in the DOM.
    syncType();renderFile();
  }
  function syncType(){
    $$('.type-tab').forEach(tab=>{const selected=tab.dataset.type===type;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    const marker=$('.tab-marker');if(marker)marker.style.transform=`translateX(${Object.keys(fileTypes).indexOf(type)*100}%)`;
    $('#uploadPanel')?.setAttribute('aria-labelledby',`type-${type}`);
    $('#fileInput').accept=fileTypes[type].accept;
  }
  function finishPicker(){
    clearTimeout(pickerReturnTimer);pickerReturnTimer=null;pickerPending=false;
    updateUploadIsland();
  }
  function chooseFile(){
    if(activeTask||pickerPending||destroyed)return;
    const input=$('#fileInput');pickerPending=true;updateUploadIsland();
    input.value='';input.accept=fileTypes[type].accept;
    // Keep the file picker in this trusted click/key event. Do not await the
    // folder's second animation or defer input.click to an animation callback.
    try{input.click();}catch{finishPicker();setError('无法打开文件选择器，请把文件拖入此处。');}
  }
  const fileInput=$('#fileInput');
  fileInput.onchange=ev=>{const file=ev.target.files?.[0];finishPicker();if(file)setFile(file);};
  const cancelPicker=()=>finishPicker();fileInput.addEventListener('cancel',cancelPicker);
  const pickerFocusReturn=()=>{
    if(!pickerPending)return;
    clearTimeout(pickerReturnTimer);
    // Older browsers do not emit input.cancel. Focus returns before change on
    // some platforms; settling only the animation never clears the selection.
    pickerReturnTimer=setTimeout(()=>{if(!destroyed&&pickerPending)finishPicker();},250);
  };
  window.addEventListener('focus',pickerFocusReturn);
  function clearFile(){
    selectionRevision++;validationCleanup?.();validationCleanup=null;validating=false;
    if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;selectedFile=null;
  }
  function setError(message){fileError=message;if($('#fileError'))$('#fileError').textContent=message;else toast(message);}
  async function setFile(file){
    if(activeTask)return;
    const ext='.'+file.name.split('.').pop().toLowerCase();
    if(!fileTypes[type].accept.split(',').includes(ext)){setError(`请选择${fileTypes[type].label}文件：${fileTypes[type].hint}。`);return;}
    if(file.size>104857600){setError('文件超过 100MB，请压缩后重试。');return;}
    if(file.size===0){setError('这个文件为空，请重新选择。');return;}
    clearFile();selectedFile=file;previewURL=URL.createObjectURL(file);fileError='';
    const token=selectionRevision;
    if(type==='video'){
      validating=true;renderFile();
      const video=document.createElement('video');
      const duration=await new Promise(resolve=>{
        let settled=false;
        const done=value=>{if(settled)return;settled=true;clearTimeout(timer);video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load();resolve(value);};
        const timer=setTimeout(()=>done(null),5000);
        validationCleanup=()=>done(null);
        video.onloadedmetadata=()=>done(Number.isFinite(video.duration)?video.duration:null);video.onerror=()=>done(null);
        video.preload='metadata';video.src=previewURL;
      });
      if(token!==selectionRevision)return;validationCleanup=null;validating=false;
      if(duration!==null&&duration>180){clearFile();fileError='视频超过 3 分钟，请截取需要核验的片段。';}
    }
    if(page==='check'&&!activeTask)renderFile();
  }
  function uploadProps(){
    const token=selectionRevision;
    return {
      file:selectedFile,url:previewURL,kind:type,open:pickerPending||dragDepth>0,
      hovered:dragDepth>0?true:undefined,paused:!motionEnabled(),disabled:!!activeTask,
      label:fileTypes[type].label,hint:fileTypes[type].hint,detail:fileTypes[type].detail,validating,
      onChoose:chooseFile,
      onRemove(){if(activeTask)return;finishPicker();clearFile();fileError='';renderFile();},
      onPreviewError(){if(!destroyed&&token===selectionRevision&&selectedFile&&page==='check')setError('无法预览这张图片。可以更换材料，或继续核验原文件。');}
    };
  }
  function updateUploadIsland(){if(uploadIsland&&uploadHost?.isConnected)uploadIsland.update(uploadProps());}
  function renderFile(){
    const dropzone=$('#dropzone');if(!dropzone)return;
    dropzone.classList.toggle('has-file',!!selectedFile);
    dropzone.classList.toggle('dragover',dragDepth>0);
    dropzone.tabIndex=selectedFile?-1:0;
    dropzone.setAttribute('role','group');
    dropzone.setAttribute('aria-label',`${fileTypes[type].label}上传区域${selectedFile?'':'，可拖入文件或按 Enter 选择文件'}`);
    $('#fileError').textContent=fileError;
    $('#analyzeButton').disabled=!selectedFile||validating||!!activeTask;
    if(islands.mountUpload){
      if(uploadHost!==dropzone){uploadIsland?.destroy();uploadHost=dropzone;uploadIsland=islands.mountUpload(dropzone,uploadProps());}
      else updateUploadIsland();
      return;
    }
    // A functional native fallback also keeps the app usable if the optional
    // React island chunk cannot be loaded.
    if(!selectedFile){
      dropzone.innerHTML=`<span class="upload-glyph">${icon('upload')}</span><h2>拖放${fileTypes[type].label}，或 <button id="chooseFile" type="button">选择文件</button></h2><p>${fileTypes[type].hint}<br>${fileTypes[type].detail}</p>`;
      $('#chooseFile').onclick=chooseFile;
    }else{
      const media=['image','chat'].includes(type)?`<img src="${previewURL}" class="file-preview" alt="所选材料预览">`:type==='video'?`<video controls class="file-preview" src="${previewURL}" aria-label="所选视频预览"></video>`:`<audio controls class="audio-preview" src="${previewURL}" aria-label="所选声音预览"></audio>`;
      dropzone.innerHTML=`${media}<span class="selected-name">${e(selectedFile.name)}</span><p>${(selectedFile.size/1024/1024).toFixed(2)} MB${validating?' · 正在校验视频时长…':''}</p><div class="file-controls"><button id="replaceFile">更换材料 ↗</button><button id="removeFile">移除 ×</button></div>`;
      $('#replaceFile').onclick=chooseFile;$('#removeFile').onclick=uploadProps().onRemove;
      const image=dropzone.querySelector('img');if(image)image.onerror=uploadProps().onPreviewError;
    }
  }

  function renderProcessing(){
    if(!activeTask)return;
    disposeIslands();
    body.innerHTML=heading('材料核验','正在整理这份材料。','结果会保存在核验记录中。')+
      `<section class="surface empty-state"><div class="loading-scan">${icon('scan')}</div><h3 id="progressTitle">${e(activeTask.message)}</h3><p>${e(activeTask.name||'你可以先浏览其他内容，任务会继续处理。')}</p><div id="taskStatus" class="task-status"></div><button id="leaveTask" class="text-button">返回主页 ↗</button></section>`;
    if(islands.mountStatus)statusIsland=islands.mountStatus($('#taskStatus'),taskStatusProps());
    $('#leaveTask').onclick=()=>go('home');
  }
  function taskStatusProps(){return {state:activeTask?.state||'thinking',label:activeTask?.message||'',detail:activeTask?.id?'材料已提交':'正在连接核验服务',paused:!motionEnabled()};}
  function taskMessage(message,state='analyzing'){
    if(!activeTask)return;activeTask.message=message;activeTask.state=state;
    if(page==='check'&&$('#progressTitle'))$('#progressTitle').textContent=message;
    statusIsland?.update(taskStatusProps());
  }
  function openReport(report){currentReport=report;go(`report/${encodeURIComponent(report.id)}`);}
  function completeTask(result){
    activeTask=null;currentReport=result;
    if(page==='check')openReport(result);else toast('核验已完成，可在核验记录中查看。');
  }
  async function analyze(){
    if(activeTask||!selectedFile||validating)return;
    fileError='';activeTask={name:selectedFile.name,state:'loading',message:'正在提交材料…'};renderProcessing();
    const data=new FormData();data.append('file',selectedFile);data.append('scene',type==='chat'?'chat':'general');data.append('context','');
    try{
      const job=await request('/analyze',{method:'POST',body:data},null,60000);
      if(destroyed)return;
      if(!job||typeof job.job_id!=='string'||!job.job_id)throw new Error('未收到任务编号，请先查看核验记录后再重试。');
      activeTask.id=job.job_id;savePendingJob(job.job_id);
      taskMessage('材料已提交，正在核验…');await pollJob(job.job_id);
    }catch(error){if(!destroyed)taskFailed(error.code==='timeout'&&!activeTask?.id?'提交超时，请先查看核验记录后再重试。':error.message);}
  }
  function taskFailed(message){
    activeTask=null;fileError=message;
    // A returning view owns its intro until it commits. Keep the failure in state
    // so that render uses it, without replacing a live Rare UI entry island.
    if(page==='check'){
      if(!entry.pending&&transitions.state!=='closing')renderCheck();
    }else toast(message);
  }
  async function resumeJob(id){
    if(activeTask||id!==pendingJob())return;
    activeTask={id,state:'loading',message:'正在恢复核验进度…'};renderProcessing();
    try{await pollJob(id);}catch(error){if(!destroyed)taskFailed(error.message);}
  }
  async function pollJob(id){
    let failures=0;
    for(let i=0;i<800;i++){
      await delay(1500);if(destroyed)return;let job;
      try{job=await request(`/jobs/${encodeURIComponent(id)}`);failures=0;}
      catch(error){
        if(destroyed)return;
        if(error.status===404){clearPendingJob(id);throw new Error('这项任务已无法恢复，请先查看核验记录。');}
        if(error.status===401||error.status===403)throw error;
        if(++failures>=3)throw new Error('连接中断，任务已保留。请稍后恢复查看，无需重新上传。');
        continue;
      }
      if(!job||typeof job.status!=='string')throw new Error('暂时无法读取任务进度，请稍后恢复查看。');
      if(job.status==='failed'){clearPendingJob(id);throw new Error('本次核验未能完成，请重试或更换材料。');}
      if(job.status==='completed'){
        const report=reportFromResponse(job.result);clearPendingJob(id);completeTask(report);return;
      }
      taskMessage(typeof job.message==='string'&&job.message.trim()?job.message:'正在核验材料…');
    }
    throw new Error('核验仍在进行，任务已保留。请稍后恢复查看。');
  }

  function renderContacts(){
    body.innerHTML=heading('02 / 联系家人','熟悉的声音，才是安心的答案。','提前保存家人的真实号码。遇到紧急请求，先打一个电话。')+
      `<div class="contact-layout"><section class="surface"><h2>我的家人 <span id="contactCount">/ ${contacts.length}</span></h2><div id="contactList"></div></section><section class="surface"><span class="decor-star">✳</span><h2>把最重要的人，放在这里。</h2><p class="mode-explanation">请与家人事先确认号码，不要使用可疑消息中提供的新号码。</p><form id="contactForm"><div class="form-field"><label for="contactName">怎么称呼 TA</label><input id="contactName" placeholder="例如：女儿、小陈" required maxlength="30" autocomplete="off"></div><div class="form-field"><label for="contactPhone">熟悉的电话号码</label><input id="contactPhone" placeholder="请输入已确认的号码" type="tel" required maxlength="25" autocomplete="tel"></div><p id="contactError" class="inline-error" role="alert"></p><button class="primary" type="submit">保存家人号码 ${icon('heart')}</button></form></section></div><div class="notice">${icon('lock')}<span>联系人仅保存在当前浏览器。拨号按钮会打开设备电话程序，手机使用更方便。</span></div>`;
    renderContactList();
    $('#contactForm').onsubmit=ev=>{
      ev.preventDefault();const name=$('#contactName').value.trim(),phone=$('#contactPhone').value.trim();
      if(!name||!/^\+?[\d -]{5,25}$/.test(phone)||phone.replace(/\D/g,'').length<5){$('#contactError').textContent='请填写称呼和有效电话号码。';return;}
      const normalized=phone.replace(/[^+\d]/g,'');
      if(contacts.some(c=>c.phone.replace(/[^+\d]/g,'')===normalized)){$('#contactError').textContent='这个号码已经保存，无需重复添加。';return;}
      const next=[...contacts,{name,phone}];
      if(saveArray('qinan-contacts',next)){contacts=next;renderContactList();$('#contactForm').reset();$('#contactError').textContent='';toast('家人的号码已保存，安心多了一份。');}
    };
  }
  function renderContactList(){
    const list=$('#contactList');if(!list)return;
    $('#contactCount').textContent=`/ ${contacts.length}`;
    if(!contacts.length){list.innerHTML=`<div class="empty-state">${icon('heart')}<h3>给关心的人，留个位置。</h3><p>先添加一位家人，<br>需要核实时就能快速找到 TA。</p></div>`;return;}
    list.innerHTML=contacts.map((contact,i)=>`<div class="contact-row"><span class="avatar">${e(contact.name[0])}</span><div><h3>${e(contact.name)}</h3><p>${e(contact.phone)}</p></div><a href="tel:${contact.phone.replace(/[^+\d]/g,'')}" aria-label="拨打${e(contact.name)}的电话">${icon('phone')}</a><button class="icon-button" data-remove="${i}" aria-label="移除${e(contact.name)}">${icon('trash')}</button></div>`).join('');
    $$('[data-remove]').forEach(button=>button.onclick=()=>{
      const contact=contacts[+button.dataset.remove];
      openModal(`<span class="modal-eyebrow">YOUR CIRCLE OF TRUST</span><h2 id="modalTitle">移除这个号码？</h2><p>将从当前浏览器移除 ${e(contact.name)} 的联系方式。</p><div class="modal-actions"><button id="confirmRemove" class="primary">确认移除</button><button id="keepContact" class="secondary">保留号码</button></div>`);
      $('#confirmRemove').onclick=()=>{const next=contacts.filter(c=>c!==contact);if(saveArray('qinan-contacts',next)){contacts=next;closeModal();renderContactList();toast('联系人已移除。');}};
      $('#keepContact').onclick=closeModal;
    });
  }

  function disposePracticeDock(){
    practiceDock?.remove();practiceDock=null;$('.workspace-surface').classList.remove('has-practice');
  }
  function ensurePracticeDock(){
    const surface=$('.workspace-surface');surface.classList.add('has-practice');
    if(!practiceDock?.isConnected){
      practiceDock=document.createElement('nav');practiceDock.id='practiceDock';practiceDock.className='practice-dock';practiceDock.setAttribute('aria-label','练习操作');
      practiceDock.innerHTML='<div class="practice-dock-copy"><span id="practiceDockStep" class="practice-dock-step"></span><p id="practiceDockHint" aria-live="polite"></p></div><button id="nextQuestion" class="primary" aria-describedby="practiceDockHint" disabled></button>';
      surface.insertBefore(practiceDock,surface.querySelector('.workspace-footer'));
    }
    updatePracticeDock();
  }
  function restartQuiz(){
    if(questionSwap||page!=='practice')return;
    currentQuiz=0;answer=null;correctCount=0;mistakes=[];practiceFaqValue=null;renderQuiz();body.scrollTop=0;$('#questionTitle')?.focus({preventScroll:true});
  }
  function updatePracticeDock(){
    if(!practiceDock?.isConnected)return;
    const complete=currentQuiz>=quiz.length,button=practiceDock.querySelector('button'),q=quiz[currentQuiz];
    practiceDock.dataset.state=questionSwap?'switching':complete?'complete':answer===null?'question':'feedback';
    $('#practiceDockStep').textContent=complete?'本轮完成':`情景 ${String(currentQuiz+1).padStart(2,'0')} / ${String(quiz.length).padStart(2,'0')}`;
    $('#practiceDockHint').textContent=complete?`答对 ${correctCount} / ${quiz.length} 题 · 可回顾核实提醒`:answer===null?'选择一个答案，再继续':answer===q.correct?'✓ 这一步正确，继续练习':'先记住核实方法，再继续';
    button.id=complete?'restartQuiz':'nextQuestion';
    button.innerHTML=complete?`再练一轮 ${icon('refresh')}`:`${currentQuiz===quiz.length-1?'查看本轮结果':'下一道情景'} ${icon('arrow')}`;
    button.disabled=!windowReady||page!=='practice'||!!questionSwap||(!complete&&(answer===null||!!quizExit));
    button.onclick=complete?restartQuiz:nextQuizQuestion;
  }
  function counterProps(){return {value:correctCount,paused:!motionEnabled(),label:'已答对',suffix:` / ${quiz.length}`};}
  function faqProps(){return {items:practiceFaqItems,value:practiceFaqValue,paused:!motionEnabled(),onValueChange(value){practiceFaqValue=value;practiceFaq?.update({value});}};}
  function refreshPracticeIslands(){
    const counter=$('#practiceCounter'),faq=$('#practiceFaq');
    if(counter){
      if(!practiceCounter&&islands.mountCounter)practiceCounter=islands.mountCounter(counter,counterProps());
      else if(practiceCounter)practiceCounter.update(counterProps());
      else counter.innerHTML=`<span class="practice-native-score">${correctCount}<small> / ${quiz.length}</small></span>`;
    }
    if(faq){
      if(!practiceFaq&&islands.mountFaq)practiceFaq=islands.mountFaq(faq,faqProps());
      else if(practiceFaq)practiceFaq.update(faqProps());
      else {
        faq.innerHTML=practiceFaqItems.map(item=>`<details class="practice-native-faq" data-faq="${e(item.id)}" ${practiceFaqValue===item.id?'open':''}><summary>${e(item.question)}</summary><p>${e(item.answer)}</p></details>`).join('');
        faq.querySelectorAll('details').forEach(detail=>detail.addEventListener('toggle',()=>{if(!detail.isConnected)return;if(detail.open)practiceFaqValue=detail.dataset.faq;else if(practiceFaqValue===detail.dataset.faq)practiceFaqValue=null;}));
      }
    }
  }
  function quizTickets(){
    return quiz.map((q,i)=>i>=currentQuiz+(answer!==null?1:0)?`<div class="quiz-tile${i===currentQuiz?' is-current':''}" role="listitem" data-question="${i}" ${i===currentQuiz?'aria-current="step"':''}><span class="ticket-icon">${icon(q.icon)}</span><span class="ticket-index">${String(i+1).padStart(2,'0')}</span><span class="ticket-title">${e(q.shortLabel)}</span></div>`:'').join('');
  }
  function renderQuiz(){
    disposeQuizLayout();disposePracticeIslands();ensurePracticeDock();
    body.innerHTML=`<section class="practice-frame"><header class="practice-header">${heading('03 / 情景练习','先核实，再决定。','六个虚构情景，每题选择一步。')}<div class="practice-score"><span class="practice-score-label">本轮答对</span><div id="practiceCounter"></div><span id="scoreCount">已答对 ${correctCount} 题</span></div></header><div class="practice-queue"><div class="quiz-queue-label"><span>待完成题目 / QUESTION QUEUE</span><span id="quizRemaining">${Math.max(0,quiz.length-currentQuiz-(answer!==null?1:0))} / ${quiz.length}</span></div><div class="quiz-progress" role="list" aria-label="待完成题目">${quizTickets()||'<span class="queue-complete">全部完成 ✓</span>'}</div></div><div id="practiceStage" class="practice-stage"></div></section>`;
    if(currentQuiz<quiz.length)quizLayout=createLayout?.($('.quiz-progress'),{duration:250,ease:'outQuad',leaveTo:{transform:'translateY(-28px) scale(.25)',opacity:0,duration:350,ease:'out(3)'}});
    paintQuizQuestion();refreshPracticeIslands();
  }
  function materialMedia(q){
    if(q.materialType==='video')return `<div class="material-media material-video" aria-hidden="true"><div class="media-reticle">${icon('video')}<span class="media-frame-corner"></span></div><span class="media-caption">视频情景 · 静态示意</span></div>`;
    if(q.materialType==='audio')return `<div class="material-media material-audio" aria-hidden="true"><div class="media-wave">${Array.from({length:24},(_,i)=>`<i style="height:${10+Math.sin(i*1.7)**2*28}px"></i>`).join('')}</div><span class="media-caption">语音情景 · 文字转述</span></div>`;
    if(q.materialType==='call')return `<div class="material-media material-call" aria-hidden="true">${icon('phone')}<span class="media-caption">来电情景 · 文字转述</span><span class="call-line"></span></div>`;
    return '';
  }
  function paintQuizQuestion(){
    const stage=$('#practiceStage');if(!stage)return;
    disposePracticeFaq();practiceFaqItems=[];
    if(currentQuiz>=quiz.length){paintQuizResult();return;}
    const q=quiz[currentQuiz];stage.classList.remove('is-complete');
    stage.innerHTML=`<article id="practiceMaterial" class="practice-material surface" data-material-type="${e(q.materialType)}" aria-label="虚构情景材料"><div class="material-topline"><span class="material-type">${icon(q.icon)}${e(q.materialLabel)}</span><span class="fiction-badge">虚构情景</span></div><div class="material-sender"><span class="sender-avatar" aria-hidden="true">${icon(q.icon)}</span><div><strong class="sender-name">${e(q.sender)}</strong><span class="sender-meta">${e(q.senderMeta)}</span></div></div>${materialMedia(q)}<div class="material-body">${q.bodySegments.map(segment=>`<span class="material-segment${segment.clue?' case-clue':''}"${segment.clue?` data-clue="${e(segment.clue)}"`:''}>${e(segment.text)}</span>`).join('')}</div><div id="materialClues" class="material-clues" hidden></div><footer class="material-note case-file-footer"><span>CASE ${String(currentQuiz+1).padStart(2,'0')} / ${quiz.length}</span><span>${['video','audio','call'].includes(q.materialType)?'情景转述 · 非真实通话':'教学示例 · 不是真实消息'}</span></footer></article><section id="practiceAction" class="practice-action surface question-card" aria-labelledby="questionTitle"><div class="question-meta"><span>情景 ${String(currentQuiz+1).padStart(2,'0')} / 06</span><span>独立核实</span></div><div class="progress-track" aria-hidden="true"><span style="width:${currentQuiz/quiz.length*100}%"></span></div><h2 id="questionTitle" tabindex="-1">${e(q.title)}</h2><div id="answers" role="group" aria-label="选择你会采取的一步">${q.answers.map((choice,i)=>`<button class="answer" data-answer="${i}"><b aria-hidden="true">${String.fromCharCode(65+i)}</b><span class="answer-copy">${e(choice)}<span class="answer-status"></span></span></button>`).join('')}</div><div id="feedback"></div></section>`;
    $$('[data-answer]').forEach(button=>button.onclick=()=>{
      if(!windowReady||answer!==null||questionSwap)return;
      answer=+button.dataset.answer;if(answer===q.correct)correctCount++;else mistakes.push(q);
      updateAnswer(q);removeProgressTile();
    });
    $$('.quiz-tile').forEach(tile=>{const active=+tile.dataset.question===currentQuiz;tile.classList.toggle('is-current',active);if(active)tile.setAttribute('aria-current','step');else tile.removeAttribute('aria-current');});
    if(answer!==null)updateAnswer(q,false);
    updatePracticeDock();
  }
  function paintQuizResult(){
    const stage=$('#practiceStage');stage.classList.add('is-complete');
    const wrongIds=new Set(mistakes.map(q=>q.id)),ordered=[...mistakes,...quiz.filter(q=>!wrongIds.has(q.id))];
    practiceFaqItems=ordered.map(q=>({...q.reviewQA,question:`${wrongIds.has(q.id)?'再留意':'已掌握'} · ${q.shortLabel}：${q.reviewQA.question}`}));
    stage.innerHTML=`<section class="practice-result surface"><span class="eyebrow">本轮完成 / SESSION COMPLETE</span><h2 id="questionTitle" tabindex="-1">${correctCount===quiz.length?'六次停顿，六次正确决定。':'再核实一步，就更从容。'}</h2><p class="practice-result-score">本轮答对 <strong>${correctCount} / ${quiz.length}</strong> 题</p><p>${mistakes.length?`有 ${mistakes.length} 个情景值得再看一次。先回顾这些提醒，再把核实变成习惯。`:'这一轮全部答对。六条核实提醒都在下面，遇到相似情况时可以再看一遍。'}</p><span class="fiction-badge">虚构情景练习 · 不代表真实检测能力</span></section><section class="practice-review-list surface"><span class="eyebrow">${mistakes.length?'先回顾答错的情景':'六条核实提醒'}</span><h3>把判断变成行动。</h3><div id="practiceFaq" class="practice-faq"></div></section>`;
    updatePracticeDock();
  }
  function removeProgressTile(){
    const tile=$(`[data-question="${currentQuiz}"]`);if(!tile)return;
    const layout=quizLayout,progress=tile.parentElement,next=$('#nextQuestion'),remaining=quiz.length-currentQuiz-1;if(next)next.disabled=true;
    let finished=false;
    const finish=()=>{
      if(finished)return;finished=true;
      if(quizExit?.tile===tile){clearTimeout(quizExit.timer);quizExit=null;}
      tile.remove();
      if($('#quizRemaining'))$('#quizRemaining').textContent=`${remaining} / ${quiz.length}`;updatePracticeDock();
      if(progress.isConnected&&!progress.querySelector('.quiz-tile'))progress.innerHTML='<span class="queue-complete">全部完成 ✓</span>';
    };
    if(motionEnabled()&&layout){
      const exit={tile,finish,animation:null,timer:setTimeout(()=>{exit.animation?.complete?.();finish();},850)};quizExit=exit;
      try{exit.animation=layout.update(()=>tile.classList.add('is-hidden'),{onComplete:finish});if(exit.animation?.completed)finish();}catch{finish();}
    }else finish();
  }
  function updateAnswer(q,shouldAnimate=true){
    finishFeedback();disposePracticeFaq();
    $$('[data-answer]').forEach(button=>{
      const i=+button.dataset.answer;button.disabled=true;
      button.classList.toggle('correct',i===q.correct);button.classList.toggle('wrong',i===answer&&i!==q.correct);
      button.querySelector('b').textContent=i===q.correct?'✓':i===answer?'✕':String.fromCharCode(65+i);
      button.querySelector('.answer-status').textContent=i===q.correct?(i===answer?'你的选择 · 建议做法':'建议做法'):i===answer?'你的选择':'';
    });
    $('#scoreCount').textContent=`已答对 ${correctCount} 题`;
    $('.progress-track span').style.width=`${(currentQuiz+1)/quiz.length*100}%`;
    $$('.material-segment[data-clue]').forEach(segment=>segment.classList.add('is-clue'));
    const clues=$('#materialClues');clues.hidden=false;clues.innerHTML=`<span class="clues-label">值得留意的线索</span>${q.keyClues.map(clue=>`<span class="clue-label">${e(clue.label)}</span>`).join('')}`;
    practiceFaqItems=[q.reviewQA];
    $('#feedback').innerHTML=`<div class="question-feedback ${answer===q.correct?'is-correct':'is-wrong'}" role="status"><b>${answer===q.correct?'✓ 这一步，让安心更近了。':'✕ 再多核实一步，会更稳妥。'}</b><p>${e(q.why)}</p></div><div id="practiceFaq" class="practice-faq"></div>`;
    $('#feedback').tabIndex=0;$('#feedback').setAttribute('role','region');$('#feedback').setAttribute('aria-label','本题解析与核实提醒');
    refreshPracticeIslands();
    if(shouldAnimate&&windowReady&&motionEnabled()){
      const feedback=$('#feedback');let completed=false;
      try{const animation=animate(feedback,{y:[10,0],opacity:[0,1],duration:300,ease:'outQuad',onComplete:()=>{completed=true;feedback.style.opacity='1';feedback.style.transform='none';feedbackAnimation=null;}});if(!completed)feedbackAnimation=animation;}catch{finishFeedback();}
    }
    updatePracticeDock();
  }
  function finishQuestionSwap(){
    const swap=questionSwap;if(!swap)return;
    swap.animation?.cancel?.();swap.commit();swap.finish(false);
  }
  function nextQuizQuestion(){
    if(!windowReady||page!=='practice'||answer===null||quizExit||questionSwap)return;
    finishFeedback();
    const stage=$('#practiceStage');if(!stage)return;
    const swap={animation:null,timer:null,phase:'out',committed:false,
      commit(){if(questionSwap!==swap||swap.committed)return;swap.committed=true;currentQuiz++;answer=null;practiceFaqValue=null;paintQuizQuestion();refreshPracticeIslands();const stageRect=stage.getBoundingClientRect(),bodyRect=body.getBoundingClientRect();if(stageRect.top<bodyRect.top||stageRect.top>bodyRect.bottom-100)body.scrollTop=Math.max(0,body.scrollTop+stageRect.top-bodyRect.top-12);},
      finish(focus=true){if(questionSwap!==swap)return;clearTimeout(swap.timer);questionSwap=null;stage.style.opacity='1';stage.style.transform='none';stage.removeAttribute('aria-busy');updatePracticeDock();if(focus&&page==='practice'&&windowReady)$('#questionTitle')?.focus({preventScroll:true});}
    };
    questionSwap=swap;stage.setAttribute('aria-busy','true');updatePracticeDock();
    if(!motionEnabled()||!windowReady){swap.commit();swap.finish();return;}
    swap.timer=setTimeout(()=>finishQuestionSwap(),650);
    try{
      const animation=animate(stage,{opacity:[1,.16],y:[0,-8],duration:150,ease:'inQuad',onComplete:()=>{
        if(questionSwap!==swap)return;swap.commit();swap.phase='in';
        try{const entrance=animate(stage,{opacity:[.16,1],y:[8,0],duration:150,ease:'outQuad',onComplete:()=>swap.finish()});if(questionSwap===swap)swap.animation=entrance;}catch{swap.finish();}
      }});
      if(questionSwap===swap&&swap.phase==='out')swap.animation=animation;
    }catch{finishQuestionSwap();}
  }

  function updateHistoryHint(){$('#historyHint').textContent='每一次核实，都有迹可循';}
  function dateText(value){const date=new Date(value);return Number.isNaN(date.getTime())?'时间未提供':date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});}
  async function renderHistory(revision=routeRevision){
    body.innerHTML=heading('04 / 核验记录','每一次核实，都有迹可循。','查看已完成的核验与报告。')+`<section class="surface" id="historyList"><div class="empty-state"><p>正在读取记录…</p></div></section>`;
    const controller=viewController;let items;
    try{
      const data=await request('/cases',{},controller.signal);items=Array.isArray(data)?data:(data?.items||data?.cases);
      if(!Array.isArray(items)||items.some(item=>!item||typeof item.id!=='string'))throw new Error('暂时无法读取记录，请重试。');
      items=items.filter(item=>!item.demo);
    }catch(error){
      if(controller.signal.aborted||revision!==routeRevision)return;
      $('#historyList').innerHTML=`<div class="empty-state">${icon('clock')}<h3>暂时无法读取记录。</h3><p>${e(error.message)}</p><button class="secondary" id="retryHistory">重新读取</button></div>`;$('#retryHistory').onclick=async()=>{await renderHistory(revision);if(!destroyed&&revision===routeRevision)entry.revealContent();};return;
    }
    if(controller.signal.aborted||revision!==routeRevision)return;
    if(!items.length){$('#historyList').innerHTML=`<div class="empty-state">${icon('clock')}<h3>还没有核验记录。</h3><p>提交一份材料，完成后可以在这里查看。</p><button id="firstCheck" class="primary">开始一次核验 ${icon('arrow')}</button></div>`;$('#firstCheck').onclick=()=>go('check');return;}
    $('#historyList').innerHTML=items.map((r,i)=>`<div class="history-row"><span class="history-icon">${icon('file')}</span><div><h3>${e(r.name||r.filename||'核验记录')}</h3><small>${e(dateText(r.date||r.created_at))}</small></div><button data-report="${i}">查看报告 ↗</button></div>`).join('');
    $$('[data-report]').forEach(button=>button.onclick=()=>go(`report/${encodeURIComponent(items[+button.dataset.report].id)}`));
  }
  async function renderReportFromId(id,revision){
    body.innerHTML=heading('核验报告','正在打开核验记录…','');
    if(!id){renderReportError('请从核验记录中选择一份报告。');return;}
    const controller=viewController;
    try{const data=await request(`/cases/${encodeURIComponent(id)}`,{},controller.signal);if(controller.signal.aborted||revision!==routeRevision)return;currentReport=reportFromResponse(data);renderReport();}
    catch(error){if(controller.signal.aborted||revision!==routeRevision)return;renderReportError(error.message);}
  }
  function renderReportError(message){body.innerHTML=heading('核验报告','暂时无法读取这份报告。',e(message))+`<button id="backToHistory" class="primary">返回核验记录 ${icon('arrow')}</button>`;$('#backToHistory').onclick=()=>go('history');}
  function reportModules(report){
    const source=report.modules||{};
    return (Array.isArray(source)?source.map((m,i)=>[m?.type||String(i),m]):Object.entries(source)).filter(([key,m])=>key!=='tamper'&&m&&typeof m==='object'&&!m.disabled&&m.status!=='disabled');
  }
  function renderReport(){
    const report=currentReport,legacy=!!report.demo,states=reportModules(report).map(([,module])=>moduleResult(module).status);
    const title=legacy?'旧版示例':states.includes('flagged')?'发现需要核实的线索':states.includes('uncertain')?'存在待核实的线索':states.includes('below')?'核验结果已整理':report.chat_analysis?.status==='completed'?'聊天线索已整理':'本次未形成可用判断';
    const summary=typeof report.summary==='string'&&report.summary.trim()?report.summary:legacy?'这是一份保存在当前浏览器中的旧版示例记录。':'请结合下面的模块结果与材料内容，继续核实。';
    const steps=Array.isArray(report.next_steps)?report.next_steps.filter(item=>typeof item==='string'):[];
    body.innerHTML=heading('核验报告',title,e(report.name||report.filename||'核验报告'))+
      `${legacy?'<div class="notice mode-notice">旧版示例 · 不属于本次材料的检测结果</div>':''}<div class="result-banner">${icon('scan')}<div><h2>结果摘要</h2><p>${e(summary)}</p></div></div>`+
      (legacy?'':renderActualModules(report))+
      `<section class="surface report-next"><h2>下一步</h2><ul>${(steps.length?steps:['通过熟悉的联系方式，确认本人及具体请求。']).map(step=>`<li>${e(step)}</li>`).join('')}</ul></section><div class="result-actions"><button id="reportContacts" class="primary">联系家人 ${icon('phone')}</button><button id="exportReport" class="secondary">下载记录</button><button id="printReport" class="secondary">打印报告</button><button id="anotherCheck" class="text-button">再核验一份 ${icon('arrow')}</button></div><details class="surface report-details"><summary>完整记录</summary><pre class="raw-report">${e(JSON.stringify(report,null,2))}</pre></details>`;
    $('#reportContacts').onclick=()=>go('contacts');$('#anotherCheck').onclick=()=>{clearFile();fileError='';go('check');};$('#printReport').onclick=()=>window.print();
    $('#exportReport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`qinan-${report.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('记录已下载。');};
  }
  function renderActualModules(report){
    const modules=reportModules(report),labels={audio:'声音检查',video:'视频检查',image:'图片检查',chat:'聊天分析'},statuses={flagged:'需要核实',below:'未发现超过提醒线的线索',uncertain:'存在弱线索',unavailable:'未形成判断'};
    const cards=modules.map(([key,m])=>{
      const result=moduleResult(m),segments=Array.isArray(m.segments)?m.segments.filter(segment=>segment&&Number.isFinite(segment.score)):[];
      return `<section class="surface module-card" data-status="${result.status}">${icon(key==='audio'?'sound':key==='video'?'video':'scan')}<h3>${e(labels[key]||key)}</h3><p class="module-state">${statuses[result.status]}</p>${typeof m.note==='string'?`<p>${e(m.note)}</p>`:''}<details class="module-details"><summary>检测明细</summary>${Number.isFinite(m.score)?`<p>检测分值 ${m.score.toFixed(4)}${Number.isFinite(m.threshold)?` · 提醒线 ${m.threshold}`:''}</p>`:''}${Number.isFinite(m.analyzed_seconds)?`<p>分析时长 ${m.analyzed_seconds} 秒</p>`:''}${segments.map(segment=>`<p>${Number.isFinite(segment.start)?`${segment.start} 秒起 · `:''}分值 ${segment.score.toFixed(4)}${Number.isFinite(segment.threshold)?` · 提醒线 ${segment.threshold}`:''}</p>`).join('')}${result.status==='unavailable'?'<p>本项结果不足以形成判断。</p>':''}</details></section>`;
    }).join('');
    const chat=report.chat_analysis,signals=Array.isArray(chat?.signals)?chat.signals.filter(signal=>signal&&typeof signal==='object'):[];
    return `<div class="result-modules">${cards||'<section class="surface"><h3>暂无模块结果</h3><p>请查看完整记录，或稍后重新核验。</p></section>'}</div>${chat?`<section class="surface report-evidence"><h2>${e(chat.assessment?.title||'聊天线索')}</h2><p>${e(chat.assessment?.summary||chat.summary||chat.note||'暂无更多线索。')}</p>${signals.map(signal=>`<div class="question-feedback"><b>${e(signal.title)}</b><br><span>${e(signal.quote)}</span></div>`).join('')}</section>`:''}${report.ocr?.text?`<details class="surface report-details"><summary>材料文字</summary><p class="quote-lines">${e(report.ocr.text)}</p></details>`:''}`;
  }

  function helpModal(){
    openModal(guideMarkup());
    guide=mountUsageGuide($('#modalBody'),{islands,animate,motionEnabled,onStart(kind){
      if(fileTypes[kind]&&kind!==type){type=kind;clearFile();fileError='';}
      closeModal();go('check');
    },onClose:closeModal});
  }
  function settingsModal(){
    openModal(`<span class="modal-eyebrow">PREFERENCES</span><h2 id="modalTitle">使用偏好</h2><div class="toggle-row"><span>动态效果</span><button id="toggleMotion" class="secondary">${paused?'恢复动效':'暂停动效'}</button></div><p>联系人保存在当前浏览器，可在“联系家人”中管理。</p><div class="modal-actions"><button id="manageContacts" class="secondary">管理联系人</button><button id="settingsDone" class="primary">完成 ${icon('check')}</button></div>`);
    $('#toggleMotion').onclick=()=>{toggleMotion();settingsModal();};$('#manageContacts').onclick=()=>{closeModal();go('contacts');};$('#settingsDone').onclick=closeModal;
  }

  function pauseAmbient(){homeMotion.finish?.();$$('.portal-node').forEach(node=>{utils.remove(node,undefined,'rotateX');utils.remove(node,undefined,'rotateY');});}
  function syncMotion(){
    document.body.classList.toggle('motion-off',paused||mediaQuery.matches);homeMotion.setPaused?.(!motionEnabled());entry.setPaused(!motionEnabled());guide?.setPaused(!motionEnabled());
    $('#motionButton').innerHTML=icon(paused?'play':'pause');$('#motionButton').setAttribute('aria-label',paused?'恢复动态效果':'暂停动态效果');
    $('#motionState').textContent=paused?'MOTION OFF':'MOTION ON';
    updateUploadIsland();statusIsland?.update(taskStatusProps());practiceCounter?.update(counterProps());practiceFaq?.update({paused:!motionEnabled()});
    if(!motionEnabled()){settleModal();finishQuestionSwap();finishFeedback();pauseAmbient();finishQuizExit();visual.pause();transitions.complete();}else{visual.resume();visual.focus(page!=='home'||transitions.state!=='closed');}
  }
  function toggleMotion(){paused=!paused;setStored('qinan-motion-paused',String(paused));syncMotion();}
  const motionChange=()=>{paused=mediaQuery.matches||getStored('qinan-motion-paused','false')==='true';syncMotion();};mediaQuery.addEventListener('change',motionChange);
  if($('#startCheck'))$('#startCheck').onclick=()=>go('check');$('#settings').onclick=settingsModal;$('#helpButton').onclick=helpModal;if($('#howItWorks'))$('#howItWorks').onclick=helpModal;
  $('#motionButton').onclick=()=>{toggleMotion();toast(paused?'动态效果已暂停。':'动态效果已恢复。');};
  $('#scatterButton').onclick=async()=>{
    const button=$('#scatterButton');button.disabled=true;
    button.setAttribute('aria-busy','true');
    try{const form=await visual.toggleForm();button.querySelectorAll('span')[1].textContent=form==='slogan'?'合拢安印':'展开安心宣言';}
    finally{button.disabled=false;button.setAttribute('aria-busy','false');}
  };

  function setupPortalMotion(){
    $$('.portal-node').forEach(node=>{
      const move=ev=>{
        if(!motionEnabled()||page!=='home'||transitions.state!=='closed'||innerWidth<700)return;
        visual.setPortalFocus?.({portalId:node.dataset.portal,x:ev.clientX/innerWidth*2-1,y:1-ev.clientY/window.innerHeight*2});
        const rect=node.getBoundingClientRect(),x=(ev.clientX-rect.left)/rect.width,y=(ev.clientY-rect.top)/rect.height;
        node.style.setProperty('--px',`${x*100}%`);node.style.setProperty('--py',`${y*100}%`);
        utils.remove(node,undefined,'rotateX');utils.remove(node,undefined,'rotateY');
        animate(node,{rotateX:(.5-y)*5,rotateY:(x-.5)*6,duration:350,ease:'outQuad'});
      };
      const leave=()=>{visual.setPortalFocus?.(null);if(!motionEnabled()||page!=='home'||transitions.state!=='closed')return;utils.remove(node,undefined,'rotateX');utils.remove(node,undefined,'rotateY');animate(node,{rotateX:0,rotateY:0,duration:600,ease:createSpring({stiffness:130,damping:18})});};
      const focus=()=>{
        if(!motionEnabled()||page!=='home'||transitions.state!=='closed')return;
        const rect=node.getBoundingClientRect();
        visual.setPortalFocus?.({portalId:node.dataset.portal,x:(rect.left+rect.width/2)/innerWidth*2-1,y:1-(rect.top+rect.height/2)/window.innerHeight*2});
      };
      node.addEventListener('pointermove',move);node.addEventListener('pointerleave',leave);
      node.addEventListener('focus',focus);node.addEventListener('blur',leave);
      pointerDisposers.push(()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);node.removeEventListener('focus',focus);node.removeEventListener('blur',leave);});
    });
  }
  syncMotion();updateHistoryHint();
  const beginInterface=()=>{if(destroyed)return;startupPending=false;setupPortalMotion();syncMotion();route();};
  if(startReady)Promise.resolve(startReady).then(beginInterface,beginInterface);else beginInterface();
  const onPrint=()=>{$$('.report-details,.module-details').forEach(details=>{details.dataset.wasOpen=String(details.open);details.open=true;});};
  const afterPrint=()=>{$$('.report-details,.module-details').forEach(details=>{details.open=details.dataset.wasOpen==='true';});};
  window.addEventListener('beforeprint',onPrint);window.addEventListener('afterprint',afterPrint);
  return {
    refreshIslands(){if(destroyed||startupPending)return;guide?.refreshIslands();if(entry.pending){entry.refreshIslands();return;}if(page==='check'){if(activeTask)renderProcessing();else renderFile();}else if(page==='practice')refreshPracticeIslands();},
    destroy(){entry.destroy();guide?.destroy();guide=null;settleModal();if(modal.open)modal.close();modal.removeEventListener('cancel',cancelModal);document.removeEventListener('visibilitychange',modalVisibility);exteriorDismiss.destroy();transitions.destroy();disposeQuizLayout();disposeIslands();disposePracticeDock();destroyed=true;activeTask=null;viewController?.abort();api.destroy();homeMotion.destroy?.();clearFile();clearTimeout(toastTimer);utils.remove(document.querySelectorAll('*'));pointerDisposers.forEach(fn=>fn());window.removeEventListener('hashchange',route);window.removeEventListener('focus',pickerFocusReturn);fileInput.onchange=null;fileInput.removeEventListener('cancel',cancelPicker);window.removeEventListener('beforeprint',onPrint);window.removeEventListener('afterprint',afterPrint);mediaQuery.removeEventListener('change',motionChange);visual.dispose();},
  };
}

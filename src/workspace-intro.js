const MODULES = {
  check: { number: '01', word: 'VERIFY', title: '准备材料核验', detail: '从一份材料，找到值得确认的线索。' },
  contacts: { number: '02', word: 'CONNECT', title: '连接熟悉的人', detail: '一个熟悉的号码，让关心有处落脚。' },
  practice: { number: '03', word: 'PRACTICE', title: '准备情景练习', detail: '六个情景，一次次学会确认。' },
  history: { number: '04', word: 'RECORDS', title: '展开核验记录', detail: '每一次认真核实，都值得留存。' },
  report: { number: '01', word: 'INSIGHT', title: '展开核验报告', detail: '读懂线索，再决定下一步。' },
};

function motif(key) {
  if (key === 'practice') return `<div class="entry-tickets">${Array.from({length:6},(_,index)=>`<i class="entry-bit"><span>${String(index+1).padStart(2,'0')}</span><b></b></i>`).join('')}</div>`;
  if (key === 'contacts') return '<div class="entry-connection"><i class="entry-bit">你</i><span class="entry-link"><b></b></span><i class="entry-bit">家</i></div>';
  if (key === 'history' || key === 'report') return '<div class="entry-records"><i class="entry-bit"><b></b><b></b></i><i class="entry-bit"><b></b><b></b></i><i class="entry-bit"><b></b><b></b></i><span class="entry-record-seal">AN</span></div>';
  return '<div class="entry-scan"><i class="entry-bit"></i><i class="entry-bit"></i><span class="entry-scan-line"></span><b class="entry-scan-cross">+</b></div>';
}

/** A presentation buffer. It never invents network or model progress. */
export function createWorkspaceIntro({host,animate,motionEnabled=()=>true,getIslands=()=>({}),duration,onReady=()=>{}}={}) {
  const doc=host.ownerDocument,win=doc.defaultView;
  let pending=null,sequence=0,timer=null,disposed=false,statusIsland=null;
  const running=new Set(),styles=new Map();
  const enabled=()=>!disposed&&!doc.hidden&&motionEnabled();
  const durationFor=()=>typeof duration==='number'?Math.max(0,duration):(win.innerWidth<700?500:700);
  const save=(node)=>{if(!styles.has(node))styles.set(node,{opacity:node.style.opacity,transform:node.style.transform});};
  function cleanupAnimation(){
    clearTimeout(timer);timer=null;
    for(const animation of running){try{animation?.cancel?.();}catch{/* Restore all content even if an engine fails. */}}
    running.clear();
    for(const [node,old] of styles){node.style.opacity=old.opacity;node.style.transform=old.transform;}
    styles.clear();host.classList.remove('content-arriving');
  }
  function releaseStatus(){statusIsland?.destroy();statusIsland=null;}
  function run(target,parameters){
    if(typeof animate!=='function')return null;
    let completed=false,animation;
    const onComplete=parameters.onComplete;
    animation=animate(target,{...parameters,onComplete(){completed=true;if(animation)running.delete(animation);onComplete?.();}});
    if(!completed&&animation)running.add(animation);
    return animation;
  }
  function refreshIslands(){
    const slot=host.querySelector('[data-entry-status]');
    if(!pending?.started||!slot)return;
    const props={state:'thinking',label:pending.config.title,detail:'内容即将展开',paused:!enabled()};
    if(statusIsland)statusIsland.update(props);
    else if(getIslands().mountStatus){try{statusIsland=getIslands().mountStatus(slot,props);}catch{slot.textContent=pending.config.title;}}
  }
  function revealContent(){
    if(disposed||pending)return;
    cleanupAnimation();
    if(!enabled()||typeof animate!=='function'||durationFor()===0)return;
    const selectors='.page-heading,.upload-layout>.surface,.upload-layout>.safety-card,.contact-layout>.surface,.practice-header,.practice-queue,.practice-stage>.surface,.result-banner,.result-modules>.surface,.report-next,.history-row,.empty-state';
    const candidates=[...host.querySelectorAll(selectors)];
    const nodes=(candidates.length?candidates:[...host.children]).filter(node=>!candidates.some(other=>other!==node&&other.contains(node))).slice(0,8);
    if(!nodes.length)return;
    const token=sequence;host.classList.add('content-arriving');
    try{
      nodes.forEach((node,index)=>{
        save(node);node.style.opacity='0';node.style.transform='translateY(10px)';
        run(node,{opacity:[0,1],y:[10,0],duration:300,delay:index*38,ease:'out(3)'});
      });
      const finish=()=>{if(sequence===token)cleanupAnimation();};
      run({value:0},{value:1,duration:300+(nodes.length-1)*38,ease:'linear',onComplete:finish});
      timer=setTimeout(finish,600+(nodes.length-1)*38);
    }catch{cleanupAnimation();}
  }
  function commit(){
    const job=pending;if(!job||disposed)return;
    pending=null;cleanupAnimation();releaseStatus();
    host.classList.remove('workspace-loading');host.removeAttribute('aria-busy');
    const token=sequence;
    let result;
    try{result=job.render();}finally{onReady();}
    if(sequence!==token||disposed)return;
    revealContent();
    if(result&&typeof result.then==='function')Promise.resolve(result).then(()=>{if(!disposed&&sequence===token&&!pending)revealContent();},()=>{if(!disposed&&sequence===token&&!pending)cleanupAnimation();});
  }
  function cancel(){
    sequence++;pending=null;cleanupAnimation();releaseStatus();
    host.classList.remove('workspace-loading');host.removeAttribute('aria-busy');
  }
  function prepare({key,render}){
    cancel();if(disposed)return;
    const config=MODULES[key]||MODULES.check;
    pending={key,config,render,started:false};
    if(!enabled()||durationFor()===0||typeof animate!=='function'){commit();return;}
    host.classList.add('workspace-loading');host.setAttribute('aria-busy','true');
    host.innerHTML=`<section class="workspace-entry entry-${key}" aria-label="${config.title}"><div class="entry-meta"><span>QINAN / ${config.number}</span><span>ENTER ${config.word}</span></div><div class="entry-visual" aria-hidden="true">${motif(key)}<span class="entry-orbit"></span><span class="entry-tick entry-tick-a"></span><span class="entry-tick entry-tick-b"></span></div><div class="entry-copy"><span class="entry-kicker">${config.word}</span><h2>${config.title}</h2><p>${config.detail}</p></div><div class="entry-bottom"><div data-entry-status role="status">${config.title}</div><button type="button" data-entry-skip>立即进入 <span aria-hidden="true">↗</span></button></div></section>`;
    host.querySelector('[data-entry-skip]').onclick=commit;
  }
  function start(){
    if(!pending||pending.started||disposed)return;
    if(!enabled()){commit();return;}
    const job=pending;job.started=true;const token=sequence,ms=durationFor();
    host.querySelector('.workspace-entry')?.classList.add('is-playing');refreshIslands();
    try{
      const bits=[...host.querySelectorAll('.entry-bit')];
      bits.forEach((node,index)=>run(node,{opacity:[0,1],y:[18,0],scale:[.88,1],duration:Math.min(380,ms*.65),delay:index*35,ease:'out(4)'}));
      run(host.querySelector('.entry-copy'),{opacity:[0,1],y:[12,0],duration:Math.min(320,ms*.55),delay:70,ease:'out(3)'});
      const clock={value:0};
      const finish=()=>{if(sequence===token&&pending===job)commit();};
      timer=setTimeout(finish,ms+250);
      run(clock,{value:1,duration:ms,ease:'linear',onComplete:finish});
    }catch{commit();}
  }
  const settle=()=>{if(pending)commit();else cleanupAnimation();};
  const interaction=event=>{if(!pending&&styles.size&&host.contains(event.target))cleanupAnimation();};
  const visibility=()=>{if(doc.hidden)settle();};
  doc.addEventListener('visibilitychange',visibility);host.addEventListener('pointerdown',interaction,true);host.addEventListener('focusin',interaction,true);
  return {prepare,start,finish:settle,cancel,revealContent,refreshIslands,get pending(){return pending!==null;},setPaused(value){if(value)settle();else statusIsland?.update({paused:false});},destroy(){if(disposed)return;cancel();disposed=true;doc.removeEventListener('visibilitychange',visibility);host.removeEventListener('pointerdown',interaction,true);host.removeEventListener('focusin',interaction,true);}};
}

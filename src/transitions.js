/** Live content never enters geometry snapshots; the morph owns its static identity copy. */
export function createWorkspaceTransitions({
  dialog, surface, backdrop, portals, animate, motionEnabled,
  onBusy=()=>{}, onHome=()=>{}, onClosed=()=>{}, onOpened=()=>{},
}) {
  const document=dialog.ownerDocument,view=document.defaultView;
  const proxy=document.createElement('div');
  proxy.className='workspace-proxy';proxy.setAttribute('aria-hidden','true');proxy.setAttribute('role','presentation');
  proxy.style.display='none';dialog.append(proxy);
  let state='closed',origin=null,identity=null,active=null,queued=null,destroyed=false,forceInstant=false,sequence=0;
  const content=()=>[...surface.children];
  const portalContent=node=>node?[node.querySelector('.portal-content')||node]:[];
  const opacity=(nodes,value)=>nodes.forEach(node=>node.style.opacity=String(value));
  const animated=()=>!forceInstant&&!document.hidden&&motionEnabled();
  const mask=value=>dialog.classList.toggle('is-transitioning',value);
  // Visual dimming and native modality have different lifetimes: dimming ends
  // at close start, while scroll lock remains until the return has settled.
  const backdropProperties=['transition','opacity','visibility','background','backdrop-filter','-webkit-backdrop-filter'];
  const backdropDefaults=new Map(backdropProperties.map(property=>[property,{
    value:backdrop?.style.getPropertyValue(property)||'',priority:backdrop?.style.getPropertyPriority(property)||'',
  }]));
  const scrollLocked=value=>document.body.classList.toggle('feature-open',value);
  function restoreBackdropStyles(){
    if(!backdrop)return;
    for(const [property,{value,priority}] of backdropDefaults){
      if(value)backdrop.style.setProperty(property,value,priority);else backdrop.style.removeProperty(property);
    }
  }
  function showBackdrop(){restoreBackdropStyles();backdrop?.classList.add('is-visible');}
  function hideBackdropImmediately(){
    if(!backdrop)return;
    backdrop.style.transition='none';
    backdrop.style.opacity='0';backdrop.style.visibility='hidden';
    backdrop.style.background='transparent';backdrop.style.setProperty('backdrop-filter','none');
    backdrop.style.setProperty('-webkit-backdrop-filter','none');
    backdrop.classList.remove('is-visible');
  }
  function releaseBackdrop(){backdrop?.classList.remove('is-visible');restoreBackdropStyles();scrollLocked(false);}
  const rect=node=>{
    const bounds=node.getBoundingClientRect();
    return {left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,
      borderRadius:view.getComputedStyle(node).borderTopLeftRadius||'0px'};
  };
  const place=box=>{
    for(const key of ['left','top','width','height'])proxy.style[key]=`${box[key]}px`;
    proxy.style.borderRadius=box.borderRadius;
  };
  const plainText=(node,limit)=>node?.textContent?.replace(/\s+/g,' ').trim().slice(0,limit)||'';
  function readIdentity(node){
    const source=node?.querySelector('.portal-content')||node;
    return {
      label:plainText(node?.querySelector('.node-top small'),32)||(node?`${String(portals.indexOf(node)+1).padStart(2,'0')} / QINAN`:'QINAN'),
      title:plainText(source?.querySelector('strong'),48)||plainText(source,48)||plainText(surface.querySelector('#workspaceTitle'),48)||'亲安',
      description:plainText(node?.querySelector('.node-desc'),96)||(node?'':'先核实，再放心。'),
    };
  }
  function showProxyCopy(){
    const copy=document.createElement('div');copy.className='workspace-proxy-copy';
    for(const [key,tag] of [['label','span'],['title','strong'],['description','p']]){
      const value=identity?.[key];if(!value)continue;
      const line=document.createElement(tag);line.className=`workspace-proxy-${key}`;line.textContent=value;copy.append(line);
    }
    // Only fresh text nodes are created: input values, duplicate IDs and animated
    // visibility/opacity styles cannot leak from the live workspace or the portal.
    proxy.replaceChildren(copy);
  }
  function clearProxy(){
    proxy.style.display='none';proxy.style.opacity='1';proxy.style.transform='none';
    proxy.replaceChildren();mask(false);
  }
  function resetSurface(){
    surface.style.visibility='';surface.style.opacity='1';surface.style.transform='none';opacity(content(),1);
    dialog.style.opacity='1';dialog.style.transform='none';
  }
  function start(target,params,settle,done){
    const id=++sequence;let ended=false,timer;
    const finish=()=>{
      if(ended||destroyed||id!==sequence)return;
      ended=true;clearTimeout(timer);active=null;settle();done();
    };
    if(!animated()){finish();return;}
    const task={animation:null,finish,cancel(){clearTimeout(timer);task.animation?.cancel?.();}};
    active=task;
    try{
      task.animation=animate(target,{...params,onComplete:finish});
      if(task.animation?.completed)finish();
      // A lost engine callback must never strand the interface behind an opacity mask.
      if(!ended&&active===task)timer=setTimeout(complete,params.duration+300);
    }catch{
      const prior=forceInstant;forceInstant=true;
      try{task.animation?.cancel?.();}catch{/* The final state below is authoritative. */}
      finish();forceInstant=prior;
    }
  }
  function fade(nodes,from,to,duration,done){
    opacity(nodes,from);
    if(!nodes.length){done();return;}
    start(nodes,{opacity:[from,to],duration,ease:'out(3)'},()=>opacity(nodes,to),done);
  }
  function morph(from,to,duration,done){
    showProxyCopy();place(from);proxy.style.display='block';mask(true);
    const properties={};for(const key of ['left','top','width','height','borderRadius'])properties[key]=[from[key],to[key]];
    start(proxy,{...properties,duration,ease:'inOut(3)'},()=>place(to),done);
  }
  function drain(){
    if(destroyed||state==='opening'||state==='closing')return;
    const request=queued;queued=null;if(request)apply(request);
  }
  function finishOpen(){
    clearProxy();resetSurface();state='open';
    if(origin)origin.style.visibility='hidden';
    onOpened();drain();
  }
  function open(request){
    state='opening';origin=request.portal?.isConnected?request.portal:null;
    onBusy();scrollLocked(true);showBackdrop();request.render();
    identity=readIdentity(origin);
    resetSurface();opacity(content(),0);
    const from=origin?rect(origin):null;
    const expand=()=>{
      if(destroyed)return;
      mask(true);dialog.style.opacity='1';dialog.style.transform='none';
      if(!dialog.open)dialog.showModal();
      const to=rect(surface);
      if(origin)origin.style.visibility='hidden';
      morph(from||{...to,top:to.top+12},to,from?520:240,()=>{
        clearProxy();
        fade(content(),0,1,220,finishOpen);
      });
    };
    fade(portalContent(origin),1,0,90,expand);
  }
  function close(){
    if(state==='closing')return;
    if(state==='closed'){drain();return;}
    state='closing';hideBackdropImmediately();onBusy();
    const returned=origin;
    if(!returned)identity=readIdentity(null);
    const finishClose=()=>{
      // Restore destination text before withdrawing the copy. No blank card frame
      // is introduced by starting another opacity:0 entrance after the handoff.
      if(returned){returned.style.visibility='';opacity(portalContent(returned),1);}
      clearProxy();
      // Native modality ends only after the visible proxy has reached its destination.
      if(dialog.open)dialog.close();
      resetSurface();releaseBackdrop();state='closed';onClosed();origin=null;identity=null;
      if(returned?.isConnected)returned.focus({preventScroll:true});
      if(!queued||queued.key==='home')onHome();drain();
    };
    fade(content(),1,0,90,()=>{
      const from=rect(surface),to=returned?.isConnected?rect(returned):{...from,top:from.top+12};
      opacity(portalContent(returned),0);
      morph(from,to,returned?460:200,finishClose);
    });
  }
  function apply(request){
    if(request.key==='home'){
      if(state==='closed'){onClosed();onHome();return;}close();return;
    }
    if(state==='closed')open(request);
    else if(state==='open'){
      request.render();resetSurface();onOpened();
    }
  }
  function complete(){
    if(destroyed)return;
    const previous=forceInstant;forceInstant=true;
    const task=active;
    if(task){try{task.cancel();}catch{/* Settling does not depend on the animation engine. */}task.finish();}
    forceInstant=previous;
  }
  const visibility=()=>{if(document.hidden)complete();};
  const resize=()=>{if(state==='opening'||state==='closing')complete();};
  document.addEventListener('visibilitychange',visibility);view.addEventListener('resize',resize);
  return {
    get state(){return state;},
    get busy(){return state==='opening'||state==='closing';},
    navigate(request){
      if(destroyed)return;
      if(state==='closing'){queued=request.key==='home'?null:request;return;}
      if(state==='opening'){queued=request;complete();return;}
      apply(request);
    },
    complete,
    destroy(){
      if(destroyed)return;
      destroyed=true;sequence++;queued=null;
      try{active?.cancel();}catch{/* Always restore the DOM. */}active=null;
      clearProxy();resetSurface();
      if(origin){origin.style.visibility='';opacity(portalContent(origin),1);}
      releaseBackdrop();if(dialog.open)dialog.close();state='closed';identity=null;proxy.remove();
      document.removeEventListener('visibilitychange',visibility);view.removeEventListener('resize',resize);
    },
  };
}

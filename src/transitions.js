/** Owns the entire native-dialog / shared-shell lifecycle, including text fades. */
export function createWorkspaceTransitions({
  dialog, surface, backdrop, portals, animate, createLayout, motionEnabled,
  onBusy=()=>{}, onHome=()=>{}, onClosed=()=>{},
}) {
  let state='closed', origin=null, active=null, queued=null, destroyed=false, forceInstant=false;
  let sequence=0;
  const content=()=>[...surface.children];
  const portalContent=node=>node ? (node.querySelector('.portal-content') ? [node.querySelector('.portal-content')] : [...node.children]) : [];
  const setOpacity=(nodes,value)=>nodes.forEach(node=>node.style.opacity=String(value));
  portals.forEach(node=>{node.classList.add('portal-surface');node.dataset.layoutId=`portal-${node.dataset.portal}`;});
  // Matched shells carry the morph. Their descendants stay explicitly masked
  // while the layout engine measures and animates the shared geometry.
  const layout=createLayout?.(dialog,{children:['.portal-surface'],duration:600,ease:'out(3)',properties:['borderRadius'],swapAt:{opacity:1}});
  const animated=()=>!forceInstant&&motionEnabled();

  function start(make,done) {
    const id=++sequence;
    let ended=false;
    const finish=()=>{
      if(ended||destroyed||id!==sequence)return;
      ended=true;active=null;done();
    };
    const animation=make(finish);
    // Anime.js can return an already-completed layout without onComplete when
    // geometry is unchanged (for example while a surface is being resized).
    if(!ended&&animation?.completed)finish();
    // Test adapters and zero-duration timelines may finish synchronously.
    if(!ended&&id===sequence)active={animation,finish};
  }
  function fade(nodes,from,to,duration,done) {
    if(!nodes.length||!animated()){setOpacity(nodes,to);done();return;}
    setOpacity(nodes,from);
    start(finish=>animate(nodes,{opacity:[from,to],duration,ease:'outQuad',onComplete:()=>{setOpacity(nodes,to);finish();}}),done);
  }
  function mask(enabled) {
    dialog.classList.toggle('is-transitioning',enabled);
    origin?.classList.toggle('is-transitioning',enabled);
  }
  function showBackdrop(){backdrop?.classList.add('is-visible');dialog.ownerDocument.body.classList.add('feature-open');}
  function hideBackdrop(){backdrop?.classList.remove('is-visible');dialog.ownerDocument.body.classList.remove('feature-open');}
  function cleanShell(){
    dialog.style.opacity='1';dialog.style.transform='none';
    mask(false);
    if(origin)origin.style.visibility='';
  }
  function drain(){
    if(destroyed||state==='opening'||state==='closing')return;
    const request=queued;queued=null;
    if(request)apply(request);
  }
  function finishOpen(){
    state='open';mask(false);
    if(origin)origin.style.visibility='hidden';
    drain();
  }
  function open(request){
    state='opening';origin=request.portal?.isConnected ? request.portal : null;
    onBusy();showBackdrop();
    request.render();
    surface.dataset.layoutId=`portal-${origin?.dataset.portal||request.key}`;
    setOpacity(content(),0);
    const reveal=()=>{
      mask(false);if(origin)origin.style.visibility='hidden';
      fade(content(),0,1,160,finishOpen);
    };
    const expand=()=>{
      if(destroyed)return;
      mask(true);
      dialog.style.opacity='1';dialog.style.transform='none';
      if(animated()&&layout&&origin){
        start(finish=>{
          layout.record();dialog.showModal();origin.style.visibility='hidden';
          return layout.animate({duration:600,onComplete:finish});
        },reveal);
      }else{
        dialog.showModal();if(origin)origin.style.visibility='hidden';
        if(animated())start(finish=>animate(surface,{scale:[.97,1],y:[16,0],duration:220,ease:'outExpo',onComplete:finish}),reveal);
        else reveal();
      }
    };
    fade(portalContent(origin),1,0,90,expand);
  }
  function close(){
    if(state==='closing')return;
    if(state==='closed'){drain();return;}
    state='closing';onBusy();
    const finishClose=()=>{
      if(dialog.open)dialog.close();
      mask(false);setOpacity(content(),1);
      if(origin)origin.style.visibility='';
      const returned=origin;
      fade(portalContent(returned),0,1,120,()=>{
        cleanShell();hideBackdrop();state='closed';onClosed();
        if(returned?.isConnected)returned.focus({preventScroll:true});
        origin=null;
        // No ambient animation resumes until text and geometry have both settled.
        if(!queued||queued.key==='home')onHome();
        drain();
      });
    };
    const collapse=()=>{
      mask(true);
      setOpacity(portalContent(origin),0);
      if(animated()&&layout&&origin){
        start(finish=>layout.update(()=>{
          // This is the native-dialog pattern documented by Anime.js. The independent
          // backdrop remains visible while the closed dialog's shell animates back.
          dialog.close();origin.style.visibility='';
        },{duration:420,onComplete:finish}),finishClose);
      }else{
        if(dialog.open)dialog.close();finishClose();
      }
    };
    fade(content(),1,0,90,collapse);
  }
  function apply(request){
    if(request.key==='home'){
      if(state==='closed'){onClosed();onHome();return;}
      close();return;
    }
    if(state==='closed')open(request);
    else if(state==='open'){
      // Internal navigation changes content only, never the shared shell.
      request.render();setOpacity(content(),1);
    }
  }
  return {
    get state(){return state;},
    get busy(){return state==='opening'||state==='closing';},
    navigate(request){
      if(destroyed)return;
      if(state==='closing'){
        // A repeated close cancels a pending reopen without scheduling a second
        // close lifecycle. Otherwise the most recent destination wins.
        queued=request.key==='home'?null:request;
        return;
      }
      if(state==='opening'){
        queued=request;
        // A close/reopen during entrance settles the existing entrance before
        // consuming the latest request; closing itself always finishes in order.
        this.complete();
        return;
      }
      apply(request);
    },
    complete(){
      if(destroyed)return;
      forceInstant=true;
      const current=active;
      if(current){current.animation?.complete?.();current.finish();}
      forceInstant=false;
    },
    destroy(){
      if(destroyed)return;
      destroyed=true;sequence++;queued=null;
      active?.animation?.cancel?.();active=null;
      layout?.revert();
      mask(false);if(origin){origin.style.visibility='';setOpacity(portalContent(origin),1);}
      setOpacity(content(),1);hideBackdrop();if(dialog.open)dialog.close();state='closed';
    },
  };
}

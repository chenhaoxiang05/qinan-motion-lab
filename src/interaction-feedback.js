/** Bounded feedback on already committed content; no state change waits for motion. */
export function createInteractionFeedback({root=globalThis.document,animate,motionEnabled=()=>true}={}){
  const doc=root.ownerDocument||root,active=new Map(),oldMotion=doc.documentElement.getAttribute('data-feedback-motion');let paused=false,destroyed=false;
  const sync=()=>doc.documentElement.setAttribute('data-feedback-motion',paused||doc.hidden||!motionEnabled()?'paused':'running');
  const properties=['--feedback-shift','--feedback-light','--feedback-scale'];
  function finish(node,job){
    if(active.get(node)!==job)return;
    active.delete(node);clearTimeout(job.timer);
    try{job.animation?.cancel?.();}catch{/* The final readable state is authoritative. */}
    for(const [name,{value,priority}] of job.styles){if(value)node.style.setProperty(name,value,priority);else node.style.removeProperty(name);}
    if(job.kind===null)node.removeAttribute('data-feedback-kind');else node.setAttribute('data-feedback-kind',job.kind);
  }
  function settle(scope){for(const [node,job] of active)if(!scope||scope===node||scope.contains?.(node))finish(node,job);}
  function cue(node,{kind='change'}={}){
    if(!node)return;settle(node);
    if(destroyed||paused||doc.hidden||!motionEnabled()||!node.isConnected||typeof animate!=='function')return;
    const styles=new Map(properties.map(name=>[name,{value:node.style.getPropertyValue(name),priority:node.style.getPropertyPriority(name)}]));
    const job={styles,kind:node.getAttribute('data-feedback-kind'),animation:null,timer:null};
    const state={feedbackProgress:0,feedbackKind:kind};active.set(node,job);node.setAttribute('data-feedback-kind',kind);
    const paint=()=>{
      if(active.get(node)!==job||destroyed||!node.isConnected)return;
      const p=Math.min(1,Math.max(0,state.feedbackProgress));
      const shift=kind==='error'?Math.sin(p*Math.PI*4)*(1-p)*3:kind==='press'?0:(1-p)*(kind==='success'?3:6);
      node.style.setProperty('--feedback-shift',`${shift.toFixed(3)}px`);
      node.style.setProperty('--feedback-light',String(1-p));
      node.style.setProperty('--feedback-scale',String(kind==='press'?1-Math.sin(p*Math.PI)*.025:1));
    };
    paint();const duration=kind==='press'?180:kind==='error'?320:kind==='success'?400:260;
    job.timer=setTimeout(()=>finish(node,job),duration+180);
    try{
      const animation=animate(state,{feedbackProgress:1,duration,ease:kind==='error'?'linear':'out(3)',onUpdate:paint,onComplete:()=>finish(node,job)});
      if(active.get(node)===job)job.animation=animation;else animation?.cancel?.();
    }catch{finish(node,job);}
  }
  const visibility=()=>{sync();if(doc.hidden)settle();};doc.addEventListener('visibilitychange',visibility);sync();
  return {cue,settle,setPaused(value){if(destroyed)return;paused=!!value;sync();if(paused)settle();},destroy(){if(destroyed)return;settle();destroyed=true;doc.removeEventListener('visibilitychange',visibility);if(oldMotion===null)doc.documentElement.removeAttribute('data-feedback-motion');else doc.documentElement.setAttribute('data-feedback-motion',oldMotion);}};
}

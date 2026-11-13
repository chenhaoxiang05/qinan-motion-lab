/** One finite entrance shared by the DOM, equipment field and mechanical emblem. */
export function createHomeMotion({root=globalThis.document,createTimeline,visual={},motionEnabled=()=>true}={}) {
  const doc=root.ownerDocument||root,win=doc.defaultView;
  let timeline=null,timer=null,played=false,paused=false,destroyed=false,revision=0;
  const touched=new Map(),decorations=[];
  const find=selector=>[...root.querySelectorAll(selector)];
  const remember=(node,properties)=>{
    if(!node)return;
    let saved=touched.get(node);if(!saved){saved=new Map();touched.set(node,saved);}
    for(const property of properties)if(!saved.has(property))saved.set(property,[node.style.getPropertyValue(property),node.style.getPropertyPriority(property)]);
  };
  const apply=(node,properties)=>{remember(node,Object.keys(properties));for(const [key,value] of Object.entries(properties))node.style.setProperty(key,value);};
  function finish(){
    revision++;clearTimeout(timer);timer=null;
    try{timeline?.cancel?.();}catch{/* Restoring content never depends on the engine. */}
    timeline=null;
    for(const [node,properties] of touched)for(const [property,[value,priority]] of properties){
      if(value)node.style.setProperty(property,value,priority);else node.style.removeProperty(property);
    }
    touched.clear();decorations.splice(0).forEach(node=>node.remove());
    doc.documentElement.classList.remove('home-arriving');
    visual.setEntranceProgress?.(1);
  }
  function play({variant='first',reason='ready'}={}){
    if(destroyed||played)return;
    played=true;
    const hash=win?.location.hash.slice(1);
    if(reason!=='ready'||paused||!motionEnabled()||doc.hidden||(hash&&hash!=='home')||typeof createTimeline!=='function'){finish();return;}
    const mobile=(win?.innerWidth||1440)<700;
    const duration=variant==='return'?450:mobile?650:1250,factor=duration/1250;
    const localRevision=++revision,state={progress:0};
    const lines=find('[data-home-line]'),cards=find('.portal-node');
    doc.documentElement.classList.add('home-arriving');
    visual.setEntranceProgress?.(0);
    try{
      timeline=createTimeline({autoplay:false,onComplete(){if(revision===localRevision)finish();}});
      timeline.add(state,{progress:[0,1],duration:780*factor,ease:'out(3)',onUpdate(){if(revision===localRevision)visual.setEntranceProgress?.(state.progress);}},0);
      lines.forEach((line,index)=>{
        const original=line.querySelector('.home-line-original')||line;
        apply(original,{'transform':'translateY(20px)','clip-path':'inset(100% 0 0 0)'});
        timeline.add(original,{y:[20,0],clipPath:['inset(100% 0 0 0)','inset(0% 0 0 0)'],duration:430*factor,ease:'out(4)'},(120+index*90)*factor);
        if(!mobile&&variant==='first'){
          const slice=original.cloneNode(true);slice.className='home-line-slice';slice.removeAttribute('style');slice.setAttribute('aria-hidden','true');slice.setAttribute('inert','');
          slice.removeAttribute('id');slice.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
          line.append(slice);decorations.push(slice);
          timeline.add(slice,{x:[index?-8:8,0],opacity:[.65,0],duration:170*factor,ease:value=>Math.ceil(value*3)/3},(590+index*65)*factor);
        }
      });
      for(const underline of find('.home-underline')){
        apply(underline,{'transform':'scaleX(0)'});
        timeline.add(underline,{scaleX:[0,1],duration:420*factor,ease:'out(4)'},760*factor);
      }
      for(const period of find('.home-line-original .title-period')){
        apply(period,{'opacity':'0','transform':'translateY(6px)'});
        timeline.add(period,{opacity:[0,1],y:[6,0],duration:160*factor,ease:'out(3)'},1050*factor);
      }
      for(const copy of find('.intro-copy>p,.intro-coordinate')){
        apply(copy,{'opacity':'.35','transform':'translateY(8px)'});
        timeline.add(copy,{opacity:[.35,1],y:[8,0],duration:360*factor,ease:'out(3)'},420*factor);
      }
      cards.forEach((card,index)=>{
        const content=card.querySelector('.portal-content');if(!content)return;
        const marker=doc.createElement('i');marker.className='portal-arrival-marker';marker.setAttribute('aria-hidden','true');card.append(marker);decorations.push(marker);
        apply(content,{'clip-path':'inset(0 100% 0 0)','transform':'translateX(-6px)'});
        timeline.add(marker,{opacity:[0,1],duration:80*factor,ease:'linear'},(420+index*65)*factor);
        timeline.add(content,{clipPath:['inset(0 100% 0 0)','inset(0 0% 0 0)'],x:[-6,0],duration:240*factor,ease:'out(3)'},(500+index*65)*factor);
      });
      // Keep a bounded final beat even when a supplied page has no title nodes.
      timeline.add({progress:0},{progress:1,duration,ease:'linear'},0);
      timer=setTimeout(()=>{if(revision===localRevision)finish();},duration+250);
      timeline.play();
    }catch{finish();}
  }
  const settle=()=>{if(timeline)finish();};
  const visibility=()=>{if(doc.hidden)settle();};
  win?.addEventListener('resize',settle);win?.addEventListener('hashchange',settle);doc.addEventListener('visibilitychange',visibility);
  return {play,finish,setPaused(value){paused=Boolean(value);if(paused)finish();},destroy(){if(destroyed)return;finish();destroyed=true;win?.removeEventListener('resize',settle);win?.removeEventListener('hashchange',settle);doc.removeEventListener('visibilitychange',visibility);}};
}

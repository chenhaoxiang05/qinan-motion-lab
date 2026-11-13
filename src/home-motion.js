/** Prepare behind the boot poster, then reveal one complete, finite homepage. */
export function createHomeMotion({root=globalThis.document,createTimeline,visual={},motionEnabled=()=>true}={}) {
  const doc=root.ownerDocument||root,win=doc.defaultView;
  let timeline=null,timer=null,prepared=false,played=false,cancelled=false,paused=false,destroyed=false,revision=0;
  const touched=new Map(),decorations=[];
  const find=selector=>[...root.querySelectorAll(selector)];
  const homeRoute=()=>!win?.location.hash||win.location.hash==='#home';
  const setEntrance=value=>{try{visual.setEntranceProgress?.(value);}catch{/* Optional 3D rendering cannot hold the text hidden. */}};
  const allowed=()=>!paused&&motionEnabled()&&!doc.hidden&&homeRoute();
  const remember=(node,properties)=>{
    if(!node)return;
    let saved=touched.get(node);if(!saved){saved=new Map();touched.set(node,saved);}
    for(const property of properties)if(!saved.has(property))saved.set(property,[node.style.getPropertyValue(property),node.style.getPropertyPriority(property)]);
  };
  const apply=(node,properties)=>{remember(node,Object.keys(properties));for(const [key,value] of Object.entries(properties))node.style.setProperty(key,value);};
  function settle(interrupted=true){
    if(interrupted&&(prepared||timeline))cancelled=true;
    revision++;clearTimeout(timer);timer=null;
    try{timeline?.cancel?.();}catch{/* Visibility restoration does not depend on the engine. */}
    timeline=null;prepared=false;
    for(const [node,properties] of touched)for(const [property,[value,priority]] of properties){
      if(value)node.style.setProperty(property,value,priority);else node.style.removeProperty(property);
    }
    touched.clear();decorations.splice(0).forEach(node=>node.remove());
    doc.documentElement.classList.remove('home-prepared','home-arriving');
    setEntrance(1);
  }
  function prepare(){
    if(destroyed||played||cancelled||prepared)return false;
    const boot=doc.querySelector('#boot');
    if(!boot||boot.hidden||win?.__qinanBootExpired||!allowed()||typeof createTimeline!=='function'){settle();return false;}
    prepared=true;
    doc.documentElement.classList.add('home-prepared');
    for(const node of find('.site-header,.edition,.home-line-original,.intro-copy>p,.intro-coordinate,#sculptureAnchor,.portal-node,.core-controller,.stage-index,.home-bottom,.site-footer'))apply(node,{opacity:'0'});
    // Hide the whole card, including its background, pseudo-elements and border.
    // CSS remains fully visible if this optional controller cannot initialize.
    setEntrance(0);
    timer=setTimeout(()=>settle(),5000);
    return true;
  }
  function play({variant='first',reason='ready'}={}){
    if(destroyed||played||cancelled)return;
    played=true;
    if(!prepared||reason!=='ready'||!allowed()||typeof createTimeline!=='function'){settle();return;}
    clearTimeout(timer);timer=null;
    const mobile=(win?.innerWidth||1440)<700;
    const duration=variant==='return'?360:mobile?650:1050,factor=duration/1050;
    const localRevision=++revision,state={progress:0};
    doc.documentElement.classList.remove('home-prepared');doc.documentElement.classList.add('home-arriving');
    const addFade=(nodes,start,length,{travel=0,scale=1}={})=>{
      for(const node of nodes){
        const parameters={opacity:[0,1],duration:length*factor,ease:'out(3)'};
        if(travel||scale!==1){
          apply(node,{transform:`translateY(${travel}px) scale(${scale})`});
          parameters.y=[travel,0];if(scale!==1)parameters.scale=[scale,1];
        }
        timeline.add(node,parameters,start*factor);
      }
    };
    try{
      timeline=createTimeline({autoplay:false,onComplete(){if(revision===localRevision)settle(false);}});
      addFade(find('.site-header'),0,240,{travel:6});
      addFade(find('.edition'),60,260);
      timeline.add(state,{progress:[0,1],duration:620*factor,ease:'out(3)',onUpdate(){if(revision===localRevision)setEntrance(state.progress);}},80*factor);
      addFade(find('#sculptureAnchor'),80,300);
      find('[data-home-line]').forEach((line,index)=>addFade([line.querySelector('.home-line-original')||line],120+index*80,360,{travel:14}));
      find('.portal-node').forEach((card,index)=>{
        const start=350+index*90;
        addFade([card],start,300,{travel:10,scale:.97});
        const content=card.querySelector('.portal-content');
        if(content){apply(content,{opacity:'0'});addFade([content],start+65,235);}
      });
      addFade(find('.intro-copy>p,.intro-coordinate,.core-controller,.stage-index,.home-bottom,.site-footer'),740,310);
      // Existing placement transforms on the caption/controller are untouched.
      for(const caption of find('.art-caption')){apply(caption,{opacity:'0'});addFade([caption],740,310);}
      if(variant==='first')for(const word of find('.home-line-original .title-accent')){
        const scan=doc.createElement('span');scan.className='home-word-scan';scan.textContent=word.textContent;
        scan.setAttribute('aria-hidden','true');scan.setAttribute('inert','');word.append(scan);decorations.push(scan);
        timeline.add(scan,{clipPath:['polygon(-40% 0,-24% 0,-44% 100%,-60% 100%)','polygon(160% 0,176% 0,156% 100%,140% 100%)'],duration:320*factor,ease:'linear'},360*factor);
      }
      timeline.add({progress:0},{progress:1,duration,ease:'linear'},0);
      timer=setTimeout(()=>{if(revision===localRevision)settle();},duration+250);
      timeline.play();
    }catch{settle();}
  }
  const finish=()=>settle();
  const active=()=>prepared||timeline!==null;
  const interruption=()=>{if(active())finish();};
  const visibility=()=>{if(doc.hidden)interruption();};
  const homeInteraction=event=>{if(active()&&event.target?.closest?.('.site-header,.home-stage,.site-footer,#world'))finish();};
  const portalPointer=event=>{if(timeline&&event.target?.closest?.('.portal-node'))finish();};
  win?.addEventListener('resize',interruption);win?.addEventListener('hashchange',interruption);doc.addEventListener('visibilitychange',visibility);
  doc.addEventListener('focusin',homeInteraction,true);doc.addEventListener('pointerdown',homeInteraction,true);doc.addEventListener('pointermove',portalPointer,true);
  return {prepare,play,finish,get active(){return active();},setPaused(value){paused=Boolean(value);if(paused)finish();},destroy(){if(destroyed)return;finish();destroyed=true;win?.removeEventListener('resize',interruption);win?.removeEventListener('hashchange',interruption);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('focusin',homeInteraction,true);doc.removeEventListener('pointerdown',homeInteraction,true);doc.removeEventListener('pointermove',portalPointer,true);}};
}

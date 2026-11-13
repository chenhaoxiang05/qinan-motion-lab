const owners=new WeakMap();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Two opposite corner lights. The viewport alone clips this independent layer. */
export function createAmbientBackground({host,animate,motionEnabled=()=>true}={}) {
  if(!host)throw new TypeError('The ambient background needs its host.');
  owners.get(host)?.destroy();
  const doc=host.ownerDocument,win=doc.defaultView;
  const media=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let destroyed=false,manualPaused=false,covered=false,entrance=1,paused=true;
  let pointerAnimation=null,pointerRevision=0;
  const pointer={rotation:0,shift:0};
  host.replaceChildren();host.setAttribute('aria-hidden','true');host.dataset.ambientMounted='true';
  host.innerHTML=`<div class="ambient-environment" aria-hidden="true">
    <div class="ambient-rotation"><div class="ambient-sway"><div class="ambient-depth">
      <div class="ambient-light ambient-light-primary"><div class="ambient-light-fill"></div></div>
      <div class="ambient-light ambient-light-secondary"><div class="ambient-light-fill"></div></div>
    </div></div></div>
    <div class="ambient-veil"></div>
  </div>`;
  function stopPointer(){
    pointerRevision++;const previous=pointerAnimation;pointerAnimation=null;
    try{previous?.cancel?.();}catch{/* The still composition does not depend on the animation engine. */}
  }
  function paintPointer(){
    if(destroyed)return;
    host.style.setProperty('--ambient-rotation',`${pointer.rotation.toFixed(3)}deg`);
    host.style.setProperty('--ambient-shift',String(Number(pointer.shift.toFixed(4))));
  }
  function sync(){
    if(destroyed)return;
    let enabled=true;try{enabled=motionEnabled()!==false;}catch{enabled=false;}
    paused=manualPaused||covered||doc.hidden||Boolean(media?.matches)||!enabled||entrance<.99;
    host.dataset.ambientState=paused?'paused':'running';
    if(paused)stopPointer();
  }
  function resize(){
    if(destroyed)return;
    // Re-centre before CSS switches its viewport unit or aspect-ratio layout.
    stopPointer();pointer.rotation=0;pointer.shift=0;paintPointer();
  }
  const controller={
    setPaused(value){if(destroyed)return;manualPaused=Boolean(value);sync();},
    setCovered(value){if(destroyed)return;covered=Boolean(value);sync();},
    setEntranceProgress(value){if(destroyed)return;entrance=clamp(Number.isFinite(value)?value:1,0,1);host.style.setProperty('--ambient-entrance',String(entrance));sync();},
    setPointer(x,y){
      if(destroyed||paused)return;
      const horizontal=clamp(Number.isFinite(x)?x:.5,0,1)-.5;
      const vertical=clamp(Number.isFinite(y)?y:.5,0,1)-.5;
      stopPointer();if(typeof animate!=='function')return;
      const revision=pointerRevision;let complete=false;
      try{
        const animation=animate(pointer,{rotation:horizontal*30,shift:vertical*8,duration:3000,ease:'out(3)',
          onUpdate(){if(revision===pointerRevision)paintPointer();},
          onComplete(){complete=true;if(revision===pointerRevision)pointerAnimation=null;}});
        if(!complete)pointerAnimation=animation;
      }catch{/* CSS keeps the corner lights complete and gently moving. */}
    },
    destroy(){
      if(destroyed)return;destroyed=true;stopPointer();
      doc.removeEventListener('visibilitychange',sync);media?.removeEventListener?.('change',sync);win?.removeEventListener('resize',resize);
      host.replaceChildren();delete host.dataset.ambientMounted;delete host.dataset.ambientState;
      for(const property of ['--ambient-rotation','--ambient-shift','--ambient-entrance'])host.style.removeProperty(property);
      if(owners.get(host)===controller)owners.delete(host);
    },
  };
  owners.set(host,controller);doc.addEventListener('visibilitychange',sync);media?.addEventListener?.('change',sync);win?.addEventListener('resize',resize);
  sync();return controller;
}

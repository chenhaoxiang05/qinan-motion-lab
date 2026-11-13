const owners = new WeakMap();
const PORTALS = new Set(['check','contacts','practice','history']);
const STREAMS = [
  ['M-360 600 700-460','check','4.3s','-1.3s'],
  ['M-210 1070 1230-370','contacts','5.4s','-3.7s'],
  ['M140 1150 1580-290','practice','6.6s','-2.1s'],
  ['M520 1180 1740-40','history','4.9s','-4.1s'],
  ['M-480 900 900-480','ambient','5.9s','-1.8s'],
];
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

/** A viewport environment; the optional 3D seal and React island cannot hide it. */
export function createAmbientBackground({host,animate,motionEnabled=()=>true,islands={}}={}) {
  if (!host) throw new TypeError('The ambient background needs its host.');
  owners.get(host)?.destroy();
  const doc=host.ownerDocument,win=doc.defaultView;
  const media=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let destroyed=false,manualPaused=false,covered=false,entrance=1,activePortal=null;
  let pointerAnimation=null,pointerRevision=0,matrix=null,matrixFactory=null,matrixState='',paused=true;
  const pointer={x:0,y:0};
  host.replaceChildren();
  host.setAttribute('aria-hidden','true');host.dataset.ambientMounted='true';
  host.innerHTML=`<div class="ambient-environment" aria-hidden="true">
    <div class="ambient-parallax"><div class="ambient-depth">
      <div class="ambient-light ambient-light-primary"></div><div class="ambient-light ambient-light-secondary"></div>
      <svg class="ambient-streams" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        ${STREAMS.map(([d,route,duration,delay])=>`<path class="ambient-track" d="${d}"/><path class="ambient-stream" data-route="${route}" d="${d}" style="--stream-duration:${duration};--stream-delay:${delay}"/>`).join('')}
        <path class="ambient-geometry" d="M1040 102h154v42m-142-31h130M1232 622h57v96m-10-84v72M56 720h38m-19-19v38M840 818h158m-144-7v14m132-14v14"/>
        <path class="ambient-cobalt" d="m1052 78 65 0-10 12h-65z"/>
      </svg>
    </div></div>
    <div class="ambient-veil"></div>
    <div class="ambient-matrix-frame"><div class="ambient-matrix-slot" aria-hidden="true"></div></div>
  </div>`;
  const slot=host.querySelector('.ambient-matrix-slot');
  const matrixProps=()=>({paused,activePortal});
  function stopPointer() { pointerRevision++;const animation=pointerAnimation;pointerAnimation=null;try{animation?.cancel?.();}catch{/* Static colour remains usable without Anime. */} }
  function paintPointer() {
    if(destroyed)return;
    host.style.setProperty('--ambient-pointer-x',`${pointer.x.toFixed(2)}px`);
    host.style.setProperty('--ambient-pointer-y',`${pointer.y.toFixed(2)}px`);
  }
  function sync() {
    if(destroyed)return;
    let enabled=true;try{enabled=motionEnabled()!==false;}catch{enabled=false;}
    paused=manualPaused||covered||doc.hidden||Boolean(media?.matches)||!enabled||entrance<.99;
    host.dataset.ambientState=paused?'paused':'running';
    if(paused)stopPointer();
    updateMatrix();
  }
  function updateMatrix() {
    if(!matrix)return;
    const state=`${paused}:${activePortal}`;
    if(state===matrixState)return;
    matrixState=state;
    try{matrix.update?.(matrixProps());}catch{destroyMatrix();}
  }
  function destroyMatrix() {
    const previous=matrix;matrix=null;matrixFactory=null;matrixState='';
    try{previous?.destroy?.();}catch{/* The environment remains visible if an optional island fails. */}
    finally{slot.replaceChildren();delete slot.dataset.matrixMounted;}
  }
  function refreshIslands(next={}) {
    if(destroyed)return;
    const factory=next?.mountMatrixField;
    if(typeof factory!=='function'){if(matrix)destroyMatrix();return;}
    if(factory===matrixFactory){updateMatrix();return;}
    destroyMatrix();
    try{matrix=factory(slot,matrixProps());matrixFactory=factory;matrixState=`${paused}:${activePortal}`;slot.dataset.matrixMounted='true';}
    catch{matrix=null;matrixFactory=null;slot.replaceChildren();delete slot.dataset.matrixMounted;}
  }
  const controller={
    setPaused(value){if(destroyed)return;manualPaused=Boolean(value);sync();},
    setCovered(value){if(destroyed)return;covered=Boolean(value);sync();},
    setEntranceProgress(value){if(destroyed)return;entrance=clamp(Number.isFinite(value)?value:1,0,1);host.style.setProperty('--ambient-entrance',String(entrance));sync();},
    setPointer(x,y){
      if(destroyed||paused)return;
      const target={x:(clamp(Number.isFinite(x)?x:.5,0,1)-.5)*72,y:(clamp(Number.isFinite(y)?y:.5,0,1)-.5)*72};
      stopPointer();
      if(typeof animate!=='function')return;
      const revision=pointerRevision;let complete=false;
      try{
        const animation=animate(pointer,{...target,duration:1000,ease:'out(3)',onUpdate(){if(revision===pointerRevision)paintPointer();},onComplete(){complete=true;if(revision===pointerRevision)pointerAnimation=null;}});
        if(!complete)pointerAnimation=animation;
      }
      catch{/* The continuously moving environment does not require pointer parallax. */}
    },
    setPortalFocus(id){if(destroyed)return;activePortal=PORTALS.has(id)?id:null;if(activePortal)host.dataset.activePortal=activePortal;else delete host.dataset.activePortal;updateMatrix();},
    refreshIslands,
    destroy(){
      if(destroyed)return;destroyed=true;stopPointer();
      doc.removeEventListener('visibilitychange',sync);media?.removeEventListener?.('change',sync);
      destroyMatrix();host.replaceChildren();
      for(const key of ['ambientMounted','ambientState','activePortal'])delete host.dataset[key];
      for(const property of ['--ambient-pointer-x','--ambient-pointer-y','--ambient-entrance'])host.style.removeProperty(property);
      if(owners.get(host)===controller)owners.delete(host);
    },
  };
  owners.set(host,controller);doc.addEventListener('visibilitychange',sync);media?.addEventListener?.('change',sync);
  sync();refreshIslands(islands);return controller;
}

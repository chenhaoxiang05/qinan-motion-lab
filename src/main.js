import './style.css';
import './workspace.css';
import './fui.css';
import './typography.css';
import './background-layer.css';
import './home-motion.css';
import './portal-motion.css';
import './transition-content.css';
import './practice.css';
import './product.css';
import './workspace-intro.css';
import './usage-guide.css';
import './interaction-polish.css';
import './interaction-feedback.css';
import './task-state.css';
import './boot.css';
import { createBootSequence } from './boot.js';
import { animate, utils, createSpring, createLayout, createTimeline } from 'animejs';
import { initApp } from './app.js';
import { createHomeMotion } from './home-motion.js';
import { createFontReadiness } from './font-ready.js';
import { createAmbientBackground } from './ambient-background.js';
import { portalIcon } from './portal-icons.js';
import { createPortalMotion } from './portal-motion.js';

// Mount the usable interface first; the 3D engine is a separate lazy chunk.
let scene, boot, app, homeMotion, disposed=false;
const islands={};
const fontReadiness=createFontReadiness();
document.querySelector('.scene-placeholder')?.classList.remove('is-ready');
const desired={paused:false,focused:false,portal:null,portalId:null,entrance:1};
document.querySelectorAll('[data-portal-icon]').forEach(host=>{host.innerHTML=portalIcon(host.dataset.portalIcon);host.setAttribute('aria-hidden','true');});
const portalMotion=createPortalMotion({root:document});
// The environment is a usable layer of its own, never a side effect of WebGL.
const ambient=createAmbientBackground({host:document.querySelector('.stage-background'),animate,motionEnabled:()=>!desired.paused&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches});
const trackAmbientPointer=event=>{
  if(event.pointerType==='touch'||window.innerWidth<700)return;
  ambient.setPointer(event.clientX/window.innerWidth,event.clientY/window.innerHeight);
};
const resetAmbientPointer=()=>ambient.setPointer(.5,.5);
window.addEventListener('pointermove',trackAmbientPointer,{passive:true});
document.documentElement.addEventListener('pointerleave',resetAmbientPointer);
const visual={
  pause(){desired.paused=true;ambient.setPaused(true);scene?.pause();boot?.setPaused(true);},
  resume(){desired.paused=false;ambient.setPaused(false);scene?.resume();},
  focus(value){desired.focused=value;ambient.setCovered(value);scene?.focus(value);},
  setPortalFocus(value,portalId=value?.portalId??null){desired.portal=value;desired.portalId=portalId;scene?.setPortalFocus?.(value,portalId);},
  setEntranceProgress(value){desired.entrance=value;ambient.setEntranceProgress(value);const placeholder=document.querySelector('.scene-placeholder');if(placeholder)placeholder.style.visibility=value<=0?'hidden':'';scene?.setEntranceProgress?.(value);},
  pointerPulse(x,y){scene?.pointerPulse?.(x,y);},
  async toggleForm(){await sceneReady;return disposed?'shield':scene.toggleForm();},
  dispose(){disposed=true;window.removeEventListener('pointermove',trackAmbientPointer);document.documentElement.removeEventListener('pointerleave',resetAmbientPointer);for(const event of ['pointerover','focusin','click'])document.removeEventListener(event,onIslandIntent,true);window.removeEventListener('hashchange',loadRouteIslands);ambient.destroy();fontReadiness.destroy();homeMotion?.destroy();boot?.destroy();scene?.dispose();}
};
const sceneReady=import('./scene.js').then(({createSanctuary})=>{
  if(disposed)return;
  scene=createSanctuary(document.querySelector('#world'));
  document.querySelector('.scene-placeholder')?.classList.add('is-ready');
  if(desired.paused)scene.pause();scene.focus(desired.focused);scene.setPortalFocus?.(desired.portal,desired.portalId);scene.setEntranceProgress?.(desired.entrance);
  return document.querySelector('.scene-fallback') ? {fallback:true,label:'备用场景已就绪'} : undefined;
}).catch(()=>{
  if(disposed)return;
  // Even a failed lazy-chunk download leaves the control usable.
  const placeholder=document.querySelector('.scene-placeholder');
  const slogan=document.createElement('span');slogan.className='placeholder-slogan';slogan.textContent='先核实\n再放心';slogan.hidden=true;placeholder?.append(slogan);
  document.documentElement.dataset.sceneRenderer='fallback';
  let form='shield';
  scene={
    pause(){},resume(){},focus(){},setEntranceProgress(){},setPortalFocus(){},
    dispose(){delete document.documentElement.dataset.sceneRenderer;slogan.remove();},
    async toggleForm(){
      form=form==='shield'?'slogan':'shield';
      if(placeholder){
        placeholder.classList.toggle('is-slogan',form==='slogan');
        slogan.hidden=form!=='slogan';
      }
      return form;
    }
  };
  return {fallback:true,label:'备用场景已就绪'};
});
// Homepage interaction needs no React chunk. Start optional components only on
// a feature/help intent (or a deep link), while the native controls remain usable.
let islandsReady;
function loadIslands(){
  if(disposed)return Promise.resolve();
  if(!islandsReady)islandsReady=import('./rare-islands.jsx').then(module=>{
    if(disposed)return;
    Object.assign(islands,module);
    app?.refreshIslands();
  }).catch(()=>({fallback:true,label:'基础交互已就绪'}));
  return islandsReady;
}
function onIslandIntent(event){
  if(event.target instanceof Element&&event.target.closest('[data-portal],#startCheck,#howItWorks,#helpButton,#uploadHelp'))void loadIslands();
}
function loadRouteIslands(){if(location.hash&&location.hash!=='#home')void loadIslands();}
for(const event of ['pointerover','focusin','click'])document.addEventListener(event,onIslandIntent,true);
window.addEventListener('hashchange',loadRouteIslands);
loadRouteIslands();
let motionPaused=false;
try{motionPaused=localStorage.getItem('qinan-motion-paused')==='true';}catch{/* Optional storage. */}
let markInterfaceReady;
const interfaceMounted=new Promise(resolve=>{markInterfaceReady=resolve;});
const interfaceReady=Promise.all([interfaceMounted,fontReadiness.ready]).then(([,fonts])=>fonts.fallback?{fallback:true,label:'界面已就绪 · 基础字体'}:{label:'界面与字体已就绪'});
boot=createBootSequence({
  stages:[
    {id:'interface',label:'界面',ready:interfaceReady},
    {id:'interaction',label:'基础交互',ready:interfaceMounted},
    {id:'scene',label:'场景',ready:sceneReady},
  ],
  createTimeline,motionPaused,
});
homeMotion=createHomeMotion({createTimeline,visual,motionEnabled:()=>!document.body.classList.contains('motion-off')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches});
homeMotion.prepare();
boot.finished.then(details=>{fontReadiness.finalize();homeMotion.play(details);});
app=initApp({animate,utils,createSpring,createLayout,visual,islands,homeMotion,portalMotion,apiBase:import.meta.env.VITE_API_BASE_URL||'/api',startReady:boot.finished});
markInterfaceReady();
if(import.meta.hot)import.meta.hot.dispose(()=>app.destroy());

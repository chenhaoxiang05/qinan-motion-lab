import './style.css';
import './workspace.css';
import './fui.css';
import './background-layer.css';
import './home-motion.css';
import './transition-content.css';
import './practice.css';
import './product.css';
import './boot.css';
import { createBootSequence } from './boot.js';
import { animate, utils, createSpring, createLayout, createTimeline } from 'animejs';
import { initApp } from './app.js';
import { createHomeMotion } from './home-motion.js';

// Mount the usable interface first; the 3D engine is a separate lazy chunk.
let scene, boot, app, homeMotion, disposed=false;
const islands={};
document.querySelector('.scene-placeholder')?.classList.remove('is-ready');
const desired={paused:false,focused:false,portal:null,portalId:null,entrance:1};
const visual={
  pause(){desired.paused=true;scene?.pause();boot?.setPaused(true);},
  resume(){desired.paused=false;scene?.resume();},
  focus(value){desired.focused=value;scene?.focus(value);},
  setPortalFocus(value,portalId=value?.portalId??null){desired.portal=value;desired.portalId=portalId;scene?.setPortalFocus?.(value,portalId);},
  setEntranceProgress(value){desired.entrance=value;scene?.setEntranceProgress?.(value);},
  pointerPulse(x,y){scene?.pointerPulse?.(x,y);},
  async toggleForm(){await sceneReady;return disposed?'shield':scene.toggleForm();},
  dispose(){disposed=true;homeMotion?.destroy();boot?.destroy();scene?.dispose();}
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
  let form='shield';
  scene={
    pause(){},resume(){},focus(){},dispose(){},setEntranceProgress(){},setPortalFocus(){},
    async toggleForm(){
      form=form==='shield'?'slogan':'shield';
      if(placeholder){
        placeholder.classList.toggle('is-slogan',form==='slogan');
        placeholder.firstElementChild.textContent=form==='slogan'?'先核实\n再放心':'安';
      }
      return form;
    }
  };
  return {fallback:true,label:'备用场景已就绪'};
});
// The optional React islands and the scene download in parallel. The plain DOM
// application is available immediately, including when either chunk fails.
const islandsReady=import('./rare-islands.jsx').then(module=>{
  if(disposed)return;
  Object.assign(islands,module);
  app?.refreshIslands();
}).catch(()=>({fallback:true,label:'基础交互已就绪'}));
let motionPaused=false;
try{motionPaused=localStorage.getItem('qinan-motion-paused')==='true';}catch{/* Optional storage. */}
let markInterfaceReady;
const interfaceReady=new Promise(resolve=>{markInterfaceReady=resolve;});
boot=createBootSequence({
  stages:[
    {id:'interface',label:'界面',ready:interfaceReady},
    {id:'interaction',label:'交互组件',ready:islandsReady},
    {id:'scene',label:'场景',ready:sceneReady},
  ],
  createTimeline,motionPaused,
});
homeMotion=createHomeMotion({createTimeline,visual,motionEnabled:()=>!document.body.classList.contains('motion-off')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches});
boot.revealing.then(details=>homeMotion.play(details));
app=initApp({animate,utils,createSpring,createLayout,visual,islands,homeMotion,apiBase:import.meta.env.VITE_API_BASE_URL||'/api',startReady:boot.finished});
markInterfaceReady();
if(import.meta.hot)import.meta.hot.dispose(()=>app.destroy());

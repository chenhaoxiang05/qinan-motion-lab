import './style.css';
import './workspace.css';
import { animate, utils, createSpring, createLayout } from 'animejs';
import { initApp } from './app.js';

// Mount the usable interface first; the 3D engine is a separate lazy chunk.
let scene, disposed=false;
document.querySelector('.scene-placeholder')?.classList.remove('is-ready');
const desired={paused:false,focused:false,portal:null};
const visual={
  pause(){desired.paused=true;scene?.pause();},
  resume(){desired.paused=false;scene?.resume();},
  focus(value){desired.focused=value;scene?.focus(value);},
  setPortalFocus(value){desired.portal=value;scene?.setPortalFocus?.(value);},
  pointerPulse(x,y){scene?.pointerPulse?.(x,y);},
  async toggleForm(){await sceneReady;return disposed?'shield':scene.toggleForm();},
  dispose(){disposed=true;scene?.dispose();}
};
const app=initApp({animate,utils,createSpring,createLayout,visual});
const sceneReady=import('./scene.js').then(({createSanctuary})=>{
  if(disposed)return;
  scene=createSanctuary(document.querySelector('#world'));
  document.querySelector('.scene-placeholder')?.classList.add('is-ready');
  if(desired.paused)scene.pause();scene.focus(desired.focused);scene.setPortalFocus?.(desired.portal);
}).catch(()=>{
  if(disposed)return;
  // Even a failed lazy-chunk download leaves the control usable.
  const placeholder=document.querySelector('.scene-placeholder');
  let form='shield';
  scene={
    pause(){},resume(){},focus(){},dispose(){},
    async toggleForm(){
      form=form==='shield'?'slogan':'shield';
      if(placeholder){
        placeholder.classList.toggle('is-slogan',form==='slogan');
        placeholder.firstElementChild.textContent=form==='slogan'?'先核实\n再放心':'安';
      }
      return form;
    }
  };
});
if(import.meta.hot)import.meta.hot.dispose(()=>app.destroy());

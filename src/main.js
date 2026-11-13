import './style.css';
import { animate, utils, createSpring } from 'animejs';
import { initApp } from './app.js';

// Mount the usable interface first; the 3D engine is a separate lazy chunk.
let scene, disposed=false;
const desired={paused:false,focused:false};
const visual={
  pause(){desired.paused=true;scene?.pause();},
  resume(){desired.paused=false;scene?.resume();},
  focus(value){desired.focused=value;scene?.focus(value);},
  burst(){return scene?.burst()??false;},
  dispose(){disposed=true;scene?.dispose();}
};
const app=initApp({animate,utils,createSpring,visual});
import('./scene.js').then(({createSanctuary})=>{
  if(disposed)return;
  scene=createSanctuary(document.querySelector('#world'));
  if(desired.paused)scene.pause();scene.focus(desired.focused);
}).catch(()=>{
  // The local CSS sculpture and every feature remain available if WebGL fails.
});
if(import.meta.hot)import.meta.hot.dispose(()=>app.destroy());

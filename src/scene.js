import * as THREE from 'three';
import {animate} from 'animejs';
import glyphs from './glyphs.json';

export function createSanctuary(host){
  let renderer,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,focused=false,form='shield',transition=null;
  const fallback=()=>{host.innerHTML='<div class="static-shield">安</div>';return {pause(){paused=true;},resume(){paused=false;},focus(){},async toggleForm(){form=form==='shield'?'slogan':'shield';host.innerHTML=form==='shield'?'<div class="static-shield">安</div>':'<div class="static-slogan">先核实<br>再放心</div>';return form;},dispose(){host.innerHTML='';}};};
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}catch{return fallback();}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);host.classList.add('webgl-ready');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.z=8.8;
  scene.add(new THREE.AmbientLight(0xb4d3a0,2));
  for(const [color,intensity,x,y,z] of [[0xe3ffd0,6,-3,4,5],[0x7cc654,4,3,-1,3]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);}
  const group=new THREE.Group();scene.add(group);
  const shape=new THREE.Shape();shape.moveTo(0,1.65);shape.lineTo(1.25,1.15);shape.lineTo(1.15,-.25);shape.bezierCurveTo(1,-.95,.45,-1.4,0,-1.65);shape.bezierCurveTo(-.45,-1.4,-1,-.95,-1.15,-.25);shape.lineTo(-1.25,1.15);shape.closePath();
  const shield=new THREE.Group();group.add(shield);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.1,bevelThickness:.08});
  const jade=new THREE.MeshStandardMaterial({color:0x739c46,metalness:.72,roughness:.25,transparent:true});
  shield.add(new THREE.Mesh(geometry,jade));
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),new THREE.LineBasicMaterial({color:0xc5ef91,transparent:true,opacity:.6}));shield.add(outline);
  function mask(text,w=180,h=140){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.fillStyle='#fff';const lines=text==='安'?['安']:['先核实','再放心'];const size=text==='安'?100:53;lines.forEach((line,row)=>{[...line].forEach((ch,col)=>{c.save();c.translate((w-line.length*size)/2+col*size,h/2-(lines.length-1)*size*.6+row*size*1.15+size*.36);c.scale(size/1000,-size/1000);c.fill(new Path2D(glyphs[ch]));c.restore();});});return {canvas,data:c.getImageData(0,0,w,h).data,w,h};}
  const letter=mask('安');const texture=new THREE.CanvasTexture(letter.canvas);const letterMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,color:0xe2ffc1,depthWrite:false});const letterMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.95),letterMaterial);letterMesh.position.z=.315;shield.add(letterMesh);
  const slogan=mask('slogan');const points=[];
  for(let y=0;y<slogan.h;y+=2)for(let x=0;x<slogan.w;x+=2)if(slogan.data[(y*slogan.w+x)*4+3]>128)points.push(new THREE.Vector3((x/slogan.w-.5)*3.7,(.5-y/slogan.h)*2.9,0));
  const n=innerWidth<700?2048:4096,starts=[],ends=[],offsets=[];
  const path=new Path2D();path.moveTo(0,1.65);path.lineTo(1.25,1.15);path.lineTo(1.15,-.25);path.bezierCurveTo(1,-.95,.45,-1.4,0,-1.65);path.bezierCurveTo(-.45,-1.4,-1,-.95,-1.15,-.25);path.lineTo(-1.25,1.15);path.closePath();
  const ctx=document.createElement('canvas').getContext('2d');let seed=2341;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  for(let i=0;i<n;i++){let x,y;do{x=(random()-.5)*2.5;y=(random()-.5)*3.3;}while(!ctx.isPointInPath(path,x,y));starts.push(new THREE.Vector3(x,y,random()*.2));const p=points[i%points.length];ends.push(new THREE.Vector3(p.x,p.y,(i%2)*.06));offsets.push(new THREE.Vector3((random()-.5)*4,(random()-.5)*4,(random()-.5)*3));}
  const voxels=new THREE.InstancedMesh(new THREE.BoxGeometry(.044,.044,.044),new THREE.MeshStandardMaterial({color:0xc8ef96,metalness:.4,roughness:.3}),n);voxels.visible=false;group.add(voxels);const dummy=new THREE.Object3D();
  const state={progress:0};let raf=0,time=0,last=0,yaw=0,pitch=0,dragging=false,previous;
  function updateVoxels(){const t=state.progress;for(let i=0;i<n;i++){dummy.position.copy(starts[i]).lerp(ends[i],t).addScaledVector(offsets[i],Math.sin(t*Math.PI)*.65);dummy.rotation.set(Math.sin(t*Math.PI)*i*.013,Math.sin(t*Math.PI)*i*.017,0);dummy.updateMatrix();voxels.setMatrixAt(i,dummy.matrix);}voxels.instanceMatrix.needsUpdate=true;}
  function render(){group.rotation.set(pitch+Math.sin(time*.4)*.035,yaw+Math.sin(time*.25)*.09,0);group.position.y=group.userData.y+Math.sin(time*.7)*.045;renderer.render(scene,camera);}
  function loop(now){raf=0;if(paused||focused)return;time+=Math.min((now-(last||now))/1000,.04);last=now;render();raf=requestAnimationFrame(loop);}
  function run(){if(!raf&&!paused&&!focused){last=0;raf=requestAnimationFrame(loop);}}
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const mobile=innerWidth<700;group.scale.setScalar(mobile?Math.min(.5,innerWidth/760):Math.min(.86,innerWidth/1500));const height=2*Math.tan(THREE.MathUtils.degToRad(38)/2)*camera.position.z;group.userData.y=(.5-(mobile?Math.min(340,innerHeight*.48):innerHeight*.53)/innerHeight)*height;render();}
  function settle(){if(transition)transition.complete();}
  const canvas=renderer.domElement;canvas.style.touchAction='pan-y';canvas.onpointerdown=e=>{dragging=true;previous=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=canvas.onpointercancel=()=>dragging=false;
  const move=e=>{if(!dragging||paused||focused||transition)return;yaw=THREE.MathUtils.clamp(yaw+(e.clientX-previous[0])*.005,-.5,.5);pitch=THREE.MathUtils.clamp(pitch+(e.clientY-previous[1])*.005,-.25,.25);previous=[e.clientX,e.clientY];};
  window.addEventListener('pointermove',move);window.addEventListener('resize',resize);const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else run();};document.addEventListener('visibilitychange',visibility);
  resize();run();
  return {
    pause(){settle();paused=true;cancelAnimationFrame(raf);raf=0;render();},resume(){paused=false;run();},focus(value){settle();focused=value;if(value){cancelAnimationFrame(raf);raf=0;}else run();},
    toggleForm(){if(transition)return Promise.resolve(form);const target=form==='shield'?'slogan':'shield';yaw=0;pitch=0;voxels.visible=true;updateVoxels();
      return new Promise(resolve=>{const finish=()=>{form=target;state.progress=target==='slogan'?1:0;updateVoxels();shield.visible=target==='shield';voxels.visible=target==='slogan';jade.opacity=1;letterMaterial.opacity=1;outline.material.opacity=.6;transition=null;render();resolve(form);};
        if(paused){finish();return;}
        shield.visible=true;transition=animate(state,{progress:target==='slogan'?1:0,duration:1800,ease:'inOut(3)',onUpdate:()=>{updateVoxels();const opacity=Math.max(0,1-state.progress*8);jade.opacity=opacity;letterMaterial.opacity=opacity;outline.material.opacity=opacity*.6;},onComplete:finish});});
    },dispose(){transition?.cancel();cancelAnimationFrame(raf);window.removeEventListener('pointermove',move);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});texture.dispose();renderer.dispose();canvas.remove();}
  };
}

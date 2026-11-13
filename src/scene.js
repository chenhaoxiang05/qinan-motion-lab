import * as THREE from 'three';
import { animate, createSpring } from 'animejs';

/** A local, procedural sculpture. No models, textures or remote requests. */
export function createSanctuary(host) {
  let renderer;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    // The CSS sculpture remains usable when WebGL is unavailable.
    let disabled=reduced, burst;
    return {
      pause(){disabled=true;burst?.complete();},resume(){disabled=false;},focus(){},
      burst(){if(disabled)return false;burst?.cancel();burst=animate(host.querySelector('.fallback-orb'),{scale:[1,1.2,1],duration:1500,ease:createSpring({stiffness:75,damping:13})});return true;},
      dispose(){burst?.cancel();}
    };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  host.classList.add('webgl-ready');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 8.8;
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const uniforms = {
    uTime: { value: 0 }, uScatter: { value: 0 }, uAccent: { value: new THREE.Color('#c2f378') }
  };
  const knotGeometry = new THREE.TorusKnotGeometry(1.07, .31, 256, 32, 2, 3);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uScatter; uniform vec3 uAccent;
      varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        float fresnel = pow(1. - max(dot(n, vView), 0.), 2.8);
        float light = max(dot(n, normalize(vec3(-.7, 1.1, 1.6))), 0.);
        float reflection = pow(max(dot(reflect(normalize(vec3(.7,-1.,-1.)), n), vView), 0.), 42.);
        float bands = sin((vPosition.y + vPosition.x * .28) * 38. - uTime * .8);
        float scan = pow(max(0., sin(vPosition.y * 2.3 - uTime * .45)), 22.);
        vec3 col = mix(vec3(.025,.065,.035), uAccent * .67, pow(light,.6));
        col += fresnel * uAccent * .65 + reflection * vec3(.94,1.,.78) * 1.8;
        col += smoothstep(.88,.98,bands) * uAccent * .11 + scan * uAccent * .16;
        gl_FragColor = vec4(col, (1. - uScatter * .93));
      }`,
    transparent: true
  });
  const knot = new THREE.Mesh(knotGeometry, material);
  sculpture.add(knot);
  const n = innerWidth < 700 ? 6500 : 12000;
  const source = knotGeometry.attributes.position;
  const positions = new Float32Array(n * 3), targets = new Float32Array(n * 3), seeds = new Float32Array(n);
  let seed = 19793;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  for (let i = 0; i < n; i++) {
    const index = Math.floor(random() * source.count);
    positions.set([source.getX(index)*1.015, source.getY(index)*1.015, source.getZ(index)*1.015], i*3);
    const a = random()*Math.PI*2, b = Math.acos(2*random()-1), r = 1.9+random()*.8;
    targets.set([r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a)],i*3);
    seeds[i] = random();
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
  particlesGeometry.setAttribute('aTarget', new THREE.BufferAttribute(targets,3));
  particlesGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds,1));
  const particlesMaterial = new THREE.ShaderMaterial({
    uniforms, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:`
      uniform float uTime; uniform float uScatter;
      attribute vec3 aTarget; attribute float aSeed;
      varying float vAlpha;
      void main(){
        vec3 p = mix(position, aTarget, uScatter);
        p += vec3(sin(uTime*.5+aSeed*40.),cos(uTime*.4+aSeed*50.),sin(uTime*.3+aSeed*30.)) * .035;
        vec4 mv = modelViewMatrix * vec4(p,1.);
        vAlpha = .2 + aSeed*.65;
        gl_PointSize = (1.1+aSeed*1.5) * (6. / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader:`
      uniform vec3 uAccent; varying float vAlpha;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(mix(uAccent,vec3(.9,1.,.75),.4),(1.-d*2.)*vAlpha);}`
  });
  sculpture.add(new THREE.Points(particlesGeometry,particlesMaterial));
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  for (let j=0;j<3;j++) {
    const pts=[];
    for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*(2.05+j*.26),0,Math.sin(a)*(2.05+j*.26)));}
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:j===0?0xb6d58b:0x647650,transparent:true,opacity:j===0?.3:.14}));
    line.rotation.set(.24+j*.25,.15,j*.47-.4);
    orbitGroup.add(line);
  }
  const motesGeometry=new THREE.BufferGeometry();
  const motes=new Float32Array(180*3);
  for(let i=0;i<180;i++)motes.set([(random()-.5)*14,(random()-.5)*8,(random()-.5)*5-2],i*3);
  motesGeometry.setAttribute('position',new THREE.BufferAttribute(motes,3));
  const dust=new THREE.Points(motesGeometry,new THREE.PointsMaterial({color:0xa8c47d,size:.014,transparent:true,opacity:.4,depthWrite:false}));
  scene.add(dust);
  let stopped=reduced, hidden=document.hidden, panel=false, raf=0, elapsed=0,lastTime=0;
  const rotation={x:-.32,y:.45};
  const view={x:0,y:0}, target={x:0,y:0};
  let dragging=false, previous={x:0,y:0};
  function resize(){
    const w=innerWidth,h=innerHeight;
    renderer.setSize(w,h);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    const mobile=w<700;
    const scale=mobile ? Math.min(.5,w/760) : Math.min(.86,w/1500);
    sculpture.scale.setScalar(scale);orbitGroup.scale.setScalar(scale);
    const height=2*Math.tan(THREE.MathUtils.degToRad(38)/2)*camera.position.z;
    const desiredY=mobile ? Math.min(340,h*.48) : h*.53;
    sculpture.position.y=(.5-desiredY/h)*height;
    orbitGroup.position.y=sculpture.position.y;
    renderFrame();
  }
  function renderFrame(){
    uniforms.uTime.value=elapsed;
    sculpture.rotation.set(rotation.x+view.y,rotation.y+view.x+elapsed*.075,Math.sin(elapsed*.22)*.045);
    orbitGroup.rotation.y=elapsed*.045;
    dust.rotation.y=elapsed*.008;
    renderer.render(scene,camera);
  }
  function loop(time){
    raf=0;if(stopped||hidden||panel)return;
    elapsed+=Math.min((time-(lastTime||time))/1000,.05);lastTime=time;
    view.x+=(target.x-view.x)*.035;view.y+=(target.y-view.y)*.035;
    renderFrame();raf=requestAnimationFrame(loop);
  }
  function run(){if(!stopped&&!hidden&&!panel&&!raf){lastTime=0;raf=requestAnimationFrame(loop);}}
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function onMove(e){
    if(stopped||panel)return;
    if(dragging){rotation.y+=(e.clientX-previous.x)*.007;rotation.x+=(e.clientY-previous.y)*.007;previous={x:e.clientX,y:e.clientY};}
    else{target.x=(e.clientX/innerWidth-.5)*.25;target.y=(e.clientY/innerHeight-.5)*.12;}
  }
  const canvas=renderer.domElement;
  canvas.style.touchAction='pan-y';
  canvas.addEventListener('pointerdown',e=>{if(stopped||panel)return;dragging=true;previous={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('grabbing');});
  function release(){dragging=false;canvas.classList.remove('grabbing');}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  window.addEventListener('pointermove',onMove,{passive:true});
  window.addEventListener('resize',resize);
  const onVisibility=()=>{hidden=document.hidden;hidden?stop():run();};
  document.addEventListener('visibilitychange',onVisibility);
  let burstAnimation;
  resize();run();
  return {
    pause(){stopped=true;stop();burstAnimation?.cancel();uniforms.uScatter.value=0;renderFrame();},
    resume(){stopped=false;run();},
    focus(value){panel=value;value?stop():run();},
    burst(){
      if(stopped||panel)return false;
      burstAnimation?.cancel();
      burstAnimation=animate(uniforms.uScatter,{
        value:[{to:1,duration:650,ease:'outExpo'},{to:0,duration:1700,delay:250,ease:createSpring({stiffness:65,damping:12})}],
      });
      return true;
    },
    dispose(){stop();burstAnimation?.cancel();window.removeEventListener('pointermove',onMove);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();canvas.remove();}
  };
}

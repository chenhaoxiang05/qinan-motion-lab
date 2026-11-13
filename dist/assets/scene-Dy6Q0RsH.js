import{W as ae,S as ie,a as oe,P as re,G as D,C as se,T as ce,b as J,M as le,B as Y,c as E,A as de,d as O,V as ue,L as me,e as ve,f as pe,g as fe}from"./three-CJ1faqtv.js";import{a as Q,c as $}from"./index-VBfvw-ua.js";function ye(F){let i;const _=matchMedia("(prefers-reduced-motion: reduce)").matches;try{i=new ae({alpha:!0,antialias:!0,powerPreference:"low-power"})}catch{let e=_,t;return{pause(){e=!0,t?.complete()},resume(){e=!1},focus(){},burst(){return e?!1:(t?.cancel(),t=Q(F.querySelector(".fallback-orb"),{scale:[1,1.2,1],duration:1500,ease:$({stiffness:75,damping:13})}),!0)},dispose(){t?.cancel()}}}i.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.7)),i.outputColorSpace=ie,F.append(i.domElement),F.classList.add("webgl-ready");const p=new oe,f=new re(38,1,.1,100);f.position.z=8.8;const s=new D;p.add(s);const h={uTime:{value:0},uScatter:{value:0},uAccent:{value:new se("#c2f378")}},R=new ce(1.07,.31,256,32,2,3),ee=new J({uniforms:h,vertexShader:`
      varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
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
      }`,transparent:!0}),te=new le(R,ee);s.add(te);const y=innerWidth<700?6500:12e3,g=R.attributes.position,X=new Float32Array(y*3),j=new Float32Array(y*3),N=new Float32Array(y);let G=19793;const o=()=>(G=Math.imul(G,1664525)+1013904223|0,(G>>>0)/4294967296);for(let e=0;e<y;e++){const t=Math.floor(o()*g.count);X.set([g.getX(t)*1.015,g.getY(t)*1.015,g.getZ(t)*1.015],e*3);const l=o()*Math.PI*2,n=Math.acos(2*o()-1),a=1.9+o()*.8;j.set([a*Math.sin(n)*Math.cos(l),a*Math.cos(n),a*Math.sin(n)*Math.sin(l)],e*3),N[e]=o()}const x=new Y;x.setAttribute("position",new E(X,3)),x.setAttribute("aTarget",new E(j,3)),x.setAttribute("aSeed",new E(N,1));const ne=new J({uniforms:h,transparent:!0,depthWrite:!1,blending:de,vertexShader:`
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
      }`,fragmentShader:`
      uniform vec3 uAccent; varying float vAlpha;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(mix(uAccent,vec3(.9,1.,.75),.4),(1.-d*2.)*vAlpha);}`});s.add(new O(x,ne));const w=new D;p.add(w);for(let e=0;e<3;e++){const t=[];for(let a=0;a<=180;a++){const z=a/180*Math.PI*2;t.push(new ue(Math.cos(z)*(2.05+e*.26),0,Math.sin(z)*(2.05+e*.26)))}const l=new Y().setFromPoints(t),n=new me(l,new ve({color:e===0?11982219:6583888,transparent:!0,opacity:e===0?.3:.14}));n.rotation.set(.24+e*.25,.15,e*.47-.4),w.add(n)}const k=new Y,q=new Float32Array(540);for(let e=0;e<180;e++)q.set([(o()-.5)*14,(o()-.5)*8,(o()-.5)*5-2],e*3);k.setAttribute("position",new E(q,3));const I=new O(k,new pe({color:11060349,size:.014,transparent:!0,opacity:.4,depthWrite:!1}));p.add(I);let c=_,M=document.hidden,d=!1,u=0,m=0,V=0;const b={x:-.32,y:.45},v={x:0,y:0},S={x:0,y:0};let C=!1,A={x:0,y:0};function W(){const e=innerWidth,t=innerHeight;i.setSize(e,t),f.aspect=e/t,f.updateProjectionMatrix();const l=e<700,n=l?Math.min(.5,e/760):Math.min(.86,e/1500);s.scale.setScalar(n),w.scale.setScalar(n);const a=2*Math.tan(fe.degToRad(38)/2)*f.position.z,z=l?Math.min(340,t*.48):t*.53;s.position.y=(.5-z/t)*a,w.position.y=s.position.y,B()}function B(){h.uTime.value=m,s.rotation.set(b.x+v.y,b.y+v.x+m*.075,Math.sin(m*.22)*.045),w.rotation.y=m*.045,I.rotation.y=m*.008,i.render(p,f)}function H(e){u=0,!(c||M||d)&&(m+=Math.min((e-(V||e))/1e3,.05),V=e,v.x+=(S.x-v.x)*.035,v.y+=(S.y-v.y)*.035,B(),u=requestAnimationFrame(H))}function P(){!c&&!M&&!d&&!u&&(V=0,u=requestAnimationFrame(H))}function L(){cancelAnimationFrame(u),u=0}function K(e){c||d||(C?(b.y+=(e.clientX-A.x)*.007,b.x+=(e.clientY-A.y)*.007,A={x:e.clientX,y:e.clientY}):(S.x=(e.clientX/innerWidth-.5)*.25,S.y=(e.clientY/innerHeight-.5)*.12))}const r=i.domElement;r.style.touchAction="pan-y",r.addEventListener("pointerdown",e=>{c||d||(C=!0,A={x:e.clientX,y:e.clientY},r.setPointerCapture(e.pointerId),r.classList.add("grabbing"))});function U(){C=!1,r.classList.remove("grabbing")}r.addEventListener("pointerup",U),r.addEventListener("pointercancel",U),window.addEventListener("pointermove",K,{passive:!0}),window.addEventListener("resize",W);const Z=()=>{M=document.hidden,M?L():P()};document.addEventListener("visibilitychange",Z);let T;return W(),P(),{pause(){c=!0,L(),T?.cancel(),h.uScatter.value=0,B()},resume(){c=!1,P()},focus(e){d=e,e?L():P()},burst(){return c||d?!1:(T?.cancel(),T=Q(h.uScatter,{value:[{to:1,duration:650,ease:"outExpo"},{to:0,duration:1700,delay:250,ease:$({stiffness:65,damping:12})}]}),!0)},dispose(){L(),T?.cancel(),window.removeEventListener("pointermove",K),window.removeEventListener("resize",W),document.removeEventListener("visibilitychange",Z),p.traverse(e=>{e.geometry?.dispose(),e.material&&e.material.dispose()}),i.dispose(),r.remove()}}}export{ye as createSanctuary};

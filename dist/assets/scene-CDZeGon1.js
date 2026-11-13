import{S as Ye,E as Ie,P as le,a as st,C as lt,b as Qe,W as ct,A as ut,c as He,d as mt,G as Be,H as dt,D as Ne,M as xe,e as B,f as Le,g as ft,V as pt,h as F,i as ht,j as Ue,k as vt,l as gt,m as et}from"./three-Dmch0kjp.js";import{a as xt}from"./index-CslsHgvf.js";const ue={安:"M75 760V523H197V649H801V523H930V760H561V850H433V760ZM54 477V364H269C226 283 183 206 147 147L274 113L292 146C334 132 378 116 421 100C331 57 216 33 76 19C99 -7 133 -61 144 -90C313 -65 450 -26 556 45C658 0 750 -47 811 -88L907 10C844 49 754 92 657 132C711 193 752 269 781 364H947V477H465L524 599L397 625C376 579 352 528 327 477ZM408 364H642C621 287 586 226 536 178C471 203 405 224 345 242Z",先:"M440 850V714H311C322 747 332 780 340 811L218 835C197 733 149 597 84 515C113 504 162 480 190 461C219 499 245 547 268 599H440V436H55V320H292C276 188 239 75 39 11C66 -14 100 -63 114 -95C345 -7 397 142 418 320H564V76C564 -37 591 -74 704 -74C726 -74 797 -74 820 -74C913 -74 945 -31 957 128C925 137 872 156 848 176C844 57 839 39 809 39C791 39 735 39 721 39C690 39 685 44 685 77V320H948V436H562V599H869V714H562V850Z",核:"M783 550C750 490 706 433 654 383C636 399 615 417 593 434C633 481 679 541 722 597H965V705H738V844H620V705H391V597H578C559 562 536 525 513 493L468 524L399 442C452 404 517 353 564 308C507 267 445 232 380 205C407 182 439 145 454 118C634 204 790 337 888 508ZM859 354C761 184 573 70 354 9C381 -18 410 -60 425 -90C540 -52 644 -3 735 61C791 8 850 -52 881 -92L978 -18C944 24 880 82 823 132C879 183 928 242 968 308ZM172 850V643H45V532H164C136 412 81 275 21 195C39 166 66 119 76 87C112 137 145 208 172 286V-89H283V332C307 287 330 239 343 207L408 296C391 326 310 447 283 482V532H385V643H283V850Z",实:"M530 66C658 28 789 -33 866 -85L939 10C858 59 716 118 586 155ZM232 545C284 515 348 467 376 434L451 520C419 554 354 597 302 623ZM130 395C183 366 249 321 279 287L351 377C318 409 251 451 198 475ZM77 756V526H196V644H801V526H927V756H588C573 790 551 830 531 862L410 825C422 804 434 780 445 756ZM68 274V174H392C334 103 238 51 76 15C101 -11 131 -57 143 -88C364 -34 478 53 539 174H938V274H575C600 367 606 476 610 601H483C479 470 476 362 446 274Z",再:"M145 619V251H30V140H145V-91H263V140H736V42C736 25 730 20 711 20C694 20 629 19 574 22C591 -8 609 -59 616 -91C700 -91 760 -90 801 -71C842 -53 856 -20 856 40V140H970V251H856V619H556V685H930V796H71V685H436V619ZM736 251H556V332H736ZM263 251V332H436V251ZM736 434H556V511H736ZM263 434V511H436V434Z",放:"M588 850C565 688 521 533 448 430V440C449 454 449 488 449 488H251V586H482V697H316V850H197V697H39V586H137V392C137 263 123 118 15 -6C44 -26 83 -59 103 -85C227 52 250 219 251 379H335C331 142 325 56 311 35C303 23 295 19 282 20C266 20 238 20 206 23C223 -7 234 -54 237 -86C279 -87 319 -87 344 -82C373 -76 393 -67 412 -38C437 -4 442 106 447 391C476 371 513 341 529 324C544 344 558 365 571 389C592 315 616 247 647 186C594 112 523 55 430 13C451 -12 486 -66 496 -92C585 -47 656 9 712 78C762 11 823 -44 900 -84C918 -52 955 -5 983 19C901 57 835 114 784 186C839 288 874 410 897 557H972V668H678C692 721 703 776 712 832ZM645 557H778C764 463 744 381 715 310C683 382 660 462 643 549Z",心:"M298 563V86C298 -40 333 -80 462 -80C487 -80 597 -80 624 -80C745 -80 778 -20 791 167C758 176 707 197 679 219C672 62 664 30 615 30C589 30 499 30 478 30C430 30 423 37 423 86V563ZM301 753C420 708 559 629 636 566L715 671C636 730 497 804 379 846ZM118 492C105 358 76 228 16 142L128 77C194 176 220 329 235 468ZM693 477C774 366 844 212 864 110L985 170C961 275 889 421 803 531Z"};function yt(a){const e=ue[a]?.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);if(!e)throw new Error(`Missing local glyph: ${a}`);const t=new st;let s=0,i="",n=0,o=0,r=0,c=0;const u=()=>Number(e[s++]);for(;s<e.length;)switch(/^[A-Za-z]$/.test(e[s])&&(i=e[s++]),i){case"M":n=u(),o=u(),t.moveTo(n,o),r=n,c=o,i="L";break;case"L":n=u(),o=u(),t.lineTo(n,o);break;case"H":n=u(),t.lineTo(n,o);break;case"V":o=u(),t.lineTo(n,o);break;case"C":{const f=u(),x=u(),m=u(),g=u();n=u(),o=u(),t.bezierCurveTo(f,x,m,g,n,o);break}case"Z":t.currentPath.closePath(),n=r,o=c,i="";break;default:throw new Error(`Unsupported glyph command: ${i}`)}return t.toShapes(!0)}const M=Object.freeze({coreWidth:2.02,coreHeight:3.04,coreDepth:.1,openCoreScale:.66,openCoreY:1,rowYs:Object.freeze([-.48,-1.2]),glyphHeight:.58,sloganWidth:2.14}),$=Object.freeze({width:3.7,height:4.3,depth:.5}),Xe=.051,wt=.053,bt=Object.freeze(["M497 832L497 785","M136 704L136 550","M136 704L865 704L865 550","M460 595C400 460 310 285 230 170L840 -10","M720 420C680 210 535 35 130 -30","M100 420L900 420"]),tt=a=>Math.max(0,Math.min(1,a)),Ct=a=>{const e=tt(a);return e*e*(3-2*e)},K=(a,e,t)=>Ct((a-e)/(t-e)),se=(a,e,t)=>t<=0?a:t>=1?e:a+(e-a)*t;function Mt(){const e=M.coreWidth/2-.015,t=M.coreHeight/2-.015,s=new Ye;s.moveTo(-e,-t),s.lineTo(e,-t),s.lineTo(e,t),s.lineTo(-e,t),s.closePath();const i=new Ie(s,{depth:.07,bevelEnabled:!0,bevelThickness:.015,bevelSize:.015,bevelSegments:1,curveSegments:1,steps:1});i.translate(0,0,-.035);const n=new le(M.coreWidth-.015*2,M.coreHeight-.015*2);n.translate(0,0,Xe);const o=n.clone();o.translate(0,0,wt-Xe);const r=new le(M.sloganWidth,M.glyphHeight),c=new Ye;c.moveTo(0,0),c.lineTo(.32,0),c.lineTo(.32,-.026),c.lineTo(.026,-.026),c.lineTo(.026,-.38),c.lineTo(0,-.38),c.closePath();const u=new Ie(c,{depth:.045,bevelEnabled:!1,curveSegments:1,steps:1});u.translate(0,0,-.0225);const f={coreBodyGeometry:i,coreFaceGeometry:n,traceGeometry:o,sloganGeometry:r,cornerGeometry:u};for(const x of Object.values(f))x.computeBoundingBox(),x.computeBoundingSphere();return f}function Pt(a){const e=Number.isFinite(a)?tt(a):0,t=K(e,.12,.48),s=Math.sin(Math.PI*K(e,.12,.68)),i=.065*K(e,0,.12)*(1-K(e,.48,.68)),n=se(1.14,1.62,t)+i,o=se(1.64,2.1,t)+i*(1-t),r=se(1.64,1.85,t)+i*(1-t),c=[{position:[-n,o,.035*t+.14*s],rotationZ:.045*s},{position:[n,o,-.035*t-.14*s],rotationZ:-Math.PI/2-.045*s},{position:[n,-r,.035*t+.14*s],rotationZ:Math.PI+.045*s},{position:[-n,-r,-.035*t-.14*s],rotationZ:Math.PI/2-.045*s}],u=M.rowYs.map((x,m)=>{const g=K(e,m?.66:.6,m?1:.88);return{position:[0,x-.08*(1-g),.04],opacity:g}}),f=.32+600/1350;return{progress:e,core:{position:[0,M.openCoreY*t,0],scale:se(1,M.openCoreScale,t)},corners:c,lines:u,traceProgress:e>.32&&e<f?(e-.32)/(f-.32):null}}const ce="#e9eadd",nt="#11150f",Ht="#c2ff00",at=["先核实","再放心"],ye=new Map;function Lt(a){if(!ye.has(a)){const e=yt(a).flatMap(i=>i.getPoints(12)),t=e.map(i=>i.x),s=e.map(i=>i.y);ye.set(a,{minX:Math.min(...t),maxX:Math.max(...t),minY:Math.min(...s),maxY:Math.max(...s)})}return ye.get(a)}function Se(a,e,t,s,i){const n=Lt(a),o=Math.min(s/(n.maxX-n.minX),i/(n.maxY-n.minY));return{scale:o,x:e-(n.minX+n.maxX)*o/2,y:t+(n.minY+n.maxY)*o/2}}function je(a,e,t,s,i,n){const{scale:o,x:r,y:c}=Se(a,e,t,s,i);return`<path d="${ue[a]}" transform="translate(${r} ${c}) scale(${o} ${-o})" fill="${n}"/>`}function ot(a){const e=a.canvas.ownerDocument?.defaultView?.Path2D||globalThis.Path2D;if(typeof e!="function")throw new Error("Local seal artwork requires Path2D.");return e}function _e(a,e,t,s,i,n,o){const{scale:r,x:c,y:u}=Se(e,t,s,i,n),f=ot(a);a.save(),a.translate(c,u),a.scale(r,-r),a.fillStyle=o,a.fill(new f(ue[e])),a.restore()}function kt(a){const e=a.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);let t=0,s="",i=0,n=0;const o=[],r=()=>Number(e[t++]);for(;t<e.length;)if(/^[A-Za-z]$/.test(e[t])&&(s=e[t++]),s==="M"||s==="L")i=r(),n=r(),o.push({x:i,y:n}),s="L";else if(s==="C"){const u=i,f=n,x=r(),m=r(),g=r(),v=r();i=r(),n=r();for(let p=1;p<=48;p++){const w=p/48,b=1-w;o.push({x:b**3*u+3*b*b*w*x+3*b*w*w*g+w**3*i,y:b**3*f+3*b*b*w*m+3*b*w*w*v+w**3*n})}}else throw new Error(`Unsupported seal guide command: ${s}`);let c=0;return o.forEach((u,f)=>{f&&(c+=Math.hypot(u.x-o[f-1].x,u.y-o[f-1].y)),u.distance=c}),{points:o,length:c}}const we=bt.map(kt);function Ke(a,e){const t=Math.max(0,Math.min(a.length,e));for(let s=1;s<a.points.length;s++){const i=a.points[s],n=a.points[s-1];if(t<=i.distance){const o=(t-n.distance)/(i.distance-n.distance||1);return{x:n.x+(i.x-n.x)*o,y:n.y+(i.y-n.y)*o}}}return a.points.at(-1)}function Je(a,e,t,s){const i=Math.max(0,t-s),n=Ke(e,i),o=Ke(e,t);a.beginPath(),a.moveTo(n.x,n.y);for(const r of e.points)r.distance>i&&r.distance<t&&a.lineTo(r.x,r.y);a.lineTo(o.x,o.y),a.stroke()}function be(a,e){const t=document.createElement("canvas");t.width=Math.ceil(a),t.height=Math.ceil(e);const s=t.getContext("2d");if(!s)throw new Error("Local seal artwork requires a 2D canvas.");return{canvas:t,context:s}}function Ce(a){const e=new lt(a);return e.colorSpace=Qe,e.anisotropy=2,e}function St({mobile:a=!1}={}){const e=a?256:384,t=M.coreWidth*e,s=M.coreHeight*e,{canvas:i,context:n}=be(t,s),{canvas:o,context:r}=be(i.width,i.height);n.fillStyle=ce,n.fillRect(0,0,i.width,i.height);const c=e*1.54,u=e*1.74;_e(n,"安",i.width/2,i.height/2,c,u,nt),n.fillStyle="#a4ae92";for(let y=0;y<7;y++)n.fillRect(e*.17+y*e*.036,e*.16,e*(y%3===0?.014:.006),e*.1);n.fillRect(e*1.64,e*2.72,e*.19,e*.025),n.fillRect(e*1.805,e*2.57,e*.025,e*.175);const f=at.map(y=>{const{canvas:k,context:Z}=be(M.sloganWidth*e,M.glyphHeight*e),S=k.width/3;return[...y].forEach((D,q)=>_e(Z,D,(q+.5)*S,k.height/2,Math.min(S*.88,k.height*.98),k.height*.98,ce)),k}),x=ot(r),m=new x(ue.安),g=Se("安",o.width/2,o.height/2,c,u),v=Ce(i),p=Ce(o),w=f.map(Ce);let b=null,C=!1;function E(){return C||b===null?!1:(r.clearRect(0,0,o.width,o.height),b=null,p.needsUpdate=!0,!0)}function V(y){if(C)return!1;if(!Number.isFinite(y)||y<=0||y>=1)return E();if(y===b)return!1;r.clearRect(0,0,o.width,o.height);const k=y*we.length,Z=Math.min(we.length-1,Math.floor(k)),S=we[Z],D=k-Z,q=S.length*D;return r.save(),r.translate(g.x,g.y),r.scale(g.scale,-g.scale),r.clip(m),r.lineCap="round",r.lineJoin="round",r.strokeStyle="rgba(194,255,0,.16)",r.lineWidth=48,Je(r,S,q,145),r.strokeStyle="rgba(211,255,94,.60)",r.lineWidth=20,Je(r,S,q,68),r.restore(),b=y,p.needsUpdate=!0,!0}return{frontTexture:v,sloganTextures:w,traceTexture:p,updateTrace:V,clearTrace:E,dispose(){C||(C=!0,[v,...w,p].forEach(y=>y.dispose()))}}}function Tt(a="shield"){const e=a==="slogan",t=e?M.openCoreScale:1,s=e?-M.openCoreY:0,i=M.coreWidth,n=M.coreHeight,o=e?1.62:1.14,r=e?2.1:1.64,c=e?1.85:1.64,u=`<g data-seal-core="intact" transform="translate(0 ${s}) scale(${t})"><rect x="${-i/2}" y="${-n/2}" width="${i}" height="${n}" rx=".025" fill="${ce}" stroke="#7f8971" stroke-width=".012"/>${je("安",0,0,1.54,1.74,nt)}<path d="M-.84 -1.31h.21m.035 0h.08M.65 1.2h.17v-.17" fill="none" stroke="#a4ae92" stroke-width=".018"/></g>`,f=`<path data-seal-frame="four-corners" d="M${-o} ${-r+.3}V${-r}H${-o+.3} M${o-.3} ${-r}H${o}V${-r+.3} M${-o} ${c-.3}V${c}H${-o+.3} M${o-.3} ${c}H${o}V${c-.3}" fill="none" stroke="${Ht}" stroke-width=".024"/>`,x=e?at.map((m,g)=>{const v=M.sloganWidth/3,p=Math.min(v*.88,M.glyphHeight*.98);return`<g data-slogan-line="${g}">${[...m].map((w,b)=>je(w,(b-1)*v,-M.rowYs[g],p,M.glyphHeight*.98,ce)).join("")}</g>`}).join(""):"";return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-$.width/2} ${-$.height/2} ${$.width} ${$.height}" style="width:100%;height:auto;display:block;stroke:none" aria-hidden="true">${u}${f}${x}</svg>`}function At({animate:a,onUpdate:e=()=>{},immediate:t=()=>!1,duration:s=()=>1350}={}){const i={progress:0};let n="shield",o=null,r=null,c=null,u=null,f=!1;function x(){if(!o)return;n=o,i.progress=n==="slogan"?1:0,o=null,r=null;const g=u;c=null,u=null,e(i.progress),g?.(n)}function m(){r?.cancel?.(),x()}return{get progress(){return i.progress},get form(){return n},get busy(){return c!==null},toggle(){if(f)return Promise.resolve(n);if(c)return c;o=n==="shield"?"slogan":"shield";const g=new Promise(v=>{u=v});if(c=g,t())x();else try{const v=a(i,{progress:o==="slogan"?1:0,duration:s(),ease:"linear",onUpdate:()=>{!f&&c===g&&e(i.progress)},onComplete:()=>{c===g&&x()}});c===g?r=v:v?.cancel?.()}catch{x()}return g},settle:m,dispose(){f||(m(),f=!0)}}}const Et=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,Vt=`
  uniform vec2 uResolution;
  uniform vec2 uFocus;
  uniform vec2 uPointer;
  uniform vec2 uFieldSize;
  uniform vec2 uPulseOrigin;
  uniform vec2 uCenter;
  uniform vec4 uTitleRect;
  uniform vec2 uPortalAnchors[4];
  uniform float uPointerActivity;
  uniform float uTime;
  uniform float uAmbientTime;
  uniform float uPulseAge;
  uniform float uDim;
  uniform float uEntranceProgress;
  uniform float uActivePortal;
  uniform float uPortalAge;
  uniform float uMobile;
  varying vec2 vUv;

  float rule(float distance) {
    return 1. - smoothstep(.35, 1.05, distance);
  }
  float segment(vec2 p, vec2 a, vec2 b) {
    vec2 axis = b-a;
    float t = clamp(dot(p-a,axis)/max(dot(axis,axis),.001),0.,1.);
    return rule(length(p-a-t*axis));
  }
  float rectangle(vec2 p, vec2 halfSize) {
    return step(abs(p.x),halfSize.x)*step(abs(p.y),halfSize.y);
  }
  float titleClearance(vec2 p) {
    vec2 center = uTitleRect.xy+uTitleRect.zw*.5;
    float present = step(1.,uTitleRect.z)*step(1.,uTitleRect.w);
    return 1.-rectangle(p-center,uTitleRect.zw*.5+vec2(18.,14.))*present;
  }
  float cornerMark(vec2 p, vec2 c, vec2 direction, float length) {
    return max(segment(p,c,c+vec2(direction.x*length,0.)),
               segment(p,c,c+vec2(0.,direction.y*length)));
  }
  float hash(vec2 p) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
  }
  // Automatic packets take turns on the real portal paths. A focused portal
  // replaces the automatic route; its held clock resumes when focus leaves.
  vec2 connection(vec2 p, vec2 start, vec2 end, float id, float entrance) {
    float valid = step(0.,end.x)*step(0.,end.y)*step(end.x,uResolution.x)*step(end.y,uResolution.y);
    vec2 elbow = vec2(end.x,start.y);
    float first = length(elbow-start), second = length(end-elbow);
    float total = max(1.,first+second);
    float reach = clamp((entrance-.40)/.55,0.,1.);
    float revealed = total*reach;
    vec2 partialFirst = mix(start,elbow,clamp(revealed/max(1.,first),0.,1.));
    vec2 partialSecond = mix(elbow,end,clamp((revealed-first)/max(1.,second),0.,1.));
    float line = segment(p,start,partialFirst);
    line = max(line,segment(p,elbow,partialSecond)*step(first,revealed));
    line *= smoothstep(.40,.95,entrance);
    float interacting = step(-.5,uActivePortal);
    float autoId = mod(floor(uAmbientTime/2.4),4.);
    float selected = mix(autoId,uActivePortal,interacting);
    float active = 1.-step(.1,abs(selected-id));
    float localTime = mix(mod(uAmbientTime,2.4),uPortalAge,interacting);
    float travelTime = mix(2.1,.72,interacting);
    float age = clamp(localTime/travelTime,0.,1.);
    float distance = age*total;
    vec2 head = distance<first ? mix(start,elbow,distance/max(1.,first))
                              : mix(elbow,end,(distance-first)/max(1.,second));
    float tailDistance = max(0.,distance-24.);
    vec2 tail = tailDistance<first ? mix(start,elbow,tailDistance/max(1.,first))
                                  : mix(elbow,end,(tailDistance-first)/max(1.,second));
    // Draw separate segments across the elbow, never a diagonal shortcut.
    float packet = 0.;
    if (tailDistance<first && distance>first) packet = max(segment(p,tail,elbow),segment(p,elbow,head));
    else packet = segment(p,tail,head);
    packet *= active*step(0.,localTime)*(1.-step(travelTime,localTime))*step(.99,entrance);
    return vec2(line*(.018+active*interacting*.065),packet*mix(.24,.62,interacting))*valid;
  }

  void main() {
    vec2 pixel = vUv*uResolution;
    vec2 center = uCenter*uResolution;
    float desktop = 1.-step(.5,uMobile);
    float entrance = clamp(uEntranceProgress,0.,1.);
    float reveal = smoothstep(0.,.68,entrance);
    vec2 focus = clamp(uFocus,vec2(-1.),vec2(1.));
    vec2 far = pixel-center-focus*5.*desktop;
    vec2 q = pixel-center-focus*9.*desktop;
    vec2 extent = max(uFieldSize,vec2(80.));
    float clear = titleClearance(pixel);

    // Three deliberately flat, architectural colour areas. Their scale comes
    // from the real central object rather than a screen-filling neon gradient.
    vec2 mainSize = extent*vec2(1.42,1.45);
    float mainPanel = rectangle(far-vec2(18.,-14.),mainSize);
    mainPanel *= step(-mainSize.x*1.08,far.x+far.y*.63)*step(far.x+far.y*.63,mainSize.x*1.16);
    vec2 upperPosition = center+vec2(extent.x*.65,extent.y*.93);
    vec2 upper = pixel-upperPosition-focus*5.*desktop;
    float upperPanel = rectangle(upper,vec2(max(92.,uResolution.x*.25),extent.y*.32));
    upperPanel *= step(-extent.x*.38,upper.x+upper.y*.85)*desktop;
    vec2 lower = far-vec2(extent.x*.72,-extent.y*1.31);
    float lowerPanel = rectangle(lower,vec2(extent.x*1.28,extent.y*.40));
    lowerPanel *= step(lower.x+lower.y*.82,extent.x*1.31)*desktop;
    vec3 color = vec3(.00243,.00273,.00243);
    // The architecture is present under the boot reveal. Only the fine marks
    // wait for the home entrance, so a prepared home never becomes blank black.
    color = mix(color,vec3(.00518,.00750,.00402),mainPanel);
    color = mix(color,vec3(.00972,.01444,.00699),upperPanel*.78);
    color = mix(color,vec3(.00478,.00605,.00439),lowerPanel);

    // A single cropped 24px lattice and its seams establish a print-like field.
    float gridOffset = mod(uTime/18.*24.,24.);
    vec2 cell = abs(mod(far+vec2(12.,12.-gridOffset),24.)-12.);
    float lattice = max(rule(cell.x),rule(cell.y));
    float gridArea = mainPanel*step(extent.x*.43,far.x)*step(far.y,extent.y*.86);
    float grid = lattice*gridArea*.014;
    float mainSeam = rule(abs(far.x+far.y*.63-mainSize.x*1.16)/1.18)*mainPanel;
    float lowerSeam = segment(far,vec2(-extent.x*.25,-extent.y*1.1),vec2(extent.x*1.6,-extent.y*1.1))*desktop;

    // Broken frames have open sides and a limited, fixed number of marks.
    vec2 frame = extent*vec2(1.04,1.03);
    float drawn = smoothstep(.12,.85,entrance);
    float length = mix(0.,34.,drawn);
    float frameLines = cornerMark(q,vec2(-frame.x,frame.y),vec2(1.,-1.),length);
    frameLines = max(frameLines,cornerMark(q,vec2(frame.x,frame.y),vec2(-1.,-1.),length));
    frameLines = max(frameLines,cornerMark(q,vec2(-frame.x,-frame.y),vec2(1.,1.),length));
    frameLines = max(frameLines,cornerMark(q,vec2(frame.x,-frame.y),vec2(-1.,1.),length));
    float secondFrame = segment(q,vec2(-frame.x-12.,-frame.y*.70),vec2(-frame.x-12.,frame.y*.19));
    secondFrame = max(secondFrame,segment(q,vec2(-frame.x-12.,-frame.y*.70),vec2(-frame.x*.55,-frame.y*.70)));
    secondFrame = max(secondFrame,segment(q,vec2(frame.x*.58,frame.y+12.),vec2(frame.x+12.,frame.y+12.)));
    secondFrame = max(secondFrame,segment(q,vec2(frame.x+12.,frame.y*.38),vec2(frame.x+12.,frame.y+12.)));
    secondFrame *= desktop*drawn;
    float marks = 0.;
    if (desktop>.5) {
    for (int i=0;i<12;i++) {
      float yy = mix(-frame.y*.65,frame.y*.65,float(i)/11.);
      float tickLength = mod(float(i),3.)<.5 ? 9. : 4.;
      marks = max(marks,segment(q,vec2(frame.x+24.,yy),vec2(frame.x+24.+tickLength,yy)));
      float xx = mix(-frame.x*.62,frame.x*.62,float(i)/11.);
      marks = max(marks,segment(q,vec2(xx,-frame.y-20.),vec2(xx,-frame.y-20.-tickLength)));
    }
    }
    marks *= drawn;

    // The headline is a protected area for all fine geometry and motion.
    color += vec3(.70,.76,.66)*(grid+mainSeam*.013+lowerSeam*.014)*clear*reveal;
    color += vec3(.55,.65,.42)*(frameLines*.040+secondFrame*.020+marks*.030)*clear*drawn;
    vec2 layerCenter = center+focus*9.*desktop;
    vec2 routes = vec2(0.);
    if (desktop>.5) {
    routes = connection(pixel,layerCenter+vec2(-frame.x,-frame.y*.30),uPortalAnchors[0],0.,entrance);
    routes += connection(pixel,layerCenter+vec2(frame.x,frame.y*.34),uPortalAnchors[1],1.,entrance);
    routes += connection(pixel,layerCenter+vec2(-frame.x,-frame.y*.68),uPortalAnchors[2],2.,entrance);
    routes += connection(pixel,layerCenter+vec2(frame.x,-frame.y*.46),uPortalAnchors[3],3.,entrance);
    }
    color += vec3(.539,1.,0.)*(routes.x+routes.y)*clear;

    // A bone-coloured calibration band briefly activates the moving lattice.
    // It stays inside that cropped area and never becomes a full-screen wipe.
    float scan = 0.;
    if (desktop>.5) {
      float cycle = mod(uTime,6.);
      float scanActive = (1.-step(1.4,cycle))*step(.99,entrance);
      float scanY = mix(extent.y*.86+18.,-mainSize.y-18.,clamp(cycle/1.4,0.,1.));
      float band = (1.-smoothstep(7.,9.,abs(far.y-scanY)))*gridArea;
      scan = band*lattice*scanActive;
    }
    float pointerLevel = clamp(uPointerActivity,0.,1.)*desktop;
    vec2 snapped = floor((uPointer*uResolution-layerCenter)/24.)*24.;
    float cursor = max(segment(q,snapped-vec2(5.,0.),snapped+vec2(5.,0.)),
                       segment(q,snapped-vec2(0.,5.),snapped+vec2(0.,5.)));
    cursor *= rectangle(q,frame)*pointerLevel;
    vec2 pulseDelta = (vUv-uPulseOrigin)*uResolution;
    float pulseRadius = max(0.,uPulseAge)*210.;
    float pulse = rule(abs(max(abs(pulseDelta.x),abs(pulseDelta.y))-pulseRadius));
    pulse *= step(0.,uPulseAge)*(1.-smoothstep(.15,1.10,uPulseAge))*rectangle(q,frame);
    color += vec3(.70,.76,.66)*(scan*.075+cursor*.07+pulse*.024)*clear;

    // Cobalt is a small registration tab, not a luminous atmosphere.
    float cobaltCycle = mod(uTime,6.4);
    float cobaltProgress = cobaltCycle<2.6 ? smoothstep(0.,2.6,cobaltCycle)
                                         : 1.-smoothstep(3.8,6.4,cobaltCycle);
    float cobalt = rectangle(q-vec2(-frame.x+9.+64.*cobaltProgress,frame.y+12.),vec2(9.,2.5));
    color = mix(color,vec3(.004,.033,.62),cobalt*clear*drawn*.72);
    float dust = (hash(floor(pixel))-0.5)*.00020;
    color = max(vec3(0.),color+vec3(dust));
    color *= mix(1.,.32,clamp(uDim,0.,1.));
    gl_FragColor = vec4(color,1.);
    #include <colorspace_fragment>
  }
`,A=et.clamp,j=()=>window.innerWidth<700,Me=["check","contacts","practice","history"];function ke(){const a=Math.max(1,window.innerWidth),e=Math.max(1,window.innerHeight),t=document.querySelector("#sculptureAnchor")?.getBoundingClientRect();return t?.width>0&&t?.height>0?{x:t.left+t.width/2,y:t.top+t.height/2,size:Math.max(80,Math.min(t.width*.84,t.height*.88))}:{x:a/2,y:j()?Math.min(340,e*.48):e*.53,size:j()?Math.min(218,a*.56,e*.3):Math.min(326,e*.39,a*.23)}}function rt(a){const e=typeof ResizeObserver<"u"?new ResizeObserver(a):null;return document.querySelectorAll("#sculptureAnchor, .intro-copy, .portal-node").forEach(t=>e?.observe(t)),window.addEventListener("scroll",a,{passive:!0}),()=>{e?.disconnect(),window.removeEventListener("scroll",a)}}function Pe(a,e="shield"){let t=e,s=!1,i=!1,n=!1,o=1;const r=document.createElement("div");r.className="scene-fallback",r.style.cssText="position:absolute;inset:0;pointer-events:none";const c=document.createElement("div");c.style.cssText="position:absolute;filter:drop-shadow(0 15px 17px #0005);transform-origin:center",r.append(c);function u(){if(n)return;const m=ke();c.style.left=`${m.x}px`,c.style.top=`${m.y}px`,c.style.width=`${m.size*$.width/Math.max($.width,$.height)}px`,c.style.transform=`translate(-50%,-50%) scale(${.9+o*.1})`,c.style.visibility=o>0?"visible":"hidden",c.style.opacity=String(o),document.documentElement.classList.toggle("scene-ambient-paused",s||i||document.hidden||o<.99)}function f(){c.className=t==="shield"?"scene-fallback-shield":"scene-fallback-slogan",c.innerHTML=Tt(t),u()}a.append(r),a.classList.add("webgl-ready"),document.documentElement.dataset.sceneRenderer="fallback",document.addEventListener("visibilitychange",u),window.addEventListener("resize",u);const x=rt(u);return f(),{pause(){s=!0,u()},resume(){s=!1,u()},focus(m){i=!!m,r.style.opacity=i?".36":"1",u()},setEntranceProgress(m){o=A(Number.isFinite(m)?m:1,0,1),u()},setPortalFocus(){},pointerPulse(){},async toggleForm(){return n||(t=t==="shield"?"slogan":"shield",f()),t},dispose(){n||(n=!0,x(),document.removeEventListener("visibilitychange",u),window.removeEventListener("resize",u),r.remove(),a.classList.remove("webgl-ready"),delete document.documentElement.dataset.sceneRenderer,document.documentElement.classList.remove("scene-ambient-paused"))}}}function $t(a){const e=new He;e.background=new Ue(3159338);for(const[s,i,n,o,r,c]of[[-3,3,4,3,4,2.5],[3,1,2,1,4,1.3],[0,-3,3,4,.5,.6]]){const u=new Le({color:new Ue(15987684).multiplyScalar(c),side:vt}),f=new B(new le(o,r),u);f.position.set(s,i,n),f.lookAt(0,0,0),e.add(f)}const t=new gt(a);try{return t.fromScene(e,.08,.1,30)}finally{e.traverse(s=>{s.geometry?.dispose(),s.material?.dispose()}),t.dispose()}}function Ft(a){let e;try{e=new ct({alpha:!1,antialias:!0,powerPreference:"high-performance"})}catch{return Pe(a)}const t=e.domElement;t.setAttribute("aria-hidden","true"),t.style.touchAction="pan-y",a.append(t),e.outputColorSpace=Qe,e.toneMapping=ut,e.toneMappingExposure=1,e.autoClear=!1;const s=new Set,i=l=>(s.add(l),l),n=new He,o=new mt(38,1,.1,30);o.position.z=8.8;const r=new Be;n.add(r);const c=new Be,u=[],f=[];r.add(c);let x,m,g,v,p,w,b,C=!1,E=0,V=0,y=0,k=0,Z=0,S=0,D=-100,q=-100,J=null,me=-1/0,L=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,H=!1,R=1,Te=0,Ae=1,Q=0,ee=0,de=!1,W=null,N=null,te=null,fe=0,Ee=()=>{};const Ve=new F(.5,.5),$e=new F,ne=new F;function ae(){cancelAnimationFrame(E),E=0,S=0}function pe(){ae(),cancelAnimationFrame(V),V=0,s.forEach(l=>l.dispose()),s.clear(),r.clear(),n.clear(),x?.clear(),u.length=0,f.length=0,e.dispose(),t.remove(),a.classList.remove("webgl-ready"),delete document.documentElement.dataset.sceneRenderer,document.documentElement.classList.remove("scene-ambient-paused")}try{const l=i($t(e));n.environment=l.texture,n.environmentIntensity=.65,n.add(new dt(16053737,1514514,1.15));const d=new Ne(16776688,2.1);d.position.set(-3,4,5),n.add(d);const h=new Ne(14477256,.7);h.position.set(4,-.5,3),n.add(h);const P=Mt();Object.values(P).forEach(i),w=i(St({mobile:j()}));const O=i(new xe({color:3620399,metalness:.55,roughness:.56})),ge=i(new xe({color:16777215,map:w.frontTexture,metalness:.05,roughness:.66})),re=i(new xe({color:12779264,metalness:.1,roughness:.6,emissive:1581056,emissiveIntensity:.3}));b=new B(P.traceGeometry,i(new Le({map:w.traceTexture,transparent:!0,depthWrite:!1,toneMapped:!1}))),b.visible=!1,c.add(new B(P.coreBodyGeometry,O),new B(P.coreFaceGeometry,ge),b),w.sloganTextures.forEach(Y=>{const I=i(new Le({map:Y,transparent:!0,opacity:0,depthWrite:!1,toneMapped:!1})),X=new B(P.sloganGeometry,I);X.visible=!1,r.add(X),f.push(X)});for(let Y=0;Y<4;Y++){const I=new B(P.cornerGeometry,re);r.add(I),u.push(I)}const T=i(new le(2,2));g=new ft,m={uResolution:{value:new F},uPointer:{value:Ve},uPointerActivity:{value:0},uFieldSize:{value:new F(240,200)},uFocus:{value:ne},uPulseOrigin:{value:new F(.5,.5)},uCenter:{value:new F(.5,.47)},uTime:{value:0},uAmbientTime:{value:0},uInteractionTime:{value:0},uPulseAge:{value:-1},uDim:{value:0},uEntranceProgress:{value:1},uTitleRect:{value:new pt(-1e4,-1e4,0,0)},uPortalAnchors:{value:Me.map(()=>new F(-1e4,-1e4))},uActivePortal:{value:-1},uPortalAge:{value:100},uMobile:{value:0}};const ie=i(new ht({vertexShader:Et,fragmentShader:Vt,uniforms:m,depthTest:!1,depthWrite:!1,toneMapped:!1}));x=new He,x.add(new B(T,ie))}catch(l){return pe(),console.warn("The mechanical seal is unavailable; using its local SVG artwork.",l),Pe(a)}function Re(l){const d=Pt(l);c.position.fromArray(d.core.position),c.scale.setScalar(d.core.scale),d.lines.forEach((h,P)=>{f[P].position.fromArray(h.position),f[P].material.opacity=h.opacity,f[P].visible=h.opacity>0}),J=d.traceProgress,J===null&&(w.clearTrace(),b.visible=!1,me=-1/0),d.corners.forEach((h,P)=>{u[P].position.fromArray(h.position),u[P].rotation.z=h.rotationZ}),(L||H)&&z()}v=At({animate:xt,onUpdate:Re,immediate:()=>L||H||document.hidden,duration:()=>j()?900:1350});function U(){document.documentElement.classList.toggle("scene-ambient-paused",L||H||document.hidden||R<.99)}function z(l=0){if(C||p||document.hidden)return;r.visible=R>0,J!==null&&y-me>=1/(j()?20:30)&&(w.updateTrace(J),b.visible=!0,me=y),ne.lerp($e,l>0?1-Math.exp(-l*5.5):1);const d=1-(v?.progress??0),h=1-(1-R)**3;r.rotation.set((ee+.025-ne.y*.025)*d,(Q-.045+ne.x*.045)*d-(1-h)*.25,0),r.position.y=Te,r.position.z=-(1-h)*.45,r.scale.setScalar(Ae*(.9+h*.1)),l>0&&(fe*=Math.exp(-l*6)),m.uPointerActivity.value=fe,m.uTime.value=k,m.uAmbientTime.value=Z,m.uInteractionTime.value=y,m.uPulseAge.value=D<0?-1:y-D,m.uPortalAge.value=y-q,m.uDim.value=H?1:0,m.uEntranceProgress.value=R,e.setRenderTarget(null),e.clear(),e.render(x,g),e.clearDepth(),e.render(n,o)}function ze(l){if(E=0,C||p||L||H||document.hidden)return;const d=Math.min((l-(S||l))/1e3,.04);S=l,y+=d,R>=.99&&(k+=d,m.uActivePortal.value<0&&(Z+=d)),z(d),E=requestAnimationFrame(ze)}function _(){!E&&!C&&!p&&!L&&!H&&!document.hidden&&(S=0,E=requestAnimationFrame(ze))}function he(){if(C||p)return;const l=Math.max(1,window.innerWidth),d=Math.max(1,window.innerHeight),h=ke(),P=2*Math.tan(et.degToRad(o.fov)/2)*o.position.z;Te=(.5-h.y/d)*P,r.position.x=(h.x/l-.5)*P*o.aspect,Ae=h.size/d*P/Math.max($.width,$.height),m.uCenter.value.set(h.x/l,1-h.y/d),m.uFieldSize.value.set(h.size*.67,h.size*.58);const O=document.querySelector(".intro-copy")?.getBoundingClientRect();m.uTitleRect.value.set(O?.left??-1e4,O?d-O.bottom:-1e4,O?.width??0,O?.height??0),Me.forEach((ge,re)=>{const T=document.querySelector(`[data-portal="${ge}"]`)?.getBoundingClientRect();if(!T||!T.width||!T.height){m.uPortalAnchors.value[re].set(-1e4,-1e4);return}const ie=T.left+T.width/2,Y=T.top+T.height/2,I=h.x-ie,X=h.y-Y,Oe=Math.max(Math.abs(I)/(T.width/2),Math.abs(X)/(T.height/2),1);m.uPortalAnchors.value[re].set(ie+I/Oe,d-(Y+X/Oe))}),z()}function it(){V||C||p||document.hidden||(V=requestAnimationFrame(()=>{V=0,he()}))}function ve(){if(C||p)return;const l=Math.max(1,window.innerWidth),d=Math.max(1,window.innerHeight);e.setPixelRatio(Math.min(window.devicePixelRatio||1,j()?1.25:1.5)),e.setSize(l,d),o.aspect=l/d,o.updateProjectionMatrix(),m.uResolution.value.set(l,d),m.uMobile.value=l<1e3?1:0,he()}function G(){W!==null&&t.hasPointerCapture?.(W)&&t.releasePointerCapture(W),de=!1,W=null,N=null,t.classList.remove("grabbing")}function Fe(l){if(C||L||H)return;const d=A(l.clientX/window.innerWidth,0,1),h=A(1-l.clientY/window.innerHeight,0,1);te&&(fe=Math.min(1,Math.hypot(d-te.x,h-te.y)*100)),Ve.set(d,h),te={x:d,y:h},de&&l.pointerId===W&&N&&!v.busy&&v.form==="shield"&&(Q=A(Q+(l.clientX-N.x)*.003,-.21,.21),ee=A(ee+(l.clientY-N.y)*.002,-.1,.1),N={x:l.clientX,y:l.clientY})}function Ze(l){if(L||H||v.busy||v.form!=="shield"||l.button!==0)return;const d=ke();Math.hypot(l.clientX-d.x,l.clientY-d.y)>d.size*.5||(de=!0,W=l.pointerId,N={x:l.clientX,y:l.clientY},t.classList.add("grabbing"),t.setPointerCapture?.(l.pointerId))}function oe(l){l.pointerId===W&&G()}function De(){U(),document.hidden?(v.settle(),G(),ae(),cancelAnimationFrame(V),V=0):(he(),_())}function qe(l,d){if(p)return p.pointerPulse(l,d);if(C||L||H)return;const h=m.uCenter.value;m.uPulseOrigin.value.set(A(Number.isFinite(l)?l:h.x,0,1),A(Number.isFinite(d)?d:h.y,0,1)),D=y,_()}function We(){Ee(),window.removeEventListener("pointermove",Fe),window.removeEventListener("pointerup",oe),window.removeEventListener("pointercancel",oe),window.removeEventListener("resize",ve),document.removeEventListener("visibilitychange",De),t.removeEventListener("pointerdown",Ze),t.removeEventListener("webglcontextlost",Ge)}function Ge(l){l.preventDefault(),v.settle(),G(),We(),pe(),p=Pe(a,v.form),p.setEntranceProgress(R),p.focus(H),L&&p.pause()}return Ee=rt(it),window.addEventListener("pointermove",Fe,{passive:!0}),window.addEventListener("pointerup",oe),window.addEventListener("pointercancel",oe),window.addEventListener("resize",ve),document.addEventListener("visibilitychange",De),t.addEventListener("pointerdown",Ze),t.addEventListener("webglcontextlost",Ge),Re(0),ve(),a.classList.add("webgl-ready"),document.documentElement.dataset.sceneRenderer="webgl",U(),_(),{pause(){if(!C){if(p)return p.pause();L=!0,v.settle(),G(),ae(),U(),z()}},resume(){if(!C){if(p)return p.resume();L=!1,U(),z(),_()}},focus(l){if(!C){if(p)return p.focus(l);H=!!l,v.settle(),G(),U(),H?ae():_(),z()}},setEntranceProgress(l){if(!C){if(p)return p.setEntranceProgress(l);R=A(Number.isFinite(l)?l:1,0,1),r.visible=R>0,U(),z()}},setPortalFocus(l,d=null){if(C)return;if(p)return p.setPortalFocus(l,d);$e.set(Number.isFinite(l?.x)?A(l.x,-1,1):0,Number.isFinite(l?.y)?A(l.y,-1,1):0);const h=Me.indexOf(d);m.uActivePortal.value!==h&&(m.uActivePortal.value=h,q=y),(L||H)&&z()},pointerPulse:qe,toggleForm(){return C?Promise.resolve(v.form):p?p.toggleForm():(v.busy||(Q=0,ee=0,G(),qe()),v.toggle())},dispose(){C||(v.dispose(),C=!0,G(),We(),p?p.dispose():pe())}}}export{Ft as createSanctuary,ke as sculpturePlacement};

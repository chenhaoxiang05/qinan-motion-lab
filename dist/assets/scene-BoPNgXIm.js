import{S as Fe,E as Re,P as ne,a as Je,C as ze,b as Ie,W as Qe,A as et,c as pe,d as tt,G as $e,H as nt,D as Ze,M as Q,e as Z,f as rt,V as at,g as L,h as ot,i as De,j as st,k as it,l as lt,m as Ye}from"./three-CpBx13nd.js";import{a as ct}from"./index-BQ-RDkmc.js";const ve={安:"M75 760V523H197V649H801V523H930V760H561V850H433V760ZM54 477V364H269C226 283 183 206 147 147L274 113L292 146C334 132 378 116 421 100C331 57 216 33 76 19C99 -7 133 -61 144 -90C313 -65 450 -26 556 45C658 0 750 -47 811 -88L907 10C844 49 754 92 657 132C711 193 752 269 781 364H947V477H465L524 599L397 625C376 579 352 528 327 477ZM408 364H642C621 287 586 226 536 178C471 203 405 224 345 242Z",先:"M440 850V714H311C322 747 332 780 340 811L218 835C197 733 149 597 84 515C113 504 162 480 190 461C219 499 245 547 268 599H440V436H55V320H292C276 188 239 75 39 11C66 -14 100 -63 114 -95C345 -7 397 142 418 320H564V76C564 -37 591 -74 704 -74C726 -74 797 -74 820 -74C913 -74 945 -31 957 128C925 137 872 156 848 176C844 57 839 39 809 39C791 39 735 39 721 39C690 39 685 44 685 77V320H948V436H562V599H869V714H562V850Z",核:"M783 550C750 490 706 433 654 383C636 399 615 417 593 434C633 481 679 541 722 597H965V705H738V844H620V705H391V597H578C559 562 536 525 513 493L468 524L399 442C452 404 517 353 564 308C507 267 445 232 380 205C407 182 439 145 454 118C634 204 790 337 888 508ZM859 354C761 184 573 70 354 9C381 -18 410 -60 425 -90C540 -52 644 -3 735 61C791 8 850 -52 881 -92L978 -18C944 24 880 82 823 132C879 183 928 242 968 308ZM172 850V643H45V532H164C136 412 81 275 21 195C39 166 66 119 76 87C112 137 145 208 172 286V-89H283V332C307 287 330 239 343 207L408 296C391 326 310 447 283 482V532H385V643H283V850Z",实:"M530 66C658 28 789 -33 866 -85L939 10C858 59 716 118 586 155ZM232 545C284 515 348 467 376 434L451 520C419 554 354 597 302 623ZM130 395C183 366 249 321 279 287L351 377C318 409 251 451 198 475ZM77 756V526H196V644H801V526H927V756H588C573 790 551 830 531 862L410 825C422 804 434 780 445 756ZM68 274V174H392C334 103 238 51 76 15C101 -11 131 -57 143 -88C364 -34 478 53 539 174H938V274H575C600 367 606 476 610 601H483C479 470 476 362 446 274Z",再:"M145 619V251H30V140H145V-91H263V140H736V42C736 25 730 20 711 20C694 20 629 19 574 22C591 -8 609 -59 616 -91C700 -91 760 -90 801 -71C842 -53 856 -20 856 40V140H970V251H856V619H556V685H930V796H71V685H436V619ZM736 251H556V332H736ZM263 251V332H436V251ZM736 434H556V511H736ZM263 434V511H436V434Z",放:"M588 850C565 688 521 533 448 430V440C449 454 449 488 449 488H251V586H482V697H316V850H197V697H39V586H137V392C137 263 123 118 15 -6C44 -26 83 -59 103 -85C227 52 250 219 251 379H335C331 142 325 56 311 35C303 23 295 19 282 20C266 20 238 20 206 23C223 -7 234 -54 237 -86C279 -87 319 -87 344 -82C373 -76 393 -67 412 -38C437 -4 442 106 447 391C476 371 513 341 529 324C544 344 558 365 571 389C592 315 616 247 647 186C594 112 523 55 430 13C451 -12 486 -66 496 -92C585 -47 656 9 712 78C762 11 823 -44 900 -84C918 -52 955 -5 983 19C901 57 835 114 784 186C839 288 874 410 897 557H972V668H678C692 721 703 776 712 832ZM645 557H778C764 463 744 381 715 310C683 382 660 462 643 549Z",心:"M298 563V86C298 -40 333 -80 462 -80C487 -80 597 -80 624 -80C745 -80 778 -20 791 167C758 176 707 197 679 219C672 62 664 30 615 30C589 30 499 30 478 30C430 30 423 37 423 86V563ZM301 753C420 708 559 629 636 566L715 671C636 730 497 804 379 846ZM118 492C105 358 76 228 16 142L128 77C194 176 220 329 235 468ZM693 477C774 366 844 212 864 110L985 170C961 275 889 421 803 531Z"};function ut(n){const e=ve[n]?.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);if(!e)throw new Error(`Missing local glyph: ${n}`);const t=new Je;let i=0,r="",a=0,s=0,c=0,l=0;const f=()=>Number(e[i++]);for(;i<e.length;)switch(/^[A-Za-z]$/.test(e[i])&&(r=e[i++]),r){case"M":a=f(),s=f(),t.moveTo(a,s),c=a,l=s,r="L";break;case"L":a=f(),s=f(),t.lineTo(a,s);break;case"H":a=f(),t.lineTo(a,s);break;case"V":s=f(),t.lineTo(a,s);break;case"C":{const d=f(),u=f(),x=f(),v=f();a=f(),s=f(),t.bezierCurveTo(d,u,x,v,a,s);break}case"Z":t.currentPath.closePath(),a=c,s=l,r="";break;default:throw new Error(`Unsupported glyph command: ${r}`)}return t.toShapes(!0)}const ft=Object.freeze([Object.freeze([0,2]),Object.freeze([1,4]),Object.freeze([3,5])]),ge=Object.freeze(["先","核","实","再","放","心"]),D=.97,Oe=.051,ee=Object.freeze({width:2.02,height:3.04}),de=Object.freeze({width:3.64,height:3.44,depth:1.02}),Ge=[[-.51,1.02,0],[-.51,0,0],[.51,1.02,0],[-.51,-1.02,0],[.51,0,0],[.51,-1.02,0]],mt=ge.map((n,e)=>[(e%3-1)*1.12,(.5-Math.floor(e/3))*1.12,0]),Xe=n=>Math.max(0,Math.min(1,n)),pt=n=>{const e=Xe(n);return e*e*(3-2*e)},z=(n,e,t)=>pt((n-e)/(t-e)),$=(n,e,t)=>t<=0?n:t>=1?e:n+(e-n)*t;function xe(n){if(!Number.isInteger(n)||n<0||n>=6)throw new RangeError("Panel ID must be an integer from 0 to 5.")}function dt(n,e,t){xe(n);const[i,r]=Ge[n];return[(i+(e-.5)*D+ee.width/2)/ee.width,(r+(t-.5)*D+ee.height/2)/ee.height]}function ht(n,e,t){return xe(n),[(n%3+e)/3,(1-Math.floor(n/3)+t)/2]}function vt(){const n=new Fe,e=.485;n.moveTo(-e,-e),n.lineTo(e,-e),n.lineTo(e,e),n.lineTo(-e,e),n.closePath();const t=new Re(n,{depth:.07,bevelEnabled:!0,bevelThickness:.015,bevelSize:.015,bevelSegments:1,curveSegments:1,steps:1});t.translate(0,0,-.035),t.computeBoundingBox(),t.computeBoundingSphere();const i=new ne(D,D);i.computeBoundingBox();const r=new Fe;r.moveTo(0,0),r.lineTo(.2,0),r.lineTo(.2,-.026),r.lineTo(.026,-.026),r.lineTo(.026,-.2),r.lineTo(0,-.2),r.closePath();const a=new Re(r,{depth:.035,bevelEnabled:!1,curveSegments:1,steps:1});return a.translate(0,0,-.0175),a.computeBoundingBox(),a.computeBoundingSphere(),{panelBodyGeometry:t,facePlaneGeometry:i,cornerGeometry:a}}function qe(n,e="front"){if(xe(n),e!=="front"&&e!=="back")throw new RangeError("Panel side must be front or back.");const t=new ne(D,D),i=t.attributes.uv,r=e==="front"?dt:ht;for(let a=0;a<i.count;a++){const[s,c]=r(n,i.getX(a),i.getY(a));i.setXY(a,s,c)}return i.needsUpdate=!0,e==="back"&&t.rotateY(Math.PI),t.translate(0,0,e==="front"?Oe:-Oe),t.computeBoundingBox(),t.computeBoundingSphere(),t}function gt(n){const e=Number.isFinite(n)?Xe(n):0,t=z(e,.12,.32),i=z(e,.32,.56),r=z(e,.56,.6),a=Ge.map((d,u)=>{const x=mt[u],h=u===1||u===4?[$(d[0],x[0],i),$(d[1],x[1],i),(u===1?.18:-.18)*t*(1-r)]:[$(d[0],x[0],t),$(d[1],x[1],i),0],g=.6+u*.018,S=Math.PI*z(e,g,g+.22);return{id:u,position:h,rotationY:S}}),s=.1*z(e,0,.12)*(1-z(e,.91,1)),c=$(1.1,1.71,t)+s,l=$(1.61,1.15,i)+s,f=[{position:[-c,l,.01],rotationZ:0},{position:[c,l,.01],rotationZ:-Math.PI/2},{position:[c,-l,.01],rotationZ:Math.PI},{position:[-c,-l,.01],rotationZ:Math.PI/2}];return{progress:e,panels:a,corners:f}}const te="#e9eadd",Ue="#151a12",je="#11150f",ue=new Map;function xt(n){if(!ue.has(n)){const e=ut(n).flatMap(r=>r.getPoints(12)),t=e.map(r=>r.x),i=e.map(r=>r.y);ue.set(n,{minX:Math.min(...t),maxX:Math.max(...t),minY:Math.min(...i),maxY:Math.max(...i)})}return ue.get(n)}function _e(n,e,t,i,r){const a=xt(n),s=Math.min(i/(a.maxX-a.minX),r/(a.maxY-a.minY));return{scale:s,x:e-(a.minX+a.maxX)*s/2,y:t+(a.minY+a.maxY)*s/2}}function Be(n,e,t,i,r,a){const{scale:s,x:c,y:l}=_e(n,e,t,i,r);return`<path d="${ve[n]}" transform="translate(${c} ${l}) scale(${s} ${-s})" fill="${a}"/>`}function Ne(n,e,t,i,r,a,s){const{scale:c,x:l,y:f}=_e(e,t,i,r,a),d=n.canvas.ownerDocument.defaultView.Path2D||globalThis.Path2D;n.save(),n.translate(l,f),n.scale(c,-c),n.fillStyle=s,n.fill(new d(ve[e])),n.restore()}function wt({mobile:n=!1}={}){const e=n?256:384,t=document.createElement("canvas"),i=document.createElement("canvas");t.width=e*2,t.height=e*3,i.width=e*3,i.height=e*2;const r=t.getContext("2d"),a=i.getContext("2d");if(!r||!a)throw new Error("Local seal artwork requires a 2D canvas.");r.fillStyle=te,r.fillRect(0,0,t.width,t.height),Ne(r,"安",e,e*1.5,e*1.54,e*1.74,je),r.fillStyle="#a4ae92";for(let l=0;l<7;l++)r.fillRect(e*.17+l*e*.036,e*.16,e*(l%3===0?.014:.006),e*.1);r.fillRect(e*1.64,e*2.72,e*.19,e*.025),r.fillRect(e*1.805,e*2.57,e*.025,e*.175),a.fillStyle=Ue,a.fillRect(0,0,i.width,i.height),ge.forEach((l,f)=>{const d=f%3,u=Math.floor(f/3);Ne(a,l,(d+.5)*e,(u+.51)*e,e*.7,e*.7,te),a.fillStyle="#c2ff00",a.fillRect((d+.14)*e,(u+.12)*e,e*.12,e*.015)});const s=new ze(t),c=new ze(i);for(const l of[s,c])l.colorSpace=Ie,l.anisotropy=2;return{frontTexture:s,backTexture:c}}function yt(n="shield"){const e=n==="slogan",t=e?3:2,i=e?2:3,r=100,a=e?12:2,s=t*r+(t-1)*a,c=i*r+(i-1)*a,l=[];for(let f=0;f<i;f++)for(let d=0;d<t;d++){const u=e?f*3+d:ft[f][d],x=d*(r+a),v=f*(r+a);l.push(`<rect data-plate="${u}" x="${x}" y="${v}" width="${r}" height="${r}" rx="1" fill="${e?Ue:te}" stroke="#7f8971" stroke-width=".5"/>`),e&&l.push(Be(ge[u],x+50,v+51,70,70,te))}return e||(l.push(`<defs><clipPath id="seal-local-faces">${l.join("").replace(/ data-plate="\d"/g,"")}</clipPath></defs>`),l.push(`<g clip-path="url(#seal-local-faces)">${Be("安",s/2,c/2,155,174,je)}</g>`)),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 ${s+16} ${c+16}" style="width:100%;height:auto;display:block;stroke:none" aria-hidden="true">${l.join("")}<path d="M-5 17V-5H17 M${s-17} -5H${s+5}V17 M-5 ${c-17}V${c+5}H17 M${s-17} ${c+5}H${s+5}V${c-17}" fill="none" stroke="#c2ff00" stroke-width="1.3"/></svg>`}function Ct({animate:n,onUpdate:e=()=>{},immediate:t=()=>!1,duration:i=()=>1150}={}){const r={progress:0};let a="shield",s=null,c=null,l=null,f=null,d=!1;function u(){if(!s)return;a=s,r.progress=a==="slogan"?1:0,s=null,c=null;const v=f;l=null,f=null,e(r.progress),v?.(a)}function x(){c?.cancel?.(),u()}return{get progress(){return r.progress},get form(){return a},get busy(){return l!==null},toggle(){if(d)return Promise.resolve(a);if(l)return l;s=a==="shield"?"slogan":"shield";const v=new Promise(h=>{f=h});if(l=v,t())u();else try{const h=n(r,{progress:s==="slogan"?1:0,duration:i(),ease:"linear",onUpdate:()=>{!d&&l===v&&e(r.progress)},onComplete:()=>{l===v&&u()}});l===v?c=h:h?.cancel?.()}catch{u()}return v},settle:x,dispose(){d||(x(),d=!0)}}}const bt=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,Pt=`
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
  // One right-angle path reaches the card edge. A finite packet traverses its
  // total length once when this actual portal becomes active, then disappears.
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
    float active = 1.-step(.1,abs(uActivePortal-id));
    float age = clamp(uPortalAge/.72,0.,1.);
    float distance = age*total;
    vec2 head = distance<first ? mix(start,elbow,distance/max(1.,first))
                              : mix(elbow,end,(distance-first)/max(1.,second));
    float tailDistance = max(0.,distance-18.);
    vec2 tail = tailDistance<first ? mix(start,elbow,tailDistance/max(1.,first))
                                  : mix(elbow,end,(tailDistance-first)/max(1.,second));
    // Draw separate segments across the elbow, never a diagonal shortcut.
    float packet = 0.;
    if (tailDistance<first && distance>first) packet = max(segment(p,tail,elbow),segment(p,elbow,head));
    else packet = segment(p,tail,head);
    packet *= active*step(0.,uPortalAge)*(1.-step(.72,uPortalAge))*step(.98,entrance);
    return vec2(line*(.018+active*.10),packet*.62)*valid;
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
    color = mix(color,vec3(.00518,.00750,.00402),mainPanel*reveal);
    color = mix(color,vec3(.00972,.01444,.00699),upperPanel*reveal*.78);
    color = mix(color,vec3(.00478,.00605,.00439),lowerPanel*reveal);

    // A single cropped 24px lattice and its seams establish a print-like field.
    vec2 cell = abs(mod(far+12.,24.)-12.);
    float lattice = max(rule(cell.x),rule(cell.y));
    float gridArea = mainPanel*step(extent.x*.43,far.x)*step(far.y,extent.y*.86);
    float grid = lattice*gridArea*.008;
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

    // Once per eight seconds, one narrow band crosses the equipment field.
    // Neither brightness nor the entire screen oscillates between frames.
    float cycle = mod(uTime,8.);
    float scanActive = step(.45,cycle)*(1.-step(1.35,cycle))*step(.99,entrance);
    float scanY = mix(frame.y,-frame.y,clamp((cycle-.45)/.90,0.,1.));
    float scan = rule(abs(q.y-scanY))*step(abs(q.x),frame.x)*scanActive;
    float pointerLevel = clamp(uPointerActivity,0.,1.)*desktop;
    vec2 snapped = floor((uPointer*uResolution-layerCenter)/24.)*24.;
    float cursor = max(segment(q,snapped-vec2(5.,0.),snapped+vec2(5.,0.)),
                       segment(q,snapped-vec2(0.,5.),snapped+vec2(0.,5.)));
    cursor *= rectangle(q,frame)*pointerLevel;
    vec2 pulseDelta = (vUv-uPulseOrigin)*uResolution;
    float pulseRadius = max(0.,uPulseAge)*210.;
    float pulse = rule(abs(max(abs(pulseDelta.x),abs(pulseDelta.y))-pulseRadius));
    pulse *= step(0.,uPulseAge)*(1.-smoothstep(.15,1.10,uPulseAge))*rectangle(q,frame);
    color += vec3(.539,1.,0.)*(scan*.035+cursor*.12+pulse*.055)*clear;

    // Cobalt is a small registration tab, not a luminous atmosphere.
    float cobalt = rectangle(q-vec2(-frame.x+9.,frame.y+12.),vec2(9.,2.5));
    color = mix(color,vec3(.004,.033,.62),cobalt*clear*drawn*.72);
    float dust = (hash(floor(pixel))-0.5)*.00020;
    color = max(vec3(0.),color+vec3(dust));
    color *= mix(1.,.32,clamp(uDim,0.,1.));
    gl_FragColor = vec4(color,1.);
    #include <colorspace_fragment>
  }
`,M=Ye.clamp,B=()=>window.innerWidth<700,fe=["check","contacts","practice","history"];function he(){const n=Math.max(1,window.innerWidth),e=Math.max(1,window.innerHeight),t=document.querySelector("#sculptureAnchor")?.getBoundingClientRect();return t?.width>0&&t?.height>0?{x:t.left+t.width/2,y:t.top+t.height/2,size:Math.max(80,Math.min(t.width*.84,t.height*.88))}:{x:n/2,y:B()?Math.min(340,e*.48):e*.53,size:B()?Math.min(218,n*.56,e*.3):Math.min(326,e*.39,n*.23)}}function We(n){const e=typeof ResizeObserver<"u"?new ResizeObserver(n):null;return document.querySelectorAll("#sculptureAnchor, .intro-copy, .portal-node").forEach(t=>e?.observe(t)),window.addEventListener("scroll",n,{passive:!0}),()=>{e?.disconnect(),window.removeEventListener("scroll",n)}}function me(n,e="shield"){let t=e,i=!1,r=!1,a=1;const s=document.createElement("div");s.className="scene-fallback",s.style.cssText="position:absolute;inset:0;pointer-events:none";const c=document.createElement("div");c.style.cssText="position:absolute;filter:drop-shadow(0 15px 17px #0005);transform-origin:center",s.append(c);function l(){if(r)return;const u=he(),x=t==="shield"?2.18:3.4;c.style.left=`${u.x}px`,c.style.top=`${u.y}px`,c.style.width=`${u.size*x/de.width}px`,c.style.transform=`translate(-50%,-50%) scale(${.9+a*.1})`}function f(){c.className=t==="shield"?"scene-fallback-shield":"scene-fallback-slogan",c.innerHTML=yt(t),l()}n.append(s),n.classList.add("webgl-ready"),window.addEventListener("resize",l);const d=We(l);return f(),{pause(){i=!0,a=1,l()},resume(){i=!1},focus(u){s.style.opacity=u?".36":"1"},setEntranceProgress(u){a=i?1:M(Number.isFinite(u)?u:1,0,1),l()},setPortalFocus(){},pointerPulse(){},async toggleForm(){return r||(t=t==="shield"?"slogan":"shield",f()),t},dispose(){r||(r=!0,d(),window.removeEventListener("resize",l),s.remove(),n.classList.remove("webgl-ready"))}}}function Mt(n){const e=new pe;e.background=new De(3159338);for(const[i,r,a,s,c,l]of[[-3,3,4,3,4,2.5],[3,1,2,1,4,1.3],[0,-3,3,4,.5,.6]]){const f=new st({color:new De(15987684).multiplyScalar(l),side:it}),d=new Z(new ne(s,c),f);d.position.set(i,r,a),d.lookAt(0,0,0),e.add(d)}const t=new lt(n);try{return t.fromScene(e,.08,.1,30)}finally{e.traverse(i=>{i.geometry?.dispose(),i.material?.dispose()}),t.dispose()}}function kt(n){let e;try{e=new Qe({alpha:!1,antialias:!0,powerPreference:"high-performance"})}catch{return me(n)}const t=e.domElement;t.setAttribute("aria-hidden","true"),t.style.touchAction="pan-y",n.append(t),e.outputColorSpace=Ie,e.toneMapping=et,e.toneMappingExposure=1,e.autoClear=!1;const i=new Set,r=o=>(i.add(o),o),a=new pe,s=new tt(38,1,.1,30);s.position.z=8.8;const c=new $e;a.add(c);const l=[],f=[];let d,u,x,v,h,g=!1,S=0,E=0,F=0,N=0,re=-100,we=-100,w=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,y=!1,O=1,ye=0,Ce=1,I=0,Y=0,ae=!1,A=null,R=null,G=null,oe=0,be=()=>{};const Pe=new L(.5,.5),Me=new L,X=new L;function U(){cancelAnimationFrame(S),S=0,N=0}function se(){U(),cancelAnimationFrame(E),E=0,i.forEach(o=>o.dispose()),i.clear(),c.clear(),a.clear(),d?.clear(),l.length=0,f.length=0,e.dispose(),t.remove(),n.classList.remove("webgl-ready")}try{const o=r(Mt(e));a.environment=o.texture,a.environmentIntensity=.65,a.add(new nt(16053737,1514514,1.15));const m=new Ze(16776688,2.1);m.position.set(-3,4,5),a.add(m);const p=new Ze(14477256,.7);p.position.set(4,-.5,3),a.add(p);const b=vt();Object.values(b).forEach(r);const H=wt({mobile:B()});Object.values(H).forEach(r);const ce=r(new Q({color:3620399,metalness:.55,roughness:.56})),_=r(new Q({color:16777215,map:H.frontTexture,metalness:.05,roughness:.66})),C=r(new Q({color:16777215,map:H.backTexture,metalness:.08,roughness:.61})),W=r(new Q({color:12779264,metalness:.1,roughness:.6,emissive:1581056,emissiveIntensity:.3}));for(let P=0;P<6;P++){const k=new $e;k.add(new Z(b.panelBodyGeometry,ce),new Z(r(qe(P,"front")),_),new Z(r(qe(P,"back")),C)),c.add(k),l.push(k)}for(let P=0;P<4;P++){const k=new Z(b.cornerGeometry,W);c.add(k),f.push(k)}const K=r(new ne(2,2));x=new rt,u={uResolution:{value:new L},uPointer:{value:Pe},uPointerActivity:{value:0},uFieldSize:{value:new L(240,200)},uFocus:{value:X},uPulseOrigin:{value:new L(.5,.5)},uCenter:{value:new L(.5,.47)},uTime:{value:0},uPulseAge:{value:-1},uDim:{value:0},uEntranceProgress:{value:1},uTitleRect:{value:new at(-1e4,-1e4,0,0)},uPortalAnchors:{value:fe.map(()=>new L(-1e4,-1e4))},uActivePortal:{value:-1},uPortalAge:{value:100},uMobile:{value:0}};const J=r(new ot({vertexShader:bt,fragmentShader:Pt,uniforms:u,depthTest:!1,depthWrite:!1,toneMapped:!1}));d=new pe,d.add(new Z(K,J))}catch(o){return se(),console.warn("The mechanical seal is unavailable; using its local SVG artwork.",o),me(n)}function Se(o){const m=gt(o);m.panels.forEach(p=>{l[p.id].position.fromArray(p.position),l[p.id].rotation.y=p.rotationY}),m.corners.forEach((p,b)=>{f[b].position.fromArray(p.position),f[b].rotation.z=p.rotationZ}),(w||y)&&V()}v=Ct({animate:ct,onUpdate:Se,immediate:()=>w||y||document.hidden,duration:()=>B()?800:1150});function V(o=0){if(g||h||document.hidden)return;X.lerp(Me,o>0?1-Math.exp(-o*5.5):1);const m=1-(v?.progress??0),p=1-(1-O)**3;c.rotation.set((Y+.025-X.y*.025)*m,(I-.045+X.x*.045)*m-(1-p)*.25,0),c.position.y=ye,c.position.z=-(1-p)*.45,c.scale.setScalar(Ce*(.9+p*.1)),o>0&&(oe*=Math.exp(-o*6)),u.uPointerActivity.value=oe,u.uTime.value=F,u.uPulseAge.value=re<0?-1:F-re,u.uPortalAge.value=F-we,u.uDim.value=y?1:0,u.uEntranceProgress.value=O,e.setRenderTarget(null),e.clear(),e.render(d,x),e.clearDepth(),e.render(a,s)}function He(o){if(S=0,g||h||w||y||document.hidden)return;const m=Math.min((o-(N||o))/1e3,.04);N=o,F+=m,V(m),S=requestAnimationFrame(He)}function q(){!S&&!g&&!h&&!w&&!y&&!document.hidden&&(N=0,S=requestAnimationFrame(He))}function ie(){if(g||h)return;const o=Math.max(1,window.innerWidth),m=Math.max(1,window.innerHeight),p=he(),b=2*Math.tan(Ye.degToRad(s.fov)/2)*s.position.z;ye=(.5-p.y/m)*b,c.position.x=(p.x/o-.5)*b*s.aspect,Ce=p.size/m*b/Math.max(de.width,de.height),u.uCenter.value.set(p.x/o,1-p.y/m),u.uFieldSize.value.set(p.size*.67,p.size*.58);const H=document.querySelector(".intro-copy")?.getBoundingClientRect();u.uTitleRect.value.set(H?.left??-1e4,H?m-H.bottom:-1e4,H?.width??0,H?.height??0),fe.forEach((ce,_)=>{const C=document.querySelector(`[data-portal="${ce}"]`)?.getBoundingClientRect();if(!C||!C.width||!C.height){u.uPortalAnchors.value[_].set(-1e4,-1e4);return}const W=C.left+C.width/2,K=C.top+C.height/2,J=p.x-W,P=p.y-K,k=Math.max(Math.abs(J)/(C.width/2),Math.abs(P)/(C.height/2),1);u.uPortalAnchors.value[_].set(W+J/k,m-(K+P/k))}),V()}function Ke(){E||g||h||document.hidden||(E=requestAnimationFrame(()=>{E=0,ie()}))}function le(){if(g||h)return;const o=Math.max(1,window.innerWidth),m=Math.max(1,window.innerHeight);e.setPixelRatio(Math.min(window.devicePixelRatio||1,B()?1.25:1.5)),e.setSize(o,m),s.aspect=o/m,s.updateProjectionMatrix(),u.uResolution.value.set(o,m),u.uMobile.value=o<1e3?1:0,ie()}function T(){A!==null&&t.hasPointerCapture?.(A)&&t.releasePointerCapture(A),ae=!1,A=null,R=null,t.classList.remove("grabbing")}function ke(o){if(g||w||y)return;const m=M(o.clientX/window.innerWidth,0,1),p=M(1-o.clientY/window.innerHeight,0,1);G&&(oe=Math.min(1,Math.hypot(m-G.x,p-G.y)*100)),Pe.set(m,p),G={x:m,y:p},ae&&o.pointerId===A&&R&&!v.busy&&v.form==="shield"&&(I=M(I+(o.clientX-R.x)*.003,-.21,.21),Y=M(Y+(o.clientY-R.y)*.002,-.1,.1),R={x:o.clientX,y:o.clientY})}function Ve(o){if(w||y||v.busy||v.form!=="shield"||o.button!==0)return;const m=he();Math.hypot(o.clientX-m.x,o.clientY-m.y)>m.size*.5||(ae=!0,A=o.pointerId,R={x:o.clientX,y:o.clientY},t.classList.add("grabbing"),t.setPointerCapture?.(o.pointerId))}function j(o){o.pointerId===A&&T()}function Le(){document.hidden?(v.settle(),T(),U(),cancelAnimationFrame(E),E=0):(ie(),q())}function Ee(o,m){if(h)return h.pointerPulse(o,m);if(g||w||y)return;const p=u.uCenter.value;u.uPulseOrigin.value.set(M(Number.isFinite(o)?o:p.x,0,1),M(Number.isFinite(m)?m:p.y,0,1)),re=F,q()}function Ae(){be(),window.removeEventListener("pointermove",ke),window.removeEventListener("pointerup",j),window.removeEventListener("pointercancel",j),window.removeEventListener("resize",le),document.removeEventListener("visibilitychange",Le),t.removeEventListener("pointerdown",Ve),t.removeEventListener("webglcontextlost",Te)}function Te(o){o.preventDefault(),v.settle(),T(),Ae(),se(),h=me(n,v.form),h.setEntranceProgress(O),h.focus(y),w&&h.pause()}return be=We(Ke),window.addEventListener("pointermove",ke,{passive:!0}),window.addEventListener("pointerup",j),window.addEventListener("pointercancel",j),window.addEventListener("resize",le),document.addEventListener("visibilitychange",Le),t.addEventListener("pointerdown",Ve),t.addEventListener("webglcontextlost",Te),Se(0),le(),n.classList.add("webgl-ready"),q(),{pause(){if(!g){if(h)return h.pause();w=!0,O=1,v.settle(),T(),U(),V()}},resume(){if(!g){if(h)return h.resume();w=!1,V(),q()}},focus(o){if(!g){if(h)return h.focus(o);y=!!o,v.settle(),T(),y?U():q(),V()}},setEntranceProgress(o){if(!g){if(h)return h.setEntranceProgress(o);O=w?1:M(Number.isFinite(o)?o:1,0,1),(!S||w||y)&&V()}},setPortalFocus(o,m=null){if(g)return;if(h)return h.setPortalFocus(o,m);Me.set(Number.isFinite(o?.x)?M(o.x,-1,1):0,Number.isFinite(o?.y)?M(o.y,-1,1):0);const p=fe.indexOf(m);u.uActivePortal.value!==p&&(u.uActivePortal.value=p,we=F),(w||y)&&V()},pointerPulse:Ee,toggleForm(){return g?Promise.resolve(v.form):h?h.toggleForm():(v.busy||(I=0,Y=0,T(),Ee()),v.toggle())},dispose(){g||(v.dispose(),g=!0,T(),Ae(),h?h.dispose():se())}}}export{kt as createSanctuary,he as sculpturePlacement};

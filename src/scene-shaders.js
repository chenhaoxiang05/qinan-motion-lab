/** One local background pass: architectural panels and a visibly moving signal field. */
export const screenVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * All measurements are CSS pixels in a bottom-left coordinate system. The
 * title rectangle stays screen-aligned while two equipment layers shift by at
 * most 5px / 9px. Constant array indices keep the shader valid on GLES / WebGL.
 */
export const fuiFragment = `
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
  float wideSegment(vec2 p, vec2 a, vec2 b) {
    vec2 axis = b-a;
    float t = clamp(dot(p-a,axis)/max(dot(axis,axis),.001),0.,1.);
    return 1.-smoothstep(.9,1.8,length(p-a-t*axis));
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
    float tailDistance = max(0.,distance-80.);
    vec2 tail = tailDistance<first ? mix(start,elbow,tailDistance/max(1.,first))
                                  : mix(elbow,end,(tailDistance-first)/max(1.,second));
    // Draw separate segments across the elbow, never a diagonal shortcut.
    float packet = 0.;
    if (tailDistance<first && distance>first) packet = max(wideSegment(p,tail,elbow),wideSegment(p,elbow,head));
    else packet = wideSegment(p,tail,head);
    packet *= active*step(0.,localTime)*(1.-step(travelTime,localTime))*step(.99,entrance);
    return vec2(line*(.032+active*interacting*.09),packet*mix(.48,.76,interacting))*valid;
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
    float gridOffset = mod(uTime/6.*24.,24.);
    vec2 cell = abs(mod(far+vec2(12.,12.-gridOffset),24.)-12.);
    float lattice = max(rule(cell.x),rule(cell.y));
    float gridArea = mainPanel*step(extent.x*.12,far.x)*step(far.y,extent.y*.86);
    float grid = lattice*gridArea*.026;
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

    // A broad diagonal register passes across the equipment, large enough to
    // read as motion at rest. Hard clipped edges retain the printed FUI feel.
    // Its clock is held by the scene while paused, hidden or inside a feature.
    float sweepCycle = mod(uTime,5.2);
    float sweepProgress = clamp(sweepCycle/2.8,0.,1.);
    float sweepRange = mainSize.x+mainSize.y*.58+90.;
    float sweepX = mix(-sweepRange,sweepRange,sweepProgress);
    float diagonal = (far.x+far.y*.58-sweepX)/1.156;
    float sweepActive = (1.-step(2.8,sweepCycle))*step(.99,entrance);
    float sweep = (1.-smoothstep(32.,36.,abs(diagonal)))*mainPanel*sweepActive;
    float sweepEdge = rule(abs(diagonal-35.))*mainPanel*sweepActive;
    color += vec3(.20,.38,.08)*sweep*.15*clear;
    color += vec3(.62,.78,.40)*sweepEdge*.10*clear;
    // The moving grid lights up inside the same registration band.
    float scan = sweep*lattice*gridArea;
    float pointerLevel = clamp(uPointerActivity,0.,1.)*desktop;
    vec2 snapped = floor((uPointer*uResolution-layerCenter)/24.)*24.;
    float cursor = max(segment(q,snapped-vec2(5.,0.),snapped+vec2(5.,0.)),
                       segment(q,snapped-vec2(0.,5.),snapped+vec2(0.,5.)));
    cursor *= rectangle(q,frame)*pointerLevel;
    vec2 pulseDelta = (vUv-uPulseOrigin)*uResolution;
    float pulseRadius = max(0.,uPulseAge)*210.;
    float pulse = rule(abs(max(abs(pulseDelta.x),abs(pulseDelta.y))-pulseRadius));
    pulse *= step(0.,uPulseAge)*(1.-smoothstep(.15,1.10,uPulseAge))*rectangle(q,frame);
    color += vec3(.70,.76,.66)*(scan*.10+cursor*.07+pulse*.024)*clear;

    // One substantial cobalt tab travels along the upper equipment rail.
    float cobaltCycle = mod(uTime,6.4);
    float cobaltProgress = cobaltCycle<2.6 ? smoothstep(0.,2.6,cobaltCycle)
                                         : 1.-smoothstep(3.8,6.4,cobaltCycle);
    float cobalt = rectangle(q-vec2(-frame.x+20.+120.*cobaltProgress,frame.y+12.),vec2(20.,4.));
    color = mix(color,vec3(.010,.065,.90),cobalt*clear*drawn*.90);
    float dust = (hash(floor(pixel))-0.5)*.00020;
    color = max(vec3(0.),color+vec3(dust));
    color *= mix(1.,.32,clamp(uDim,0.,1.));
    gl_FragColor = vec4(color,1.);
    #include <colorspace_fragment>
  }
`;

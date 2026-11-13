/** One local GPU pass: precise tracks, a quiet grid and finite signal pulses. */
export const screenVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fuiFragment = `
  uniform vec2 uResolution;
  uniform vec2 uFocus;
  uniform vec2 uPointer;
  uniform vec2 uFieldSize;
  uniform vec2 uPulseOrigin;
  uniform vec2 uCenter;
  uniform float uPointerActivity;
  uniform float uTime;
  uniform float uPulseAge;
  uniform float uDim;
  varying vec2 vUv;

  float rule(float distance) {
    return 1. - smoothstep(.35, 1.05, distance);
  }
  float segment(vec2 p, vec2 a, vec2 b) {
    vec2 axis = b - a;
    float t = clamp(dot(p - a, axis) / max(dot(axis, axis), 1.), 0., 1.);
    return rule(length(p - a - t * axis));
  }
  void main() {
    vec2 pixel = vUv * uResolution;
    vec2 q = (vUv - uCenter) * uResolution;
    vec2 extent = max(uFieldSize, vec2(80.));
    float inField = step(abs(q.x), extent.x) * step(abs(q.y), extent.y);
    // A fixed 24px grid is confined to the sculpture's outer equipment field.
    // Nothing bends, blooms, fills the headline area or moves behind running text.
    vec2 cell = abs(mod(q + 12., 24.) - 12.);
    float outerField = step(.48, max(abs(q.x)/extent.x, abs(q.y)/extent.y));
    float grid = max(rule(cell.x), rule(cell.y)) * inField * outerField;
    float ticks = rule(cell.x) * step(extent.y-4., abs(q.y)) * inField;
    float rails = rule(abs(abs(q.y) - extent.y*.76)) * step(abs(q.x),extent.x);
    float verticalRail = rule(abs(q.x-extent.x*.84)) * step(abs(q.y),extent.y*.76);
    float horizontalGate = step(extent.x*.40, abs(q.x));
    float guides = rails * horizontalGate + verticalRail;

    // Two short packets move along straight rails; their paths never randomize.
    float laneLength = extent.x*.54;
    float packetX = extent.x*.44 + mod(uTime*17., max(1.,laneLength-18.));
    float packetA = segment(q,vec2(packetX,extent.y*.76),vec2(packetX+14.,extent.y*.76));
    float packetB = segment(q,vec2(-packetX,-extent.y*.76),vec2(-packetX-8.,-extent.y*.76));
    float pointerLevel = clamp(uPointerActivity,0.,1.);
    vec2 snapped = floor((uPointer*uResolution-uCenter*uResolution)/24.)*24.;
    float cursor = max(segment(q,snapped-vec2(6.,0.),snapped+vec2(6.,0.)),
                       segment(q,snapped-vec2(0.,6.),snapped+vec2(0.,6.)));
    cursor *= inField * pointerLevel;
    float focusTick = segment(q,vec2(extent.x*.84, uFocus.y*extent.y*.5-9.),
                                vec2(extent.x*.84, uFocus.y*extent.y*.5+9.));
    focusTick *= min(1.,length(uFocus));

    // A form change sends one rectilinear scan outward, then it fully disappears.
    vec2 delta = (vUv-uPulseOrigin)*uResolution;
    float scanRadius = max(0.,uPulseAge)*210.;
    float scan = rule(abs(max(abs(delta.x),abs(delta.y))-scanRadius));
    scan *= step(0.,uPulseAge)*(1.-smoothstep(.2,1.25,uPulseAge))*inField;
    vec3 color = vec3(.00125,.00145,.00135);
    color += vec3(.70,.76,.73)*(grid*.006+ticks*.018+guides*.016);
    color += vec3(.57,1.,.008)*(packetA*.30+packetB*.18+cursor*.13+focusTick*.20+scan*.06);
    color *= mix(1.,.32,uDim);
    gl_FragColor = vec4(color,1.);
    #include <colorspace_fragment>
  }
`;

/** The same three-stage clock drives opacity on CPU and migration on GPU. */
export function morphVisualState(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const fade = smooth(p / (200 / 1500));
  const travel = p < 1100 / 1500
    ? .92 * smooth((p - 200 / 1500) / (900 / 1500))
    : .92 + .08 * (1 - Math.pow(1 - (p - 1100 / 1500) / (400 / 1500), 3));
  return { solidOpacity: 1 - fade, voxelOpacity: fade, travel };
}

/** Instancing morph math lives in the GPU, not thousands of per-frame JS matrices. */
export function configureVoxelMaterial(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `
      uniform float uProgress;
      attribute vec3 aStart;
      attribute vec3 aEnd;
      attribute vec3 aArc;
      attribute float aSeed;
      float migration(float p) {
        float travel = p < .7333333333
          ? .92 * smoothstep(.1333333333, .7333333333, p)
          : .92 + .08 * (1. - pow(1. - clamp((p - .7333333333) / .2666666667, 0., 1.), 3.));
        return clamp(travel, 0., 1.);
      }
      mat3 voxelRotation(float angle) {
        float c=cos(angle), s=sin(angle);
        return mat3(c,0.,-s, 0.,1.,0., s,0.,c);
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      float voxelT = migration(uProgress);
      float disturbance = sin(voxelT * 3.14159265359);
      mat3 voxelTurn = voxelRotation(disturbance * (.35 + aSeed * .7));
      vec3 objectNormal = voxelTurn * vec3(normal);
      #ifdef USE_TANGENT
        vec3 objectTangent = voxelTurn * vec3(tangent.xyz);
      #endif
    `);
    // Three's color chunk precedes its normal chunk; never reference voxelT here.
    shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', `
      #include <color_vertex>
      #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
        vColor.rgb = mix(vColor.rgb, vec3(.80, .87, .90), smoothstep(.1, .8, migration(uProgress)));
      #endif
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = voxelTurn * vec3(position);
      transformed += mix(aStart, aEnd, voxelT) + aArc * disturbance;
    `);
  };
  material.customProgramCacheKey = () => 'qinan-spaced-voxel-v5';
}

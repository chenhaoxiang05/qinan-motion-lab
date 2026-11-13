/** Small, local GPU passes: a pointer-flow buffer and a silver liquid field. */
export const screenVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const flowFragment = `
  uniform sampler2D uPrevious;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform float uAspect;
  uniform float uDelta;
  uniform float uInject;
  uniform float uReset;
  varying vec2 vUv;
  void main() {
    if (uReset > .5) {
      gl_FragColor = vec4(.5, .5, 0., 1.);
      return;
    }
    vec2 previousVelocity = (texture2D(uPrevious, vUv).rg - .5) * 2.;
    vec2 advected = clamp(vUv - previousVelocity * uDelta * .12, .001, .999);
    vec4 previous = texture2D(uPrevious, advected);
    vec2 velocity = (previous.rg - .5) * 2. * exp(-uDelta * 3.3);
    float pressure = previous.b * exp(-uDelta * 2.2);
    vec2 d = (vUv - uPointer) * vec2(uAspect, 1.);
    float stamp = exp(-dot(d, d) / .0032) * uInject;
    velocity += uVelocity * stamp * .65;
    pressure = min(1., pressure + stamp * .18);
    gl_FragColor = vec4(clamp(velocity, -.92, .92) * .5 + .5, pressure, 1.);
  }
`;

export const liquidFragment = `
  uniform sampler2D uFlow;
  uniform vec2 uResolution;
  uniform vec2 uFocus;
  uniform vec2 uPulseOrigin;
  uniform vec2 uCenter;
  uniform float uTime;
  uniform float uPulseAge;
  uniform float uDim;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
               mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
  }
  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;
    vec4 flow = texture2D(uFlow, uv);
    vec2 q = (uv - uCenter) * vec2(aspect, 1.);
    vec2 p = q * 3.4;
    p += (flow.rg - .5) * 1.1 + uFocus * .08;
    float t = uTime * .075;
    p += vec2(noise(p * .7 + vec2(t, -t)), noise(p * .6 - vec2(t, t + 5.3))) * .28;
    // Local refractive contours wrap the sculpture, leaving the headline quiet.
    float lens = length(p * vec2(.78, 1.1)) + sin(p.y * 2. + t) * .12;
    float band = abs(sin(lens * 5.2 - p.x * .7 + t));
    float broad = pow(1. - band, 4.);
    float edge = pow(1. - band, 42.);
    float sceneMask = exp(-dot(q, q) * 4.5);
    float innerQuiet = smoothstep(.12, .32, length(q));
    float ribbon = (broad * .017 + edge * .052) * sceneMask * innerQuiet;
    vec2 pulseDelta = (uv - uPulseOrigin) * vec2(aspect, 1.);
    float pulse = exp(-pow((length(pulseDelta) - max(0., uPulseAge) * .48) * 38., 2.))
                * exp(-max(0., uPulseAge) * 2.5) * step(0., uPulseAge);
    vec2 grid = fract((gl_FragCoord.xy + (flow.rg-.5) * 75.) / 14.) - .5;
    float dotField = (1. - smoothstep(.045, .095, length(grid))) * sceneMask;
    vec3 color = vec3(.0021, .0026, .0034);
    color += vec3(.86, .93, 1.) * ribbon;
    color += vec3(.65, .86, .30) * pulse * .045;
    color += vec3(.46, .59, .67) * dotField * (.009 + flow.b * .05);
    color += vec3(.72, .86, 1.) * flow.b * .018 * sceneMask;
    float grain = (hash(gl_FragCoord.xy) - .5) * .00065;
    color = max(vec3(0.), color + grain) * mix(1., .36, uDim);
    gl_FragColor = vec4(color, 1.);
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

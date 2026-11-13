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
    vec2 p = (uv - .5) * vec2(aspect, 1.) * 2.8;
    p += (flow.rg - .5) * 1.2 + uFocus * .13;
    float t = uTime * .105;
    vec2 warp = vec2(noise(p * .65 + vec2(t, -t * .7)),
                     noise(p * .7 + vec2(-t * .6, t + 5.3)));
    p += (warp - .5) * 1.2;
    float wave = sin(p.x * 1.8 + sin(p.y * 1.45 + t) * 1.2 - t)
               + cos(p.y * 2.1 - p.x * .42 + t * .8) * .67;
    float contour = wave + p.y * .32;
    float folds = abs(sin(contour * 2.1));
    float ribbon = pow(1. - folds, 9.);
    float silk = pow(1. - folds, 2.) * .16;
    float highlight = pow(1. - folds, 46.);
    vec2 pulseDelta = (uv - uPulseOrigin) * vec2(aspect, 1.);
    float pulseRadius = max(0., uPulseAge) * .7;
    float pulse = exp(-pow((length(pulseDelta) - pulseRadius) * 24., 2.))
                * exp(-max(0., uPulseAge) * 2.) * step(0., uPulseAge);
    float centralQuiet = 1. - .65 * exp(-dot((uv-uCenter)*vec2(aspect,1.),
                                           (uv-uCenter)*vec2(aspect,1.)) * 19.);
    float edge = 1. - smoothstep(.35, 1.15, length((uv-.5)*vec2(aspect*.65,1.)));
    float light = (ribbon * .037 + silk * .025 + highlight * .028) * centralQuiet * edge;
    vec3 color = vec3(.0026, .0032, .0045);
    color += vec3(.87, .94, 1.) * light;
    color += vec3(.66, .85, .48) * pulse * .04;
    color += vec3(.8, .88, 1.) * flow.b * .018;
    float grain = (hash(gl_FragCoord.xy + floor(uTime * 12.)) - .5) * .0011;
    color = max(vec3(0.), color + grain) * mix(1., .4, uDim);
    gl_FragColor = vec4(color, 1.);
    #include <colorspace_fragment>
  }
`;

/** Instancing morph math lives in the GPU, not thousands of per-frame JS matrices. */
export function configureVoxelMaterial(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    const declarations = `
      uniform float uProgress;
      attribute vec3 aStart;
      attribute vec3 aEnd;
      attribute vec3 aArc;
      attribute float aSeed;
      mat3 voxelRotation(float angle) {
        float c=cos(angle), s=sin(angle);
        return mat3(c,0.,-s, 0.,1.,0., s,0.,c);
      }
    `;
    shader.vertexShader = declarations + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      float voxelT = clamp((uProgress - aSeed * .09) / .91, 0., 1.);
      float disturbance = sin(voxelT * 3.14159265359);
      mat3 voxelTurn = voxelRotation(disturbance * (aSeed * 9. + 1.));
      vec3 objectNormal = voxelTurn * vec3(normal);
      #ifdef USE_TANGENT
        vec3 objectTangent = voxelTurn * vec3(tangent.xyz);
      #endif
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', `
      #include <color_vertex>
      #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
        vColor.rgb = mix(vColor.rgb, vec3(.82, .88, .9), smoothstep(.1, .8, clamp((uProgress - aSeed * .09) / .91, 0., 1.)));
      #endif
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = voxelTurn * vec3(position) * mix(1.25, .97, voxelT);
      transformed += mix(aStart, aEnd, voxelT) + aArc * disturbance;
    `);
  };
  material.customProgramCacheKey = () => 'qinan-chrome-voxel-v4';
}

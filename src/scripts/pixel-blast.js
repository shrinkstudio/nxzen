// -----------------------------------------
// PIXEL BLAST — Vanilla WebGL2
// Animated dither pattern with click ripples
// [data-pixel-blast] on container element
//
// Attrs (all optional):
//   data-pixel-blast-color="#8de971"
//   data-pixel-blast-shape="square|circle|triangle|diamond"
//   data-pixel-blast-size="3"
//   data-pixel-blast-scale="1.5"
//   data-pixel-blast-density="1"
//   data-pixel-blast-ripple-speed="0.35"
//   data-pixel-blast-ripple-thickness="0.1"
//   data-pixel-blast-edge-fade="0.55"
//   data-pixel-blast-center-fade="0.5"
//   data-pixel-blast-speed="0.5"
//   data-pixel-blast-ripples="true|false"
// -----------------------------------------

const SHAPE_MAP = { square: 0, circle: 1, triangle: 2, diamond: 3 };
const MAX_CLICKS = 10;

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform float uCenterFade;
uniform int   uShapeType;

const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;
const int MAX_CLICKS = 10;

uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0,0,0), vec3(1,57,113)));
  float n100 = hash11(dot(ip + vec3(1,0,0), vec3(1,57,113)));
  float n010 = hash11(dot(ip + vec3(0,1,0), vec3(1,57,113)));
  float n110 = hash11(dot(ip + vec3(1,1,0), vec3(1,57,113)));
  float n001 = hash11(dot(ip + vec3(0,0,1), vec3(1,57,113)));
  float n101 = hash11(dot(ip + vec3(1,0,1), vec3(1,57,113)));
  float n011 = hash11(dot(ip + vec3(0,1,1), vec3(1,57,113)));
  float n111 = hash11(dot(ip + vec3(1,1,1), vec3(1,57,113)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;

  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT = 1.0;
  const float dampR = 10.0;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  if (uCenterFade > 0.0) {
    vec2 center = gl_FragCoord.xy / uResolution - 0.5;
    center.x *= uResolution.x / uResolution.y;
    float dist = length(center);
    float cFade = smoothstep(0.0, uCenterFade, dist);
    M *= cFade;
  }

  vec3 color = uColor;
  vec3 srgbColor = mix(
    color * 12.92,
    1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, color)
  );

  fragColor = vec4(srgbColor, M);
}`;

// -----------------------------------------
// WebGL helpers
// -----------------------------------------

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[PixelBlast] shader:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('[PixelBlast] program:', gl.getProgramInfoLog(p));
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

function getUniforms(gl, program, names) {
  const u = {};
  names.forEach(n => { u[n] = gl.getUniformLocation(program, n); });
  return u;
}

function hexToLinear(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return [
    parseInt(hex.slice(0,2), 16) / 255,
    parseInt(hex.slice(2,4), 16) / 255,
    parseInt(hex.slice(4,6), 16) / 255,
  ].map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
}

// -----------------------------------------
// Instance management
// -----------------------------------------

let instances = [];

export function initPixelBlast(scope) {
  scope = scope || document;
  const els = scope.querySelectorAll('[data-pixel-blast]');
  if (!els.length) return;

  els.forEach(el => {
    try {
      instances.push(createInstance(el));
    } catch (e) {
      console.warn('[PixelBlast] init failed:', e);
    }
  });
}

export function destroyPixelBlast() {
  instances.forEach(inst => {
    cancelAnimationFrame(inst.raf);
    inst.ro.disconnect();
    inst.canvas.removeEventListener('pointerdown', inst.onPointer);
    const gl = inst.gl;
    gl.deleteProgram(inst.program);
    gl.deleteBuffer(inst.quadBuf);
    inst.canvas.remove();
  });
  instances = [];
}

// -----------------------------------------
// Core setup
// -----------------------------------------

function createInstance(el) {
  const d = el.dataset;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cfg = {
    color:            hexToLinear(d.pixelBlastColor || '#8de971'),
    shape:            SHAPE_MAP[d.pixelBlastShape] ?? 0,
    pixelSize:        (parseFloat(d.pixelBlastSize) || 3) * dpr,
    scale:            parseFloat(d.pixelBlastScale) || 1.5,
    density:          parseFloat(d.pixelBlastDensity) || 1,
    ripples:          d.pixelBlastRipples !== 'false',
    rippleSpeed:      parseFloat(d.pixelBlastRippleSpeed) || 0.35,
    rippleThickness:  parseFloat(d.pixelBlastRippleThickness) || 0.1,
    edgeFade:         parseFloat(d.pixelBlastEdgeFade) || 0.55,
    centerFade:       parseFloat(d.pixelBlastCenterFade) || 0.5,
    speed:            parseFloat(d.pixelBlastSpeed) || 0.5,
  };

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:auto;opacity:0;transition:opacity 0.6s ease;';
  el.style.position = el.style.position || 'relative';
  el.insertBefore(canvas, el.firstChild);

  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL2 not supported');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Quad buffer
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  // Program
  const program = linkProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) throw new Error('Shader compilation failed');

  const u = getUniforms(gl, program, [
    'uColor', 'uResolution', 'uTime', 'uPixelSize', 'uScale', 'uDensity',
    'uPixelJitter', 'uEnableRipples', 'uRippleSpeed', 'uRippleThickness',
    'uRippleIntensity', 'uEdgeFade', 'uCenterFade', 'uShapeType',
  ]);

  // Click uniforms (arrays)
  const clickPosLocs = [];
  const clickTimeLocs = [];
  for (let i = 0; i < MAX_CLICKS; i++) {
    clickPosLocs.push(gl.getUniformLocation(program, `uClickPos[${i}]`));
    clickTimeLocs.push(gl.getUniformLocation(program, `uClickTimes[${i}]`));
  }

  // Click state
  const clickPositions = Array.from({ length: MAX_CLICKS }, () => [-1, -1]);
  const clickTimes = new Float32Array(MAX_CLICKS);
  let clickIdx = 0;

  const onPointer = (e) => {
    if (!cfg.ripples) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    clickPositions[clickIdx] = [
      (e.clientX - rect.left) * sx,
      (rect.height - (e.clientY - rect.top)) * sy
    ];
    clickTimes[clickIdx] = time;
    clickIdx = (clickIdx + 1) % MAX_CLICKS;
  };
  canvas.addEventListener('pointerdown', onPointer, { passive: true });

  // Resize
  function resize() {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  resize();

  const ro = new ResizeObserver(() => resize());
  ro.observe(el);

  // Random time offset for visual variety
  const randomOffset = Math.random() * 1000;
  const startTime = performance.now();
  let time = 0;
  let raf = 0;
  let revealed = false;

  function bindQuad() {
    const loc = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const w = canvas.width, h = canvas.height;
    if (w === 0 || h === 0) return;

    time = randomOffset + ((performance.now() - startTime) / 1000) * cfg.speed;

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad();

    // Static uniforms
    gl.uniform3f(u.uColor, cfg.color[0], cfg.color[1], cfg.color[2]);
    gl.uniform2f(u.uResolution, w, h);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uPixelSize, cfg.pixelSize);
    gl.uniform1f(u.uScale, cfg.scale);
    gl.uniform1f(u.uDensity, cfg.density);
    gl.uniform1f(u.uPixelJitter, 0);
    gl.uniform1i(u.uEnableRipples, cfg.ripples ? 1 : 0);
    gl.uniform1f(u.uRippleSpeed, cfg.rippleSpeed);
    gl.uniform1f(u.uRippleThickness, cfg.rippleThickness);
    gl.uniform1f(u.uRippleIntensity, 1);
    gl.uniform1f(u.uEdgeFade, cfg.edgeFade);
    gl.uniform1f(u.uCenterFade, cfg.centerFade);
    gl.uniform1i(u.uShapeType, cfg.shape);

    // Click arrays
    for (let i = 0; i < MAX_CLICKS; i++) {
      gl.uniform2f(clickPosLocs[i], clickPositions[i][0], clickPositions[i][1]);
      gl.uniform1f(clickTimeLocs[i], clickTimes[i]);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (!revealed) {
      revealed = true;
      requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    }
  }

  raf = requestAnimationFrame(frame);

  return { canvas, gl, program, quadBuf, raf, ro, onPointer };
}

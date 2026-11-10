/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// مشهد تفاعلي مبني من الصور الأصلية (آدم، إدريس، صالح عليهم السلام): كل مرحلة صورة من صور المالك كما هي،
// والتحوّل بينها بسلاسة: الأجزاء الثابتة تمتزج بهدوء، والأجزاء المتغيرة (الشجرة تكبر، الناقة تظهر…) تنبت
// بحافة ذهبية مضيئة. فوقها حياة خفيفة: ذرات نور تطفو، لمعان النقاط المضيئة، ارتعاش اللهب، وعمق بسيط مع حركة الإصبع.
// نفس واجهة مشهد سيدنا نوح: morph / setTheme / dispose / debug. يتوقف لما يخرج من الشاشة أو تتقفل الصفحة.
import * as THREE from 'three';
import { IMAGE_SCENES } from './image-scenes.js';

// الصور المحمّلة تبقى في الذاكرة: إعادة بناء المشهد (تغيّر مستوى الجهاز) لا تعيد تنزيلها
THREE.Cache.enabled = true;

const TIERS = {
  high: { pixel: 2, dust: 170, size: 1600 },
  mid: { pixel: 1.5, dust: 110, size: 1600 },
  low: { pixel: 1, dust: 55, size: 960 },
  static: { pixel: 1.5, dust: 0, size: 1600 },
};
const TRANS = 2.4; // ثواني التحوّل
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

const vertex = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// الصور مربعة: نقصّها لتملأ الصندوق حول «نقطة التركيز» لكل مرحلة
const fragment = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uFrom, uTo;
uniform float uProg, uTime, uAspect, uZoom, uSeed, uShimmer, uMotion;
uniform vec2 uFocusFrom, uFocusTo, uPointer;
uniform vec4 uLights[4];
uniform vec3 uEdge;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec2 coverUv(vec2 focus, float depth) {
  vec2 scale = (uAspect > 1.0 ? vec2(1.0, 1.0 / uAspect) : vec2(uAspect, 1.0)) / uZoom;
  vec2 c = clamp(focus, scale * 0.5 + 0.03, 1.0 - scale * 0.5 - 0.03);
  // عمق بسيط: أسفل الصورة (الأرض القريبة) يتحرك أكثر من السماء البعيدة
  vec2 par = uPointer * (0.004 + 0.012 * depth) * uMotion;
  return c + (vUv - 0.5) * scale + par;
}

void main() {
  float k = uProg;
  vec2 focus = mix(uFocusFrom, uFocusTo, k);
  float depth = smoothstep(0.65, 0.0, vUv.y);
  vec2 uv = coverUv(focus, depth);
  vec3 a = texture2D(uFrom, uv).rgb;
  vec3 b = texture2D(uTo, uv).rgb;

  // التحوّل: الثابت يمتزج، والمتغير ينبت بقناع ضوضاء عضوي حافته ذهبية
  vec3 col = b;
  if (k < 1.0) { // بعد اكتمال التحوّل لا نحسب القناع (توفيرًا لمعالج الموبايل)
    float diff = smoothstep(0.06, 0.32, length(b - a));
    float n = fbm(uv * 4.0 + uSeed) * 0.75 + (1.0 - uv.y) * 0.25; // ينبت من الأسفل للأعلى مع تموّج
    float t = k * 1.3 - 0.15;
    float m = smoothstep(n - 0.09, n + 0.09, t);
    float w = mix(smoothstep(0.0, 1.0, k), m, diff);
    col = mix(a, b, w);
    float edge = (1.0 - abs(m * 2.0 - 1.0)) * diff * sin(3.14159 * k);
    col += uEdge * edge * 0.9;
    col *= 1.0 + 0.07 * sin(3.14159 * k); // نبضة نور خفيفة أثناء التحوّل
  }

  // لمعان النقاط المضيئة (الثمار، الشرر، النجوم): كل نقطة تومض بإيقاعها
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float tw = 0.5 + 0.5 * sin(uTime * 2.3 + noise(uv * 90.0) * 6.2831);
  col += col * pow(lum, 3.0) * tw * 0.22 * uShimmer * uMotion;

  // مصادر الضوء الحيّة (لهب، شعاع، شق الصخرة): ارتعاش ناعم حولها
  for (int i = 0; i < 4; i++) {
    vec4 L = uLights[i];
    if (L.w <= 0.0) continue;
    float d = distance(uv, L.xy) / L.z;
    float fl = 0.75 + 0.25 * sin(uTime * 7.0 + float(i) * 1.7) * sin(uTime * 3.1 + float(i));
    col += vec3(1.0, 0.72, 0.36) * exp(-d * d * 2.2) * L.w * mix(1.0, fl, uMotion);
  }
  // إطار خفيف يركّز النظر في الوسط
  float vig = smoothstep(1.15, 0.35, length((vUv - 0.5) * vec2(uAspect, 1.0) * 0.9));
  col *= mix(0.82, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}`;

// ذرات نور تطفو فوق الصورة (إحداثيات الشاشة مباشرة)
const dustVertex = /* glsl */`
attribute vec3 seed;
uniform float uTime, uPixel, uRise, uOn;
varying float vA;
void main() {
  float life = fract(seed.z + uTime * (0.03 + seed.y * 0.05) * uRise);
  float x = seed.x * 2.0 - 1.0 + sin(uTime * 0.6 + seed.z * 20.0) * 0.03;
  float y = mix(-1.05, 1.05, life);
  vA = sin(3.14159 * life) * uOn * (0.35 + 0.65 * seed.y);
  gl_Position = vec4(x, y, 0.0, 1.0);
  gl_PointSize = (1.5 + seed.y * 3.5) * uPixel;
}`;
const dustFragment = /* glsl */`
precision mediump float;
uniform vec3 uColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  gl_FragColor = vec4(uColor * a, a);
}`;

export function createImageScene(canvas, opts = {}) {
  const cfg = Object.prototype.hasOwnProperty.call(IMAGE_SCENES, opts.id) ? IMAGE_SCENES[opts.id] : null;
  if (!cfg) return null;
  const tierName = opts.tier && TIERS[opts.tier] ? opts.tier : 'mid';
  const reduced = tierName === 'static';
  const T = TIERS[tierName];
  // الموبايل (حتى بالعرض): أقصر ضلع للشاشة
  const phone = Math.min(screen.width || 9999, screen.height || 9999) <= 760;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch { return null; }
  // الألوان كما هي في الصور (بدون تحويل ألوان أو تظليل سينمائي)
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  let pixel = Math.min(window.devicePixelRatio || 1, T.pixel);
  renderer.setPixelRatio(pixel);

  const base = opts.base ?? (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
  const size = phone && tierName !== 'high' ? 960 : T.size;
  const loader = new THREE.TextureLoader();
  const blank = new THREE.DataTexture(new Uint8Array([18, 13, 51, 255]), 1, 1);
  blank.needsUpdate = true;
  const textures = cfg.steps.map(() => blank);
  const loaded = cfg.steps.map(() => false);
  let disposed = false;

  const U = {
    uFrom: { value: blank }, uTo: { value: blank }, uProg: { value: 1 }, uTime: { value: 0 }, uAspect: { value: 1 }, uZoom: { value: 1 },
    uSeed: { value: 0 }, uShimmer: { value: cfg.shimmer ?? 1 }, uMotion: { value: reduced ? 0 : 1 },
    uFocusFrom: { value: new THREE.Vector2(0.5, 0.5) }, uFocusTo: { value: new THREE.Vector2(0.5, 0.5) }, uPointer: { value: new THREE.Vector2() },
    uLights: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 0)) }, uEdge: { value: new THREE.Color().setStyle(cfg.edge || '#ffc861', THREE.LinearSRGBColorSpace) },
  };
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: U, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(quadGeo, quadMat);
  quad.frustumCulled = false;
  scene.add(quad);

  // ذرات النور
  const DN = T.dust;
  const dustU = { uTime: { value: 0 }, uPixel: { value: pixel }, uRise: { value: 1 }, uOn: { value: 1 }, uColor: { value: new THREE.Color().setStyle(cfg.dust?.color || '#ffd27a', THREE.LinearSRGBColorSpace) } };
  let dustGeo = null, dustMat = null;
  if (DN > 0) {
    dustGeo = new THREE.BufferGeometry();
    const seeds = new Float32Array(DN * 3);
    for (let i = 0; i < DN * 3; i++) seeds[i] = Math.random();
    dustGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
    dustMat = new THREE.ShaderMaterial({ vertexShader: dustVertex, fragmentShader: dustFragment, uniforms: dustU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    scene.add(dust);
  }

  // ---- الحالة ----
  let index = Math.max(0, Math.min(cfg.steps.length - 1, opts.initial || 0)), fromIdx = index, progress = 1;
  const stepFocus = (i) => cfg.steps[i].focus || [0.5, 0.5];
  function applyStep() {
    U.uFrom.value = textures[fromIdx]; U.uTo.value = textures[index];
    const f = stepFocus(fromIdx), t = stepFocus(index);
    U.uFocusFrom.value.set(f[0], 1 - f[1]); U.uFocusTo.value.set(t[0], 1 - t[1]);
    const lights = cfg.steps[index].lights || [];
    U.uLights.value.forEach((v, i) => { const L = lights[i]; if (L) v.set(L[0], 1 - L[1], L[2], L[3]); else v.set(0, 0, 1, 0); });
    const d = cfg.steps[index].dust ?? cfg.dust?.on ?? 1;
    dustU.uOn.value = d; dustU.uRise.value = cfg.dust?.rise ?? 1;
  }

  // صورة فشلت (انقطاع أو خطأ): نجرب المقاس الآخر مرة، وإلا نرجع للصورة العادية بدل صندوق فاضي
  const load = (i, sz, retry) => {
    loader.load(`${base}/scenes/${opts.id}/${i + 1}-${sz}.webp`, (tex) => {
      if (disposed) { tex.dispose(); return; }
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures[i] = tex; loaded[i] = true;
      applyStep();
      if (!running) draw(lastT); else kick();
    }, undefined, () => {
      if (disposed) return;
      if (retry) load(i, sz === 1600 ? 960 : 1600, false);
      else opts.onFail?.();
    });
  };
  cfg.steps.forEach((s, i) => load(i, size, true));

  // ---- المقاس والإصبع ----
  function resize() {
    const w = canvas.clientWidth || 360, h = canvas.clientHeight || 340;
    renderer.setSize(w, h, false);
    U.uAspect.value = w / h;
    dustU.uPixel.value = pixel;
    if (!running) draw(lastT);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => { pointer.tx = 0; pointer.ty = 0; };
  canvas.parentElement?.addEventListener('pointermove', onPointer);
  canvas.parentElement?.addEventListener('pointerleave', onLeave);
  canvas.parentElement?.addEventListener('pointerup', onLeave);

  let lastT = 0;
  function draw(t) {
    if (disposed) return;
    lastT = t;
    const k = ease(progress);
    U.uProg.value = k;
    U.uTime.value = dustU.uTime.value = t;
    // تقريب بطيء جدًا (Ken Burns) مع «نفَس» خفيف وقت التحوّل
    U.uZoom.value = reduced ? 1.02 : 1.03 + 0.015 * Math.sin(t * 0.12) + 0.025 * Math.sin(Math.PI * k) * (progress < 1 ? 1 : 0);
    const sway = reduced ? 0 : 0.35;
    U.uPointer.value.set(pointer.x + Math.sin(t * 0.21) * sway, pointer.y + Math.cos(t * 0.17) * sway * 0.6);
    renderer.render(scene, camera);
  }

  // ---- الحلقة ----
  const clock = new THREE.Clock();
  let running = !reduced, lost = false, visible = true, raf = 0, time = 0;
  const perf = { acc: 0, frames: 0, down: 0 };
  function frame() {
    raf = 0;
    if (!running || lost || !visible) return;
    const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
    time += dt;
    if (progress < 1) {
      progress = Math.min(1, progress + dt / TRANS);
      if (progress >= 1) { fromIdx = index; applyStep(); }
    }
    perf.acc += raw; perf.frames++;
    if (perf.acc > 2) { const avg = perf.acc / perf.frames; perf.acc = perf.frames = 0; if (avg > 0.034 && perf.down < 2) { perf.down++; pixel = Math.max(0.75, pixel * 0.72); renderer.setPixelRatio(pixel); resize(); } }
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    draw(time);
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!disposed && running && visible && !lost && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } };
  const io = window.IntersectionObserver ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: '80px' }) : null;
  if (io) io.observe(canvas);
  const onVis = () => { if (reduced) return; running = !document.hidden; kick(); };
  document.addEventListener('visibilitychange', onVis);
  const onLost = (e) => { e.preventDefault(); lost = true; };
  const onRestored = () => { if (disposed) return; lost = false; kick(); if (!running) draw(lastT); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  function go(i) {
    const next = Math.max(0, Math.min(cfg.steps.length - 1, i));
    if (next === index) return;
    if (progress < 1 && next === fromIdx) {
      // رجوع أثناء التحوّل: نعكسه من مكانه بدل قفزة
      fromIdx = index; index = next; progress = 1 - progress;
    } else {
      // ضغطة أثناء تحوّل: نبدأ من الصورة الأقرب لما يظهر الآن
      if (progress >= 1 || ease(progress) >= 0.5) fromIdx = index;
      index = next;
      U.uSeed.value = Math.random() * 50;
      progress = reduced ? 1 : 0;
    }
    if (reduced) fromIdx = index;
    applyStep();
    if (!running) draw(lastT); else kick();
  }

  resize();
  applyStep();
  if (running) kick(); else draw(lastT);

  return {
    tier: tierName,
    morph(id) { const n = Number(String(id).replace(/\D/g, '')) || 0; go(n); },
    setTheme() {},
    debug() { return { shape: `s${index}`, progress, loaded: loaded.filter(Boolean).length, total: cfg.steps.length, pixel, size, downgraded: perf.down, kind: 'image-scene', id: opts.id }; },
    dispose() {
      disposed = true; running = false; lost = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.parentElement?.removeEventListener('pointermove', onPointer);
      canvas.parentElement?.removeEventListener('pointerleave', onLeave);
      canvas.parentElement?.removeEventListener('pointerup', onLeave);
      textures.forEach((t) => t !== blank && t.dispose());
      blank.dispose(); quadGeo.dispose(); quadMat.dispose(); dustGeo?.dispose(); dustMat?.dispose();
      renderer.dispose();
    },
  };
}

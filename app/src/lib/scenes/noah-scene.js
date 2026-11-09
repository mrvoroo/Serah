/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// مشهد سفينة سيدنا نوح عليه السلام ثلاثي الأبعاد واقعي (مجسمات حقيقية لا نقاط) لصفحة النبي.
// مأخوذ من الصور المرجعية: سفينة خشبية طويلة بألواح متراكبة، مقدمة مرتفعة بعمود قائم، بيت طويل بسقف مائل
// ونوافذ مضيئة، حبال متدلية، موج عاصف ومطر وقمر، ثم استواؤها على قمة جبل الجودي مع شروق ذهبي.
// أربع مراحل بنفس ترتيب المحتوى المراجَع: الألواح ← الطوفان ← السفينة ← على الجودي. كلها رموز بلا أي أشخاص.
// كل الخامات مولّدة بالكود (لا تحميل صور)، والمشهد يتوقف لما يخرج من الشاشة أو تتقفل الصفحة.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// مقاس قماش الخشب: ١٠٢٤ للأجهزة القوية و٥١٢ للمتوسطة والضعيفة (ذاكرة آيفون القديم)
let WOOD = 1024;
const TIERS = {
  high: { pixel: 2, sea: 200, rain: 2600, spray: 420, aa: true, rocks: 150 },
  mid: { pixel: 1.5, sea: 150, rain: 1600, spray: 260, aa: true, rocks: 110 },
  low: { pixel: 1, sea: 96, rain: 700, spray: 120, aa: false, rocks: 70 },
  static: { pixel: 1.5, sea: 150, rain: 1400, spray: 0, aa: true, rocks: 110 },
};

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- شكل البدن ----------
// u من -1 (المؤخرة) إلى 1 (المقدمة)، s من 0 (القاع) إلى 1 (حافة السطح)
const HALF_L = 6, BEAM = 1.55, DECK_H = 2.35;
const halfBeam = (u) => Math.max(0.04, BEAM * (u > 0 ? Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 0.52) : Math.pow(Math.max(0, 1 - Math.pow(-u, 4)), 0.5)));
const hullTop = (u) => DECK_H + 0.22 * u * u + (u > 0 ? 0.6 : 0.28) * Math.pow(Math.abs(u), 4);
const hullBot = (u) => (u > 0 ? 1.15 : 0.75) * Math.pow(Math.abs(u), 3);
const section = (s) => Math.pow(Math.sin(Math.min(1, s * 1.45) * Math.PI / 2), 0.62);
function hullPoint(u, s, side, out = [0, 0, 0]) {
  const b = hullBot(u), t = hullTop(u);
  out[0] = u * HALF_L; out[1] = b + (t - b) * s; out[2] = side * halfBeam(u) * section(s);
  return out;
}

// ---------- الخامات المولّدة ----------
function woodCanvas(seed, { rows = 16, w = WOOD, h = WOOD, hue = 26, light = 0, vertical = false } = {}) {
  const r = rand(seed), c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#2c2016'; g.fillRect(0, 0, w, h);
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const y0 = i * rh;
    let x = -r() * 300;
    while (x < w) {
      const len = 260 + r() * 420;
      const l = 13 + r() * 11 + light, s = 22 + r() * 16;
      g.fillStyle = `hsl(${hue - 4 + r() * 10},${s}%,${l}%)`;
      g.fillRect(x, y0, len, rh);
      // عروق الخشب
      for (let k = 0; k < 9; k++) {
        const yy = y0 + r() * rh, a = 0.05 + r() * 0.12, dark = r() < 0.6;
        g.strokeStyle = dark ? `rgba(10,6,3,${a})` : `rgba(255,220,170,${a * 0.5})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        const ph = r() * TAU, amp = r() * 2.5;
        for (let xx = x; xx <= x + len; xx += 12) { const yv = yy + Math.sin(xx * 0.02 + ph) * amp; if (xx === x) g.moveTo(xx, yv); else g.lineTo(xx, yv); }
        g.stroke();
      }
      // عقدة خشب أحيانًا
      if (r() < 0.25) { const kx = x + r() * len, ky = y0 + rh * (0.3 + r() * 0.4); const gr = g.createRadialGradient(kx, ky, 0, kx, ky, rh * 0.35); gr.addColorStop(0, 'rgba(15,8,4,0.55)'); gr.addColorStop(1, 'rgba(15,8,4,0)'); g.fillStyle = gr; g.fillRect(kx - rh, ky - rh, rh * 2, rh * 2); }
      // فاصل نهاية اللوح + مسامير
      g.fillStyle = 'rgba(6,4,2,0.85)'; g.fillRect(x + len - 2, y0, 3, rh);
      g.fillStyle = 'rgba(30,24,20,0.9)';
      g.beginPath(); g.arc(x + len - 9, y0 + rh * 0.3, 2.4, 0, TAU); g.arc(x + len - 9, y0 + rh * 0.7, 2.4, 0, TAU); g.fill();
      x += len;
    }
    // فاصل بين الصفوف (حافة مشطوفة)
    g.fillStyle = 'rgba(4,2,1,0.9)'; g.fillRect(0, y0, w, 3);
    g.fillStyle = 'rgba(255,230,190,0.08)'; g.fillRect(0, y0 + 3, w, 2);
  }
  // تآكل وبقع رطوبة وخطوط مطر سايلة
  for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, rr = 20 + r() * 110; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(8,6,4,${0.08 + r() * 0.16})`); gr.addColorStop(1, 'rgba(8,6,4,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h * 0.6, len = 80 + r() * 300; const gr = g.createLinearGradient(x, y, x, y + len); gr.addColorStop(0, `rgba(5,4,3,${0.1 + r() * 0.15})`); gr.addColorStop(1, 'rgba(5,4,3,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 5, len); }
  if (!vertical) return c;
  const v = document.createElement('canvas'); v.width = h; v.height = w;
  const gv = v.getContext('2d'); gv.translate(h / 2, w / 2); gv.rotate(Math.PI / 2); gv.drawImage(c, -w / 2, -h / 2);
  return v;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(0.18, 'rgba(255,170,70,0.7)'); gr.addColorStop(0.5, 'rgba(255,130,40,0.15)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 38, 2, 32, 34, 40);
  gr.addColorStop(0, '#fff2c4'); gr.addColorStop(0.45, '#ffb44d'); gr.addColorStop(1, '#a0430e');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1a0f07'; g.fillRect(0, 0, 64, 5); g.fillRect(0, 59, 64, 5); g.fillRect(0, 0, 5, 64); g.fillRect(59, 0, 5, 64); g.fillRect(30, 0, 4, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- شيدرات مشتركة ----------
const NOISE = /* glsl */`
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
`;

// أمواج جرستنر: نفس المعادلة في الشيدر وفي حساب طفو السفينة على المعالج
const WAVES = [
  [1.0, 0.25, 11.0, 0.22], [0.55, 1.0, 6.5, 0.19], [-0.45, 0.9, 3.6, 0.16], [1.0, -0.55, 16.0, 0.16], [0.2, 1.0, 2.2, 0.12],
].map(([x, z, L, q]) => { const m = Math.hypot(x, z); return { dx: x / m, dz: z / m, k: TAU / L, c: Math.sqrt(9.8 / (TAU / L)) * 0.55, q }; });
const WAVE_GLSL = WAVES.map((w) => `W(p, vec2(${w.dx.toFixed(4)}, ${w.dz.toFixed(4)}), ${w.k.toFixed(4)}, ${w.c.toFixed(4)}, ${w.q.toFixed(3)}, disp, nrm);`).join('\n');

function waveHeight(x, z, t, amp) {
  let y = 0, ox = 0, oz = 0;
  for (let pass = 0; pass < 2; pass++) { // تقريب لمكان النقطة بعد الإزاحة الأفقية
    y = 0; let dx = 0, dz = 0;
    for (const w of WAVES) { const a = (w.q / w.k) * amp, f = w.k * (w.dx * (x - ox) + w.dz * (z - oz) - w.c * t); y += a * Math.sin(f); dx += w.dx * a * Math.cos(f) * 0.6; dz += w.dz * a * Math.cos(f) * 0.6; }
    ox = dx; oz = dz;
  }
  return y;
}

const seaVertex = /* glsl */`
  uniform float uTime, uAmp, uLevel;
  varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
  void W(vec2 p, vec2 d, float k, float c, float q, inout vec3 disp, inout vec3 nrm) {
    float a = (q / k) * uAmp, f = k * (dot(d, p) - c * uTime), co = cos(f), si = sin(f);
    disp += vec3(d.x * a * co * 0.6, a * si, d.y * a * co * 0.6);
    nrm += vec3(-d.x * k * a * co, 0.0, -d.y * k * a * co);
  }
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec2 p = wp.xz;
    vec3 disp = vec3(0.0), nrm = vec3(0.0, 1.0, 0.0);
    ${WAVE_GLSL}
    wp.xyz += disp; wp.y += uLevel;
    vWorld = wp.xyz; vNormal = normalize(nrm);
    vCrest = disp.y / max(0.001, uAmp * 1.6);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const seaFragment = /* glsl */`
  uniform float uTime, uAmp, uFoam, uFogD, uLight;
  uniform vec3 uDeep, uScatter, uSkyTop, uHorizon, uSunDir, uSunCol, uFoamCol;
  varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
  ${NOISE}
  void main() {
    vec2 q = vWorld.xz;
    float n1 = noise(q * 0.9 + uTime * vec2(0.35, 0.2)), n2 = noise(q * 2.3 - uTime * vec2(0.25, 0.4));
    float n4 = noise(q * 5.5 - uTime * vec2(0.6, 0.3)), n5 = noise(q * 5.5 + uTime * vec2(0.2, 0.7));
    vec3 N = normalize(vNormal + vec3(n1 - 0.5, 0.0, n2 - 0.5) * (0.2 + uAmp * 0.2) + vec3(n4 - 0.5, 0.0, n5 - 0.5) * 0.18);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uHorizon, uSkyTop, clamp(R.y * 1.8, 0.0, 1.0));
    float sd = max(dot(R, uSunDir), 0.0);
    vec3 spec = uSunCol * (pow(sd, 420.0) * 5.0 + pow(sd, 36.0) * 0.35);
    vec3 body = uDeep + uScatter * pow(clamp(vCrest * 0.6 + 0.45, 0.0, 1.0), 1.6) * (0.5 + 0.4 * uLight);
    vec3 col = mix(body, sky * 0.75, fres) + spec;
    // رغوة على قمم الموج وخطوط رغوة متشابكة مثل البحر الهائج
    float marble = 1.0 - abs(fbm(q * 0.7 + vec2(uTime * 0.05, 0.0)) * 2.0 - 1.0);
    float n3 = noise(q * 6.0 + uTime * 0.6);
    float crest = smoothstep(0.5, 0.95, vCrest + (n1 - 0.5) * 0.35 + (n3 - 0.5) * 0.25);
    float streak = smoothstep(0.93, 0.995, marble) * smoothstep(-0.2, 0.4, vCrest);
    float foam = crest * (0.55 + 0.45 * n3) + streak * 0.35;
    col = mix(col, uFoamCol * (0.45 + 0.4 * uLight), clamp(foam * uFoam, 0.0, 0.85));
    float d = length(vWorld - cameraPosition);
    col = mix(col, uHorizon, 1.0 - exp(-d * uFogD));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const skyVertex = /* glsl */`
  varying vec3 vDir;
  void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }
`;
const skyFragment = /* glsl */`
  uniform float uTime, uCloud, uSunSize, uGlow, uRays, uFlash, uDisc;
  uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunCol, uCloudDark, uCloudLit;
  varying vec3 vDir;
  ${NOISE}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, smoothstep(0.0, 0.42, h)) : mix(uHorizon, uBottom, clamp(-h * 4.0, 0.0, 1.0));
    float sd = dot(d, uSunDir);
    // هالة الشمس/القمر
    col += uSunCol * (pow(max(sd, 0.0), 24.0) * 0.3 + pow(max(sd, 0.0), 220.0) * 0.7) * uGlow;
    // أشعة الشروق
    vec3 t = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0))), b = cross(t, uSunDir);
    float ang = atan(dot(d, b), dot(d, t));
    float rays = smoothstep(0.35, 1.0, noise(vec2(ang * 9.0, uTime * 0.04))) * smoothstep(0.55, 0.995, sd) * smoothstep(-0.05, 0.25, h + 0.1);
    col += uSunCol * rays * uRays * 0.55;
    // قرص القمر/الشمس
    if (uDisc > 0.0) {
      float disc = smoothstep(cos(uSunSize), cos(uSunSize * 0.92), sd) * uDisc;
      float crater = 0.85 + 0.15 * fbm(vec2(dot(d, t), dot(d, b)) * 60.0);
      col = mix(col, uSunCol * 1.6 * crater, disc);
    }
    // سحب
    vec2 p = d.xz / (max(h, 0.0) + 0.12);
    float c1 = fbm(p * 0.55 + vec2(uTime * 0.012, uTime * 0.004));
    float c2 = fbm(p * 1.4 - vec2(uTime * 0.02, 0.0) + c1);
    float dens = smoothstep(0.55 - uCloud * 0.45, 0.95, c1 * 0.65 + c2 * 0.5) * smoothstep(-0.02, 0.12, h);
    float lit = clamp(0.5 + (c1 - fbm(p * 0.55 + uSunDir.xz * 0.25 + vec2(uTime * 0.012, 0.0))) * 3.0, 0.0, 1.0);
    vec3 cc = mix(uCloudDark, uCloudLit, lit * lit) + uSunCol * pow(max(sd, 0.0), 10.0) * 0.4 * uGlow;
    dens *= 1.0 - 0.75 * smoothstep(0.985, 0.9985, sd) * uDisc;
    col = mix(col, cc, dens * 0.92);
    col += vec3(0.55, 0.65, 0.85) * uFlash * (0.25 + dens);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const rainVertex = /* glsl */`
  attribute float aEnd;
  uniform float uTime, uSpeed;
  uniform vec3 uCenter;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * uSpeed, 16.0) - 3.0;
    p.x += p.y * 0.18;
    p += uCenter;
    p.y += aEnd * 0.55; p.x += aEnd * 0.1;
    vA = 1.0 - aEnd * 0.8;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;
const rainFragment = /* glsl */`
  uniform float uRain; uniform vec3 uCol; varying float vA;
  void main() { gl_FragColor = vec4(uCol, 0.32 * uRain * vA); }
`;

const fallVertex = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fallFragment = /* glsl */`
  uniform float uTime, uOn; varying vec2 vUv;
  ${NOISE}
  void main() {
    float s = noise(vec2(vUv.x * 14.0, vUv.y * 3.0 + uTime * 3.2)) * noise(vec2(vUv.x * 30.0, vUv.y * 6.0 + uTime * 4.5));
    float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.1, vUv.y);
    gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), clamp(s * 2.2, 0.0, 1.0) * edge * 0.75 * uOn);
  }
`;

// ---------- المراحل ----------
// water: منسوب الماء، amp: شدة الموج، rain: المطر، terrain: shore (شاطئ وبناء) أو peak (قمة الجودي)
const P = (o) => o;
const STEPS = [
  P({ // ١ الألواح: السفينة تكتمل على أرض صخرية تحت سماء عاصفة، وسقالات وسلم وألواح مكدسة
    terrain: 'shore', water: -1.05, amp: 0.55, foam: 0.6, rain: 0, wet: 0.1, windows: 0.8, hills: 1, build: 1,
    top: '#0f2d33', horizon: '#4f7c80', bottom: '#1a2a2c', cloud: 0.95, cloudDark: '#0e2328', cloudLit: '#5f8c8f',
    sunDir: [-0.5, 0.45, -0.75], sunCol: '#b9d9d6', glow: 0.35, rays: 0, disc: 0, sunSize: 0.05,
    hemiSky: '#7fa7aa', hemiGround: '#2a2620', hemi: 1.05, keyCol: '#bcd6d4', key: 1.5, keyDir: [-4, 7, 6], exposure: 1.05,
    deep: '#071b20', scatter: '#1f4d52', foamCol: '#d8e6e6', fog: 0.02, flash: 0,
    cam: [8.2, 1.35, 10.8], look: [0.6, 1.9, 0], fov: 38, fillCol: '#9fb9bb', fill: 0.9, hillCol: '#2c4448',
  }),
  P({ // ٢ الطوفان: الماء يعلو ويغطي الأرض، المطر منهمر، برق، والسفينة ترتفع مع الماء
    terrain: 'shore', water: 1.5, amp: 1.0, foam: 0.85, rain: 1, wet: 1, windows: 1, hills: 0.25, build: 0,
    top: '#0b2229', horizon: '#3c6268', bottom: '#122024', cloud: 1, cloudDark: '#0a1c21', cloudLit: '#4b7275',
    sunDir: [-0.4, 0.5, -0.8], sunCol: '#a9c7d0', glow: 0.25, rays: 0, disc: 0, sunSize: 0.05,
    hemiSky: '#6b9096', hemiGround: '#1c1e1e', hemi: 0.85, keyCol: '#a9c7d0', key: 1.3, keyDir: [-5, 7, 5], exposure: 1.08,
    deep: '#05141b', scatter: '#143a42', foamCol: '#e2eef0', fog: 0.024, flash: 1,
    cam: [7.4, 3.6, 11.6], look: [0.4, 2.2, 0], fov: 40, fillCol: '#8fadb4', fill: 0.85, hillCol: '#2a4044',
  }),
  P({ // ٣ السفينة: في عرض البحر ليلًا، قمر بين السحب، موج عالٍ ونوافذ مضيئة
    terrain: 'peak', water: 1.5, amp: 1.25, foam: 1, rain: 0.8, wet: 1, windows: 1, hills: 0, build: 0,
    top: '#03070f', horizon: '#1b2a3e', bottom: '#070d15', cloud: 0.8, cloudDark: '#070d18', cloudLit: '#46587a',
    sunDir: [0.3, 0.13, -0.95], sunCol: '#e4ecff', glow: 1, rays: 0, disc: 1, sunSize: 0.04,
    hemiSky: '#5a6c96', hemiGround: '#14161c', hemi: 0.8, keyCol: '#c9d8ff', key: 2.2, keyDir: [3, 4, -9], exposure: 1.05,
    deep: '#040d18', scatter: '#183852', foamCol: '#e8f0ff', fog: 0.016, flash: 0.15,
    cam: [-7.4, 3.8, 11.2], look: [0.2, 2.1, 0], fov: 40, fillCol: '#8ea4d0', fill: 1.0, hillCol: '#141e2c',
  }),
  P({ // ٤ على الجودي: الماء ينحسر والسفينة مستقرة على قمة صخرية، وشروق ذهبي بأشعة، وجبال ووديان
    terrain: 'peak', water: -9, amp: 0.25, foam: 0.25, rain: 0, wet: 0.15, windows: 0, hills: 1, build: 0,
    top: '#1b4670', horizon: '#f4b465', bottom: '#4d4a44', cloud: 0.6, cloudDark: '#2f4a63', cloudLit: '#ffcf8c',
    sunDir: [-0.2, 0.2, -0.96], sunCol: '#ffc874', glow: 1.4, rays: 1, disc: 1, sunSize: 0.03,
    hemiSky: '#bcd0e0', hemiGround: '#5a4a38', hemi: 1.05, keyCol: '#ffc77e', key: 3.4, keyDir: [-2, 3, -10], exposure: 1.0,
    deep: '#1c3346', scatter: '#6b8a94', foamCol: '#f6e6c8', fog: 0.01, flash: 0,
    cam: [8.6, 0.9, 10.4], look: [0.8, 2.1, 0], fov: 40, fillCol: '#ffe6c4', fill: 1.1, hillCol: '#4a5a70',
  }),
];
const COLOR_KEYS = ['hillCol', 'fillCol', 'top', 'horizon', 'bottom', 'cloudDark', 'cloudLit', 'sunCol', 'hemiSky', 'hemiGround', 'keyCol', 'deep', 'scatter', 'foamCol'];
const NUM_KEYS = ['water', 'amp', 'foam', 'rain', 'wet', 'windows', 'hills', 'build', 'cloud', 'glow', 'rays', 'disc', 'sunSize', 'hemi', 'key', 'fill', 'exposure', 'fog', 'flash', 'fov'];
const VEC_KEYS = ['sunDir', 'keyDir', 'cam', 'look'];

function makeState(st) {
  const o = { terrain: st.terrain };
  for (const k of NUM_KEYS) o[k] = st[k];
  for (const k of COLOR_KEYS) o[k] = new THREE.Color(st[k]);
  for (const k of VEC_KEYS) o[k] = new THREE.Vector3(...st[k]);
  return o;
}

export function createNoahScene(canvas, opts = {}) {
  const tierName = opts.tier && TIERS[opts.tier] ? opts.tier : 'mid';
  const reduced = tierName === 'static';
  const T = TIERS[tierName];
  WOOD = tierName === 'high' ? 1024 : 512;
  const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: T.aa && !(phone && tierName !== 'high'), alpha: false, powerPreference: 'high-performance' });
  } catch { return null; }
  let pixel = Math.min(window.devicePixelRatio || 1, T.pixel);
  renderer.setPixelRatio(pixel);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#4f7c80', 0.02);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // ---- الإضاءة ----
  const hemi = new THREE.HemisphereLight('#7fa7aa', '#2a2620', 1);
  const key = new THREE.DirectionalLight('#ffffff', 1.5);
  const rim = new THREE.DirectionalLight('#ffffff', 0.4);
  const lamp = new THREE.PointLight('#ff9a3c', 0, 9, 1.6);
  const fill = new THREE.DirectionalLight('#ffffff', 0.8);
  scene.add(hemi, key, rim, lamp, fill);

  // ---- السماء ----
  const skyU = {
    uTime: { value: 0 }, uCloud: { value: 1 }, uSunSize: { value: 0.05 }, uGlow: { value: 0.3 }, uRays: { value: 0 }, uFlash: { value: 0 }, uDisc: { value: 0 },
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 0.4, -1).normalize() },
    uSunCol: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() }, uCloudLit: { value: new THREE.Color() },
  };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(200, 48, 24)), keep(new THREE.ShaderMaterial({ vertexShader: skyVertex, fragmentShader: skyFragment, uniforms: skyU, side: THREE.BackSide, depthWrite: false })));
  sky.renderOrder = -10; sky.frustumCulled = false;
  scene.add(sky);

  // ---- البحر ----
  const seaU = {
    uTime: { value: 0 }, uAmp: { value: 1 }, uLevel: { value: 0 }, uFoam: { value: 1 }, uFogD: { value: 0.02 }, uLight: { value: 1 },
    uDeep: { value: new THREE.Color() }, uScatter: { value: new THREE.Color() }, uSkyTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uFoamCol: { value: new THREE.Color() },
  };
  const seaGeo = keep(new THREE.PlaneGeometry(160, 160, T.sea, T.sea));
  seaGeo.rotateX(-Math.PI / 2);
  // كثافة أعلى قرب السفينة: نضغط الشبكة نحو المركز
  { const p = seaGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 80, k = Math.pow(r, 1.8) * 80 / Math.max(1e-4, r * 80); p.setX(i, x * k); p.setZ(i, z * k); } }
  const sea = new THREE.Mesh(seaGeo, keep(new THREE.ShaderMaterial({ vertexShader: seaVertex, fragmentShader: seaFragment, uniforms: seaU })));
  sea.frustumCulled = false;
  scene.add(sea);

  // ---- الخشب ----
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (canvasEl, rx, ry) => { const t = keep(new THREE.CanvasTexture(canvasEl)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = Math.min(8, maxAniso); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const hullCanvas = woodCanvas(7, { rows: 18, light: 9 });
  const cabinCanvas = woodCanvas(19, { rows: 10, light: 11, vertical: true });
  const roofCanvas = woodCanvas(33, { rows: 22, light: 4, hue: 22 });
  const hullMap = tex(hullCanvas, 2.6, 1), cabinMap = tex(cabinCanvas, 6, 1), roofMap = tex(roofCanvas, 5, 1);
  const woodMat = (map, color = '#ffffff') => keep(new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.2, roughness: 0.8, metalness: 0, color }));
  const hullMat = woodMat(hullMap);
  const cabinMat = woodMat(cabinMap, '#e6dccf');
  const roofMat = woodMat(roofMap, '#bfb2a2');
  const beamMat = woodMat(tex(woodCanvas(51, { rows: 4, light: 8 }), 1, 1), '#d8cfc4');
  const woodMats = [hullMat, cabinMat, roofMat, beamMat];

  const ark = new THREE.Group();
  scene.add(ark);

  // البدن من مقاطع عرضية؛ الألواح تتبع انحناء خط السطح
  {
    const NU = 96, NS = 22, pos = [], uv = [], idx = [];
    const cols = NS * 2 + 1, tmp = [0, 0, 0];
    for (let i = 0; i <= NU; i++) {
      const u = -1 + (2 * i) / NU;
      for (let j = 0; j < cols; j++) {
        const side = j < NS ? -1 : 1, s = j < NS ? 1 - j / NS : (j - NS) / NS;
        hullPoint(u, s, side, tmp);
        pos.push(tmp[0], tmp[1], tmp[2]);
        uv.push((u + 1) / 2, s);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j, b = a + cols;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    ark.add(new THREE.Mesh(g, keep(Object.assign(hullMat.clone(), { side: THREE.DoubleSide }))));
    woodMats.push(ark.children[ark.children.length - 1].material);
  }
  // السطح
  {
    const NU = 60, NZ = 8, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = -0.985 + (1.97 * i) / NU, hb = halfBeam(u) * 0.98, y = hullTop(u) - 0.1;
      for (let j = 0; j <= NZ; j++) { pos.push(u * HALF_L, y, -hb + (2 * hb * j) / NZ); uv.push((u + 1) * 3, j / NZ); }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    ark.add(new THREE.Mesh(g, roofMat));
  }
  // حافة السطح والأحزمة الخشبية البارزة على جانبي البدن
  const tubeAlong = (s, out, radius, u0 = -0.99, u1 = 0.995) => {
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const u = u0 + ((u1 - u0) * i) / 40, p = hullPoint(u, s, side); pts.push(new THREE.Vector3(p[0], p[1], p[2] + side * out)); }
      ark.add(new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, radius, 6, false)), beamMat));
    }
  };
  tubeAlong(1, 0.02, 0.075);
  tubeAlong(0.78, 0.035, 0.05);
  tubeAlong(0.5, 0.03, 0.045);
  // عمود المقدمة القائم (أبرز ما في الصور) وعمود المؤخرة
  {
    const bowX = HALF_L - 0.02, y0 = hullBot(1) - 0.15, y1 = hullTop(1) + 1.25;
    const post = new THREE.Mesh(keep(new THREE.BoxGeometry(0.34, y1 - y0, 0.3)), beamMat);
    post.position.set(bowX + 0.08, (y0 + y1) / 2, 0); post.rotation.z = -0.07;
    ark.add(post);
    const sy0 = hullBot(-1) - 0.1, sy1 = hullTop(-1) + 0.45;
    const spost = new THREE.Mesh(keep(new THREE.BoxGeometry(0.28, sy1 - sy0, 0.26)), beamMat);
    spost.position.set(-HALF_L - 0.03, (sy0 + sy1) / 2, 0); spost.rotation.z = 0.05;
    ark.add(spost);
  }
  // البيت الطويل بسقف مائل، وبيت أعلى في الخلف
  const windowPts = [];
  const winMat = keep(new THREE.MeshBasicMaterial({ map: keep(windowTexture()), toneMapped: false, color: '#ffffff' }));
  disposables.push(winMat.map);
  const winGeo = keep(new THREE.PlaneGeometry(0.26, 0.22));
  const house = (x0, x1, hw, y0, wallH, ridge, every) => {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    const body = new THREE.Mesh(keep(new THREE.BoxGeometry(len, wallH, hw * 2)), cabinMat);
    body.position.set(cx, y0 + wallH / 2, 0); ark.add(body);
    const slope = Math.hypot(hw + 0.18, ridge), ang = Math.atan2(ridge, hw + 0.18);
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(keep(new THREE.BoxGeometry(len + 0.3, 0.07, slope)), roofMat);
      roof.position.set(cx, y0 + wallH + ridge / 2, side * (hw + 0.18) / 2); roof.rotation.x = side * ang; ark.add(roof);
    }
    // جملونات الطرفين
    const gs = new THREE.Shape(); gs.moveTo(-hw, 0); gs.lineTo(hw, 0); gs.lineTo(0, ridge); gs.closePath();
    const gg = keep(new THREE.ShapeGeometry(gs));
    for (const ex of [x0, x1]) { const m = new THREE.Mesh(gg, cabinMat); m.position.set(ex + (ex === x0 ? -0.001 : 0.001), y0 + wallH, 0); m.rotation.y = Math.PI / 2; m.material = cabinMat; ark.add(m); const m2 = m.clone(); m2.rotation.y = -Math.PI / 2; ark.add(m2); }
    // نوافذ مضيئة على الجانبين
    for (let x = x0 + 0.35; x < x1 - 0.2; x += every) for (const side of [-1, 1]) {
      const w = new THREE.Mesh(winGeo, winMat);
      w.position.set(x, y0 + wallH * 0.58, side * (hw + 0.006)); w.rotation.y = side > 0 ? 0 : Math.PI;
      ark.add(w); windowPts.push(x, y0 + wallH * 0.58, side * (hw + 0.12));
    }
  };
  house(-4.3, 3.7, 0.98, hullTop(0) - 0.12, 0.92, 0.42, 0.56);
  house(-3.3, -1.3, 0.72, hullTop(0) - 0.12 + 0.92, 0.75, 0.5, 0.62);
  // باب جانبي وإطاره
  {
    const p = hullPoint(-0.22, 0.62, 1);
    const door = new THREE.Mesh(keep(new THREE.BoxGeometry(0.85, 1.05, 0.08)), keep(new THREE.MeshStandardMaterial({ color: '#140c07', roughness: 0.9 })));
    door.position.set(p[0], p[1], p[2] + 0.04); ark.add(door);
    const frame = new THREE.Mesh(keep(new THREE.BoxGeometry(1.0, 1.2, 0.05)), beamMat); frame.position.set(p[0], p[1], p[2] + 0.015); ark.add(frame);
  }
  // توهج النوافذ (نقاط ضوء دافئ)
  const glowMap = keep(glowTexture());
  const winGlowMat = keep(new THREE.PointsMaterial({ map: glowMap, size: 1.1, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff' }));
  const winGlowGeo = keep(new THREE.BufferGeometry()); winGlowGeo.setAttribute('position', new THREE.Float32BufferAttribute(windowPts, 3));
  ark.add(new THREE.Points(winGlowGeo, winGlowMat));
  lamp.position.set(0, hullTop(0) + 0.5, 2.2); ark.add(lamp);

  // حبال متدلية على جانب البدن (تتبع سطحه) وحبال مربوطة للأرض
  const ropeMat = keep(new THREE.MeshStandardMaterial({ color: '#4a3726', roughness: 0.95 }));
  const swag = (ua, ub, sag, side) => {
    const pts = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30, u = lerp(ua, ub, t), s = 1 - sag * Math.sin(Math.PI * t), p = hullPoint(u, Math.max(0.05, s), side); pts.push(new THREE.Vector3(p[0], p[1] + 0.03, p[2] + side * 0.07)); }
    ark.add(new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.035, 5, false)), ropeMat));
  };
  swag(0.86, 0.5, 0.42, 1); swag(0.47, 0.08, 0.5, 1); swag(0.05, -0.38, 0.4, 1); swag(0.86, 0.45, 0.4, -1); swag(0.4, -0.1, 0.45, -1);
  const ropeDown = (u, to, side) => {
    const a = hullPoint(u, 1, side), b = new THREE.Vector3(...to), m = new THREE.Vector3((a[0] + b.x) / 2, Math.min(a[1], b.y) - 0.4, (a[2] + b.z) / 2 + side * 0.4);
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], a[1], a[2] + side * 0.07), m, b);
    const mesh = new THREE.Mesh(keep(new THREE.TubeGeometry(c, 40, 0.04, 5, false)), ropeMat);
    return mesh;
  };
  const mooring = new THREE.Group();
  mooring.add(ropeDown(0.72, [7.6, -0.1, 3.6], 1), ropeDown(0.25, [3.4, -0.2, 4.6], 1), ropeDown(-0.55, [-4.6, -0.15, 4.4], 1));
  ark.add(mooring);

  // شلالات ماء تنزل من حافة السطح وقت العاصفة
  const fallU = { uTime: { value: 0 }, uOn: { value: 0 } };
  const fallMat = keep(new THREE.ShaderMaterial({ vertexShader: fallVertex, fragmentShader: fallFragment, uniforms: fallU, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  for (const [u, w] of [[0.62, 0.35], [0.18, 0.28], [-0.25, 0.4], [-0.62, 0.3]]) {
    const top = hullPoint(u, 1, 1), h = top[1] - hullBot(u) - 0.2;
    const pl = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), fallMat);
    pl.position.set(top[0], top[1] - h / 2, top[2] + 0.1); ark.add(pl);
  }

  // ---- السقالات والسلم والألواح (مرحلة البناء) ----
  // في المشهد نفسه (مش جزء من السفينة) حتى تبقى ثابتة في الأرض لما تطفو السفينة
  const build = new THREE.Group(); scene.add(build);
  {
    const poleGeo = keep(new THREE.CylinderGeometry(0.05, 0.06, 1, 6));
    const pole = (a, b) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), m = new THREE.Mesh(poleGeo, beamMat); m.position.copy(va).lerp(vb, 0.5); m.scale.y = va.distanceTo(vb); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); build.add(m); };
    for (const u of [-0.78, -0.5, -0.05, 0.3, 0.58]) {
      const p = hullPoint(u, 1, 1), z = p[2] + 0.7;
      pole([p[0] - 0.35, -0.3, z], [p[0] - 0.35, p[1] + 0.2, z]); pole([p[0] + 0.35, -0.3, z], [p[0] + 0.35, p[1] + 0.2, z]);
      for (const y of [0.7, 1.5, 2.2]) if (y < p[1]) pole([p[0] - 0.4, y, z], [p[0] + 0.4, y, z]);
      pole([p[0] - 0.35, 0.1, z], [p[0] + 0.35, 1.4, z]);
    }
    // سلم مائل
    const L0 = hullPoint(0.42, 0.95, 1);
    const la = [L0[0] - 0.3, -0.3, L0[2] + 1.4], lb = [L0[0] - 0.3, L0[1], L0[2] + 0.1];
    pole(la, lb); pole([la[0] + 0.45, la[1], la[2]], [lb[0] + 0.45, lb[1], lb[2]]);
    for (let i = 1; i < 9; i++) { const t = i / 9, y = la[1] + (lb[1] - la[1]) * t, z = la[2] + (lb[2] - la[2]) * t; pole([la[0], y, z], [la[0] + 0.45, y, z]); }
    // منحدر خشبي للباب
    const d = hullPoint(-0.22, 0.4, 1);
    const ramp = new THREE.Mesh(keep(new THREE.BoxGeometry(0.9, 0.08, 3.0)), beamMat);
    ramp.position.set(d[0], d[1] * 0.5 - 0.25, d[2] + 1.35); ramp.rotation.x = 0.42; build.add(ramp);
    // ألواح مكدسة على الأرض
    const plank = keep(new THREE.BoxGeometry(2.4, 0.07, 0.3));
    const rp = rand(91);
    for (const [px, pz, n] of [[2.6, 3.4, 7], [-2.4, 3.9, 5], [5.8, 2.6, 4]]) for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(plank, beamMat); m.position.set(px + (rp() - 0.5) * 0.3, -0.25 + i * 0.075, pz + (rp() - 0.5) * 0.4); m.rotation.y = 0.3 + (rp() - 0.5) * 0.25; build.add(m);
    }
  }

  // ---- الصخور والأرض ----
  const rockGeo = keep(new THREE.IcosahedronGeometry(1, tierName === 'low' ? 2 : 3));
  {
    const p = rockGeo.attributes.position, v = new THREE.Vector3();
    // صخرة مكسّرة: أسطح مستوية مقطوعة + تموج متعدد الطبقات
    const planes = [[0.9, 0.3, 0.2, 0.72], [-0.4, 0.85, 0.3, 0.62], [0.2, -0.3, 0.95, 0.75], [-0.7, -0.2, -0.6, 0.7], [0.1, -0.95, 0.1, 0.55]].map(([x, y, z, d]) => [new THREE.Vector3(x, y, z).normalize(), d]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 + 0.16 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.cos(v.z * 3.7) + 0.07 * Math.sin(v.x * 11 + v.z * 9) + 0.035 * Math.sin(v.y * 23 + v.x * 17);
      v.multiplyScalar(k);
      for (const [n, d] of planes) { const e = v.dot(n); if (e > d) v.addScaledVector(n, (d - e) * 0.85); }
      p.setXYZ(i, v.x, v.y * 0.78, v.z);
    }
    rockGeo.computeVertexNormals();
  }
  const grain = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), rr = rand(77), img = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const x = i % 256, y = (i / 256) | 0, v = 150 + 50 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 3) * Math.sin(y * 0.05) + (rr() - 0.5) * 90; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = Math.max(0, Math.min(255, v)); img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${90 + rr() * 30},${100 + rr() * 30},${60 + rr() * 20},${0.15 + rr() * 0.2})`; g.beginPath(); g.arc(rr() * 256, rr() * 256, 4 + rr() * 22, 0, TAU); g.fill(); }
    const t = keep(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const rockMat = keep(new THREE.MeshStandardMaterial({ color: '#a39d94', map: grain, bumpMap: grain, bumpScale: 3, roughness: 0.75 }));
  const rocks = (count, seed, place) => {
    const m = new THREE.InstancedMesh(rockGeo, rockMat, count), r = rand(seed), o = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < count; i++) { place(r, o); o.updateMatrix(); m.setMatrixAt(i, o.matrix); col.setHSL(0.08 + r() * 0.05, 0.05 + r() * 0.07, 0.42 + r() * 0.24); m.setColorAt(i, col); }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return m;
  };
  // كومة الصخور تحت القاع: قممها تسند القاع المقوّس
  const underArk = (r, o) => {
    const u = (r() * 2 - 1) * 0.95, x = u * HALF_L, z = (r() * 2 - 1) * (halfBeam(u) + 1.2), s = 0.3 + r() * 0.75;
    o.position.set(x, Math.min(hullBot(u), 0.9) - s * 0.55 + (Math.abs(z) > halfBeam(u) * 0.6 ? 0.15 : -0.05), z);
    o.scale.set(s * (0.8 + r() * 0.6), s, s * (0.8 + r() * 0.6)); o.rotation.set(r() * TAU, r() * TAU, r() * TAU);
  };

  // أرض الشاطئ (مرحلة البناء والطوفان)
  const terrainMats = [];
  const terrainMesh = (size, seg, hf, color, moss) => {
    const g = keep(new THREE.PlaneGeometry(size, size, seg, seg)); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv, cols = new Float32Array(p.count * 3), c = new THREE.Color(), base = new THREE.Color(color), mossC = new THREE.Color(moss), rr = rand(5);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hf(x, z)); uv.setXY(i, x / 3, z / 3); }
    g.computeVertexNormals();
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const flat = n.getY(i), x = p.getX(i), z = p.getZ(i), m = Math.max(0, Math.sin(x * 0.7 + Math.sin(z * 0.9) * 2) * Math.cos(z * 0.6 - x * 0.2));
      c.copy(base).lerp(mossC, m * Math.max(0, flat - 0.75) * 2.4).multiplyScalar(0.8 + rr() * 0.35 - (1 - flat) * 0.35);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, bumpMap: grain, bumpScale: 4, roughness: 0.9 }));
    terrainMats.push(mat);
    return new THREE.Mesh(g, mat);
  };
  const nz = (x, z) => Math.sin(x * 0.9 + Math.sin(z * 0.7)) * 0.5 + Math.sin(z * 1.3 + x * 0.4) * 0.35 + Math.sin(x * 2.7 - z * 2.1) * 0.15;
  const shore = new THREE.Group(); scene.add(shore);
  shore.add(terrainMesh(70, tierName === 'low' ? 70 : 110, (x, z) => {
    const r = Math.hypot(x * 0.6, z), cliff = smooth((-x - 9) / 8) * 4.5; // جرف صخري على اليسار مثل الصور
    return -0.25 + nz(x, z) * 0.35 - smooth((x - 7) / 10) * 2.2 - smooth((r - 14) / 12) * 3 + cliff * (0.6 + 0.4 * nz(z, x));
  }, '#77726a', '#4f5a3a'));
  shore.add(rocks(T.rocks, 21, underArk));
  shore.add(rocks(Math.round(T.rocks * 0.5), 22, (r, o) => { const x = -9 + r() * 16, z = 2.5 + r() * 6, s = 0.15 + r() * 0.6; o.position.set(x, -0.3 + nz(x, z) * 0.3, z); o.scale.set(s * 1.3, s, s); o.rotation.set(r() * TAU, r() * TAU, r() * TAU); }));

  // قمة الجودي: صخور حادة تنحدر من تحت السفينة
  const peak = new THREE.Group(); scene.add(peak);
  peak.add(terrainMesh(90, tierName === 'low' ? 80 : 130, (x, z) => {
    const r = Math.hypot(x * 0.45, z * 0.9);
    return 0.1 - Math.pow(Math.max(0, r - 2.2), 1.35) * 0.95 + nz(x * 0.8, z * 0.8) * (0.25 + r * 0.06);
  }, '#8a857c', '#5d6b40'));
  peak.add(rocks(T.rocks, 31, underArk));
  peak.add(rocks(Math.round(T.rocks * 0.45), 32, (r, o) => { const a = r() * TAU, d = 2.5 + r() * 5, x = Math.cos(a) * d * 1.8, z = Math.sin(a) * d, s = 0.3 + r() * 0.9; o.position.set(x, 0.1 - Math.pow(Math.max(0, Math.hypot(x * 0.45, z * 0.9) - 2.2), 1.35) * 0.95, z); o.scale.set(s, s * 0.8, s); o.rotation.set(r() * TAU, r() * TAU, r() * TAU); }));

  // جبال بعيدة متدرجة في الضباب (الجودي والشاطئ)
  const hills = new THREE.Group(); scene.add(hills);
  const hillMats = [];
  for (let layer = 0; layer < 3; layer++) {
    const R = 55 + layer * 22, pos = [], idx = [], N = 140, r = rand(60 + layer);
    const ph = r() * TAU;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU, ridge = 1 - Math.abs(Math.sin(a * (3.1 + layer * 1.7) + ph)), h = (5 + layer * 7) * (0.25 + 0.75 * Math.pow(ridge, 2.2) * (0.6 + 0.4 * Math.sin(a * 5.3 + ph * 3)) + 0.08 * Math.sin(a * 41.0));
      pos.push(Math.cos(a) * R, -12, Math.sin(a) * R, Math.cos(a) * R, h - 4, Math.sin(a) * R);
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uOp: { value: 1 } }, side: THREE.DoubleSide, transparent: true, depthWrite: false,
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uCol, uHaze; uniform float uOp; varying float vY; void main(){ float k = smoothstep(-8.0, 10.0, vY); gl_FragColor = vec4(mix(uHaze, uCol, 0.35 + 0.65 * k), uOp);\n#include <colorspace_fragment>\n}',
    }));
    hillMats.push(m); const hm = new THREE.Mesh(g, m); hm.renderOrder = -5 + layer * -1; hills.add(hm);
  }

  // ---- المطر ----
  const rainGeo = keep(new THREE.BufferGeometry());
  {
    const n = T.rain, pos = new Float32Array(n * 6), end = new Float32Array(n * 2), r = rand(8);
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * 30, y = r() * 16, z = (r() - 0.5) * 20;
      pos.set([x, y, z, x, y, z], i * 6); end[i * 2] = 0; end[i * 2 + 1] = 1;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  }
  const rainU = { uTime: { value: 0 }, uSpeed: { value: 11 }, uCenter: { value: new THREE.Vector3() }, uRain: { value: 0 }, uCol: { value: new THREE.Color('#cfdde6') } };
  const rain = new THREE.LineSegments(rainGeo, keep(new THREE.ShaderMaterial({ vertexShader: rainVertex, fragmentShader: rainFragment, uniforms: rainU, transparent: true, depthWrite: false })));
  rain.frustumCulled = false; scene.add(rain);

  // ---- رذاذ الموج عند المقدمة والجوانب ----
  const SP = T.spray;
  const spPos = new Float32Array(Math.max(1, SP) * 3), spVel = new Float32Array(Math.max(1, SP) * 3), spLife = new Float32Array(Math.max(1, SP));
  const spGeo = keep(new THREE.BufferGeometry()); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sprayMat = keep(new THREE.PointsMaterial({ color: '#e8f2ff', size: 0.16, transparent: true, opacity: 0, depthWrite: false, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return keep(new THREE.CanvasTexture(c)); })() }));
  const spray = new THREE.Points(spGeo, sprayMat); spray.frustumCulled = false; scene.add(spray);
  const sr = rand(13);
  const spV = new THREE.Vector3();
  const emit = (i) => {
    const bow = sr() < 0.45, u = bow ? 0.85 + sr() * 0.15 : -0.9 + sr() * 1.7, side = sr() < 0.7 ? 1 : -1, p = hullPoint(u, 0.25, side);
    const wp = ark.localToWorld(spV.set(p[0] + (bow ? 0.3 : 0), p[1], p[2] + side * 0.15));
    spPos[i * 3] = wp.x; spPos[i * 3 + 1] = wp.y; spPos[i * 3 + 2] = wp.z;
    spVel[i * 3] = (bow ? 1.5 : 0) + (sr() - 0.5) * 1.5; spVel[i * 3 + 1] = (bow ? 3.2 : 1.8) + sr() * 2.5; spVel[i * 3 + 2] = side * (0.6 + sr() * 1.6);
    spLife[i] = 0.6 + sr() * 0.9;
  };
  for (let i = 0; i < SP; i++) spLife[i] = sr() * 1.2;

  // ---- الحالة والانتقال ----
  const steps = STEPS.map(makeState);
  const cur = makeState(STEPS[0]);
  let from = makeState(STEPS[0]), target = steps[0], index = 0, progress = 1, terrain = STEPS[0].terrain, dip = 0, swapAt = -1;
  const TRANS = 2.4;

  function apply(s, t) {
    skyU.uTop.value.copy(s.top); skyU.uHorizon.value.copy(s.horizon); skyU.uBottom.value.copy(s.bottom); skyU.uCloudDark.value.copy(s.cloudDark); skyU.uCloudLit.value.copy(s.cloudLit);
    skyU.uSunCol.value.copy(s.sunCol); skyU.uSunDir.value.copy(s.sunDir).normalize();
    skyU.uCloud.value = s.cloud; skyU.uGlow.value = s.glow; skyU.uRays.value = s.rays; skyU.uDisc.value = s.disc; skyU.uSunSize.value = s.sunSize;
    seaU.uDeep.value.copy(s.deep); seaU.uScatter.value.copy(s.scatter); seaU.uSkyTop.value.copy(s.top); seaU.uHorizon.value.copy(s.horizon); seaU.uSunDir.value.copy(skyU.uSunDir.value); seaU.uSunCol.value.copy(s.sunCol); seaU.uFoamCol.value.copy(s.foamCol);
    seaU.uAmp.value = s.amp; seaU.uLevel.value = s.water; seaU.uFoam.value = s.foam; seaU.uFogD.value = s.fog; seaU.uLight.value = Math.min(1, s.hemi);
    hemi.color.copy(s.hemiSky); hemi.groundColor.copy(s.hemiGround); hemi.intensity = s.hemi;
    key.color.copy(s.keyCol); key.intensity = s.key; key.position.copy(s.keyDir);
    fill.color.copy(s.fillCol); fill.intensity = s.fill;
    rim.color.copy(s.sunCol); rim.intensity = 0.3 + s.glow * 0.5; rim.position.copy(s.sunDir).multiplyScalar(10);
    rainU.uRain.value = s.rain;
    renderer.toneMappingExposure = s.exposure * (1 - dip);
    const wetR = lerp(0.85, 0.42, s.wet);
    for (const m of woodMats) m.roughness = wetR;
    rockMat.roughness = lerp(0.85, 0.35, s.wet);
    for (const m of terrainMats) m.roughness = lerp(0.95, 0.45, s.wet);
    winMat.color.setScalar(0.06 + s.windows * 1.1 * (0.92 + 0.08 * Math.sin(t * 9.0) * Math.sin(t * 5.3)));
    winGlowMat.opacity = s.windows * 0.85;
    lamp.intensity = s.windows * 2.2;
    for (let i = 0; i < hillMats.length; i++) {
      // الطبقة الأقرب أغمق والأبعد تذوب في الضباب
      hillMats[i].uniforms.uCol.value.copy(s.hillCol).lerp(s.horizon, 0.12 + i * 0.28);
      hillMats[i].uniforms.uHaze.value.copy(s.horizon);
      hillMats[i].uniforms.uOp.value = s.hills;
    }
    hills.visible = s.hills > 0.01;
    hills.position.y = lerp(-14, 0, s.hills);
    // السقالات والألواح تغرق تدريجيًا مع ارتفاع الطوفان
    build.visible = s.build > 0.01 && terrain === 'shore';
    build.position.y = lerp(-3.4, 0, s.build);
    mooring.visible = terrain === 'shore' && s.water < 0.2;
    scene.fog.color.copy(s.horizon); scene.fog.density = s.fog;
  }

  function lerpState(a, b, k, out) {
    for (const key of NUM_KEYS) out[key] = lerp(a[key], b[key], k);
    for (const key of COLOR_KEYS) out[key].copy(a[key]).lerp(b[key], k);
    for (const key of VEC_KEYS) out[key].copy(a[key]).lerp(b[key], k);
  }

  // ---- الحجم والكاميرا ----
  let aspect = 1;
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix();
    if (!running) draw(lastT);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => { const b = canvas.getBoundingClientRect(); pointer.tx = clamp01((e.clientX - b.left) / b.width) * 2 - 1; pointer.ty = clamp01((e.clientY - b.top) / b.height) * 2 - 1; };
  canvas.addEventListener('pointermove', onPointer, { passive: true });

  const camPos = new THREE.Vector3(), lookAt = new THREE.Vector3(), tmpV = new THREE.Vector3();
  function placeCamera(s, t) {
    // في الصندوق الضيق (موبايل) نبعد الكاميرا حتى تملأ السفينة العرض كله دون أن تُقص
    const fit = Math.pow(Math.max(1, 1.75 / aspect), 0.85);
    camera.fov = s.fov;
    lookAt.copy(s.look);
    camPos.copy(s.cam).sub(s.look).multiplyScalar(fit * lerp(0.88, 0.8, clamp01((aspect - 2.2) / 0.4))).add(s.look);
    camPos.x += Math.sin(t * 0.13) * 0.5 + pointer.x * 0.7; camPos.y += Math.sin(t * 0.21) * 0.15 - pointer.y * 0.35; camPos.z += Math.cos(t * 0.11) * 0.3;
    camera.position.copy(camPos); camera.lookAt(lookAt); camera.updateProjectionMatrix();
    fill.position.copy(camPos).sub(lookAt).normalize().multiplyScalar(10).add(tmpV.set(0, 4, 0));
    rainU.uCenter.value.set(camPos.x * 0.5, -1, camPos.z * 0.5);
  }

  // ---- الطفو ----
  const arkPose = { y: 0, rx: 0, rz: 0 };
  function floatArk(s, t, dt) {
    const ox = ark.position.x, oz = ark.position.z;
    const amp = s.amp;
    const hC = s.water + waveHeight(ox, oz, t, amp), hB = s.water + waveHeight(ox + 4.5, oz, t, amp), hS = s.water + waveHeight(ox - 4.5, oz, t, amp);
    const hL = s.water + waveHeight(ox, oz + 1.4, t, amp), hR = s.water + waveHeight(ox, oz - 1.4, t, amp);
    const draft = 1.05, floatY = (hC + hB + hS) / 3 - draft, float = clamp01((floatY - 0.0) / 0.35);
    const y = Math.max(0, floatY), rz = Math.atan2(hB - hS, 9) * float * 0.8, rx = Math.atan2(hL - hR, 2.8) * float * 0.35;
    const k = dt > 0 ? 1 - Math.exp(-dt * 3) : 1;
    arkPose.y += (y - arkPose.y) * k; arkPose.rz += (rz - arkPose.rz) * k; arkPose.rx += (rx - arkPose.rx) * k;
    ark.position.y = arkPose.y; ark.rotation.z = arkPose.rz; ark.rotation.x = arkPose.rx;
    return float;
  }

  // ---- البرق ----
  let flash = 0, nextFlash = 3;
  function updateFlash(s, t, dt) {
    if (reduced || dt === 0) { skyU.uFlash.value = 0; return; }
    if (s.flash > 0.05 && t > nextFlash) { flash = 1; nextFlash = t + 4 + Math.random() * 6 / s.flash; }
    flash *= Math.exp(-dt * 7);
    const f = flash * s.flash * (0.6 + 0.4 * Math.sin(t * 60));
    skyU.uFlash.value = f;
    hemi.intensity += f * 1.6;
  }

  function updateSpray(s, float, dt) {
    if (!SP) { spray.visible = false; return; }
    const on = float * clamp01((s.amp - 0.5) / 0.6) * (1 - dip);
    sprayMat.opacity = 0.75 * on;
    spray.visible = on > 0.02;
    if (!spray.visible) return;
    for (let i = 0; i < SP; i++) {
      spLife[i] -= dt;
      if (spLife[i] <= 0) { emit(i); continue; }
      spVel[i * 3 + 1] -= 9.8 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
    }
    spGeo.attributes.position.needsUpdate = true;
  }

  function setTerrain(name) {
    terrain = name;
    shore.visible = name === 'shore';
    peak.visible = name === 'peak';
  }
  // الأرض تحت الماء العالي لا تُرسم (وإلا تظهر الصخور في قاع الموج)
  const hideSunken = (s) => { if (s.water > 0.9 && s.amp > 0.8) { shore.visible = peak.visible = false; } else setTerrain(terrain); };
  setTerrain(terrain);

  let lastT = 4.2;
  function draw(t, dt = 0) {
    if (disposed) return;
    lastT = t;
    if (progress < 1) {
      const k = smooth(progress);
      lerpState(from, target, k, cur);
      if (swapAt >= 0 && progress >= swapAt) { setTerrain(target.terrain); swapAt = -1; }
      dip = swapAt === -2 ? Math.sin(Math.PI * progress) * 0.97 : 0;
      if (swapAt === -2 && progress >= 0.5 && terrain !== target.terrain) setTerrain(target.terrain);
    } else { lerpState(target, target, 1, cur); dip = 0; if (terrain !== target.terrain) setTerrain(target.terrain); }
    skyU.uTime.value = seaU.uTime.value = rainU.uTime.value = fallU.uTime.value = t;
    apply(cur, t);
    hideSunken(cur);
    placeCamera(cur, t);
    const float = floatArk(cur, t, dt);
    fallU.uOn.value = float * clamp01(cur.amp - 0.4) * Math.max(cur.rain, 0.4) * (1 - dip);
    rainU.uRain.value *= 1 - dip;
    updateFlash(cur, t, dt);
    updateSpray(cur, float, dt);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  // ---- الحلقة ----
  const clock = new THREE.Clock();
  let running = !reduced, lost = false, visible = true, raf = 0, time = 4.2;
  const perf = { acc: 0, frames: 0, down: 0 };
  function frame() {
    raf = 0;
    if (!running || lost || !visible) return;
    const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
    time += dt;
    if (progress < 1) progress = Math.min(1, progress + dt / TRANS);
    perf.acc += raw; perf.frames++;
    if (perf.acc > 2) { const avg = perf.acc / perf.frames; perf.acc = perf.frames = 0; if (avg > 0.034 && perf.down < 2) { perf.down++; pixel = Math.max(0.75, pixel * 0.72); renderer.setPixelRatio(pixel); resize(); } }
    pointer.x += (pointer.tx - pointer.x) * 0.04; pointer.y += (pointer.ty - pointer.y) * 0.04;
    draw(time, dt);
    raf = requestAnimationFrame(frame);
  }
  let disposed = false;
  const kick = () => { if (!disposed && running && visible && !lost && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } };
  const io = window.IntersectionObserver ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: '80px' }) : null;
  if (io) io.observe(canvas);
  const onVis = () => { if (reduced) return; running = !document.hidden; kick(); };
  document.addEventListener('visibilitychange', onVis);
  const onLost = (e) => { e.preventDefault(); lost = true; };
  const onRestored = () => { if (disposed) return; lost = false; kick(); if (!running) draw(lastT); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  function go(i, instant = false) {
    const next = Math.max(0, Math.min(steps.length - 1, i));
    if (next === index && progress >= 1) return;
    from = makeState(STEPS[index]); lerpState(cur, cur, 1, from); from.terrain = terrain;
    if (dip > 0) from.exposure *= 1 - dip;
    target = steps[next]; index = next;
    swapAt = -1;
    if (target.terrain !== terrain) {
      // التبديل بين الشاطئ والقمة يحصل تحت الماء لو المنسوب عالٍ، وإلا بإظلام سريع
      const covered = (k) => lerp(from.water, target.water, smooth(k)) > 0.9;
      let at = -1; for (let k = 0.05; k <= 0.95; k += 0.05) if (covered(k)) { at = k; break; }
      swapAt = at >= 0 ? at : -2;
    }
    progress = instant || reduced ? 1 : 0;
    if (progress >= 1) { setTerrain(target.terrain); swapAt = -1; }
    if (!running) draw(lastT); else kick();
  }

  resize();
  go(opts.initial || 0, true);
  if (running) kick(); else draw(lastT);

  return {
    tier: tierName,
    morph(id) { const n = Number(String(id).replace(/\D/g, '')) || 0; go(n); },
    setTheme() {},
    debug() { return { shape: `s${index}`, progress, terrain, water: cur.water, arkY: ark.position.y, pixel, downgraded: perf.down, kind: 'noah-scene' }; },
    dispose() {
      disposed = true; running = false; lost = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointermove', onPointer);
      scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      for (const d of disposables) d.dispose?.();
      renderer.dispose();
    },
  };
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// مشهد «واحة جزء عمّ» ثلاثي الأبعاد: يظهر للطفل لما المعلمة تؤكد حفظ السور السبع والثلاثين كلها.
// جزيرة رمل بكثبان ناعمة وعين ماء في المنتصف، و٣٧ نخلة (نخلة لكل سورة) تطلع واحدة بعد واحدة في دوامة
// حول العين، ثم تظهر عراجين التمر ويطلع نور ذهبي خفيف، والكاميرا تلف ببطء وقت الغروب.
// كل الخامات مولّدة بالكود (لا صور)، ونباتات وطبيعة فقط بلا أي أشخاص. المشهد يتوقف لما الصفحة تختفي.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const TIERS = {
  high: { pixel: 2, fronds: 14, shadows: true, aa: true, sparks: 420, dunes: 160 },
  mid: { pixel: 1.5, fronds: 11, shadows: true, aa: true, sparks: 260, dunes: 120 },
  low: { pixel: 1, fronds: 9, shadows: false, aa: false, sparks: 120, dunes: 80 },
  static: { pixel: 1.5, fronds: 11, shadows: true, aa: true, sparks: 0, dunes: 120 },
};
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOutBack = (x) => { const c1 = 1.5, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// ---------- خامات مرسومة بالكود ----------
// السعفة: عرق في المنتصف وخوص مائل على الجانبين (شفاف بين الخوص) — تعطي شكل سعف النخل الحقيقي
function frondTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.clearRect(0, 0, 512, 128);
  const n = 54;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), x = 14 + u * 486;
    const len = 58 * Math.sin(Math.min(1, u * 1.15) * Math.PI) * (0.82 + 0.18 * Math.sin(i * 1.7)) + 6;
    const grad = g.createLinearGradient(x, 64, x + 30, 64 - len);
    grad.addColorStop(0, '#2f6b22'); grad.addColorStop(1, u > 0.85 ? '#a3b84a' : '#6faa3a');
    g.strokeStyle = grad; g.lineCap = 'round';
    for (const side of [-1, 1]) {
      g.lineWidth = 6.4 - u * 3;
      g.beginPath(); g.moveTo(x, 64);
      g.quadraticCurveTo(x + len * 0.25, 64 + side * len * 0.55, x + len * 0.5, 64 + side * len);
      g.stroke();
    }
  }
  g.strokeStyle = '#4b3a12'; g.lineWidth = 4; g.beginPath(); g.moveTo(4, 64); g.lineTo(508, 64); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// حلقات جذع النخلة (ليف بني بخطوط أفقية)
function barkTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5530'; g.fillRect(0, 0, 64, 256);
  const r = rand(7);
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = '#4e3218'; g.fillRect(0, y, 64, 4 + r() * 2);
    g.fillStyle = 'rgba(190,140,80,0.35)'; g.fillRect(0, y + 6, 64, 3);
    for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(40,24,10,${0.15 + r() * 0.2})`; g.fillRect(r() * 64, y + r() * 16, 2, 6); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- هندسة النخلة ----------
function frondGeometry(len, width) {
  const geo = new THREE.PlaneGeometry(len, width, 18, 2);
  geo.translate(len / 2, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = x / len;
    // قوس لفوق ثم تتدلى، مع طيّة على شكل V حول العرق
    const lift = Math.sin(u * Math.PI * 0.72) * len * 0.3 - u * u * len * 0.5;
    p.setXYZ(i, x * (1 - u * 0.08), lift - Math.abs(y) * 0.32, y * (1 - u * 0.15));
  }
  geo.computeVertexNormals();
  return geo;
}
function trunkGeometry(h, lean, r0, seed) {
  const r = rand(seed), parts = [];
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.2, h * 0.5, lean * 0.1), new THREE.Vector3(lean, h, lean * 0.4));
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const a = curve.getPoint(t0), b = curve.getPoint(t1);
    const rad0 = r0 * (1 - t0 * 0.38) * (1 + (i === 0 ? 0.35 : 0)), rad1 = r0 * (1 - t1 * 0.38);
    const seg = new THREE.CylinderGeometry(rad1 * 1.06, rad0, a.distanceTo(b) * 1.04, 10, 1, false);
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    seg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    seg.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const uv = seg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, (uv.getY(k) + i) / 3 + r() * 0.01);
    parts.push(seg);
  }
  return { geo: mergeGeometries(parts), top: curve.getPoint(1) };
}

export function createOasisScene(canvas, { tier = 'mid', palms = 37 } = {}) {
  const T = TIERS[tier] || TIERS.mid, still = tier === 'static';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: T.aa, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.pixel));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = T.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const HORIZON = new THREE.Color('#f3a35b');
  scene.fog = new THREE.Fog(HORIZON, 45, 140);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // السماء وقت الغروب: أزرق غامق لفوق وبرتقالي ذهبي عند الأفق
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#1d2a6b') }, mid: { value: new THREE.Color('#7a4d9c') }, bottom: { value: HORIZON } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, h)) : mix(bottom, mid, smoothstep(-0.02, 0.18, h)); gl_FragColor = vec4(c, 1.0); }',
  }));
  scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(300, 32, 16)), skyMat));
  // قرص الشمس النازلة
  const sun = new THREE.Mesh(keep(new THREE.CircleGeometry(9, 32)), keep(new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false, transparent: true, opacity: 0.95 })));
  sun.position.set(-150, 18, -210); sun.lookAt(0, 0, 0); scene.add(sun);

  scene.add(new THREE.HemisphereLight('#ffe2b8', '#7a5a34', 0.95));
  const light = new THREE.DirectionalLight('#ffc98a', 2.4);
  light.position.set(-30, 26, -22); light.castShadow = T.shadows;
  light.shadow.mapSize.set(tier === 'high' ? 2048 : 1024, tier === 'high' ? 2048 : 1024);
  Object.assign(light.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  scene.add(light);

  // الأرض: جزيرة رمل بكثبان، وصحراء ممتدة حواليها
  // حلقات كثيرة (مش مثلثات كبيرة من المركز) عشان الكثبان تبان وحافة العين تبقى ناعمة
  const R = 24, ground = keep(new THREE.RingGeometry(0.01, R + 70, T.dunes, 72));
  ground.rotateX(-Math.PI / 2);
  {
    const p = ground.attributes.position, colors = [], cA = new THREE.Color('#e6c38a'), cB = new THREE.Color('#c99a5b'), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
      let y = Math.sin(x * 0.18) * Math.cos(z * 0.15) * 0.55 + Math.sin((x + z) * 0.07) * 0.9;
      y *= smooth((d - 6) / 6); // حوالين العين مستوية
      if (d < 5.8) y = -0.02;
      y += smooth((d - R) / 30) * 2.2 * (0.6 + 0.4 * Math.sin(Math.atan2(z, x) * 5));
      p.setY(i, y);
      tmp.copy(cA).lerp(cB, clamp01(0.5 + Math.sin(x * 0.4 + z * 0.3) * 0.3 + y * 0.12)); colors.push(tmp.r, tmp.g, tmp.b);
    }
    ground.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    ground.computeVertexNormals();
  }
  const groundMesh = new THREE.Mesh(ground, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })));
  groundMesh.receiveShadow = true; scene.add(groundMesh);

  // عين الماء: ماء صافي يلمع، وحافة رمل مبلول وأعشاب صغيرة
  const water = new THREE.Mesh(keep(new THREE.CircleGeometry(4.6, 64)), keep(new THREE.MeshStandardMaterial({ color: '#2a9fc4', roughness: 0.08, metalness: 0.35, emissive: '#0b4a63', emissiveIntensity: 0.35 })));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.06; scene.add(water);
  const rim = new THREE.Mesh(keep(new THREE.RingGeometry(4.5, 5.6, 64)), keep(new THREE.MeshStandardMaterial({ color: '#a77b44', roughness: 1 })));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.04; rim.receiveShadow = true; scene.add(rim);
  {
    const r = rand(11), blades = [];
    for (let i = 0; i < 90; i++) {
      const a = r() * TAU, d = 5.2 + r() * 1.4, b = new THREE.ConeGeometry(0.05, 0.45 + r() * 0.4, 3);
      b.translate(Math.cos(a) * d, 0.25, Math.sin(a) * d); blades.push(b);
    }
    const grass = new THREE.Mesh(keep(mergeGeometries(blades)), keep(new THREE.MeshStandardMaterial({ color: '#5f8f2e', roughness: 0.9 })));
    scene.add(grass);
  }

  // النخيل: ٣٧ نخلة في دوامة (الزاوية الذهبية) حوالين العين
  const frondTex = keep(frondTexture()), barkTex = keep(barkTexture());
  const barkMat = keep(new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.95 }));
  const frondMat = keep(new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }));
  const dateMat = keep(new THREE.MeshStandardMaterial({ color: '#b5651d', roughness: 0.45, metalness: 0.05 }));
  const palmsArr = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < palms; i++) {
    const r = rand(100 + i * 31);
    const d = 6.4 + Math.sqrt(i / palms) * 15.5, a = i * golden;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = 5.2 + r() * 3.2, lean = (r() - 0.5) * 1.6;
    const { geo: tGeo, top } = trunkGeometry(h, lean, 0.26 + r() * 0.06, 300 + i);
    keep(tGeo);
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = r() * TAU;
    const trunk = new THREE.Mesh(tGeo, barkMat); trunk.castShadow = T.shadows; group.add(trunk);
    // التاج: سعف حوالين القمة بزوايا وميول مختلفة
    const fronds = [];
    for (let k = 0; k < T.fronds; k++) {
      const f = frondGeometry(2.6 + r() * 1.1, 0.95 + r() * 0.25);
      const yaw = (k / T.fronds) * TAU + r() * 0.35, pitch = (k % 3 === 0 ? 0.35 : -0.05) + r() * 0.25;
      f.rotateZ(pitch); f.rotateY(yaw); f.translate(top.x, top.y, top.z);
      fronds.push(f);
    }
    const crown = new THREE.Mesh(keep(mergeGeometries(fronds)), frondMat); crown.castShadow = T.shadows; group.add(crown);
    // عراجين التمر تحت السعف (تظهر بعد ما الواحة تكتمل)
    const dates = [];
    for (let c = 0; c < 3; c++) {
      const ca = c * TAU / 3 + r();
      for (let k = 0; k < 14; k++) {
        const s = new THREE.SphereGeometry(0.075, 6, 5); s.scale(1, 1.3, 1);
        s.translate(top.x + Math.cos(ca) * (0.32 + r() * 0.12), top.y - 0.35 - r() * 0.55, top.z + Math.sin(ca) * (0.32 + r() * 0.12));
        dates.push(s);
      }
    }
    const dateMesh = new THREE.Mesh(keep(mergeGeometries(dates)), dateMat); dateMesh.scale.setScalar(0.001); group.add(dateMesh);
    group.scale.setScalar(0.001);
    scene.add(group);
    palmsArr.push({ group, dateMesh, start: 0.6 + i * 0.13 });
  }

  // نور ذهبي يطلع ببطء بعد اكتمال الواحة
  let sparks = null, sparkGeo = null;
  if (T.sparks) {
    const r = rand(5), pos = new Float32Array(T.sparks * 3), speed = new Float32Array(T.sparks);
    for (let i = 0; i < T.sparks; i++) { const a = r() * TAU, d = r() * 22; pos.set([Math.cos(a) * d, r() * 12, Math.sin(a) * d], i * 3); speed[i] = 0.3 + r() * 0.7; }
    sparkGeo = keep(new THREE.BufferGeometry()); sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sparks = new THREE.Points(sparkGeo, keep(new THREE.PointsMaterial({ color: '#ffd77a', size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    sparks.userData.speed = speed; scene.add(sparks);
  }

  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);

  const growEnd = 0.6 + palms * 0.13 + 1.4;
  let raf = 0, t0 = performance.now(), paused = false, stopped = false;
  const frame = (now) => {
    if (stopped) return;
    const t = still ? growEnd + 3 : (now - t0) / 1000;
    for (const p of palmsArr) {
      const k = easeOutBack((t - p.start) / 1.4);
      p.group.scale.setScalar(Math.max(0.001, k));
      p.dateMesh.scale.setScalar(Math.max(0.001, easeOutBack((t - growEnd) / 1.2)));
    }
    if (sparks) {
      const op = smooth((t - growEnd) / 2) * 0.9; sparks.material.opacity = op;
      const pa = sparkGeo.attributes.position, sp = sparks.userData.speed;
      for (let i = 0; i < sp.length; i++) { let y = pa.getY(i) + sp[i] * 0.016; if (y > 14) y = 0.2; pa.setY(i, y); }
      pa.needsUpdate = true;
    }
    // الكاميرا: تبدأ قريبة من العين وتبعد وتلف ببطء حوالين الواحة
    const pull = smooth(t / (growEnd + 1)), ang = 0.7 + t * 0.06;
    const rad = 20 + pull * 17, hgt = 7 + pull * 9;
    camera.position.set(Math.cos(ang) * rad, hgt, Math.sin(ang) * rad);
    camera.lookAt(0, 2.6, 0);
    water.material.emissiveIntensity = 0.3 + Math.sin(t * 1.6) * 0.06;
    renderer.render(scene, camera);
    if (!still && !paused) raf = requestAnimationFrame(frame);
  };
  const onVis = () => { if (document.hidden) { paused = true; cancelAnimationFrame(raf); } else if (paused) { paused = false; raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);

  return {
    replay() { t0 = performance.now(); if (still) frame(performance.now()); },
    dispose() {
      stopped = true; cancelAnimationFrame(raf); ro?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
    },
  };
}

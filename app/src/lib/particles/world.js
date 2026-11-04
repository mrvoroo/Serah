// @ts-nocheck
// خلفية الرحلة ثلاثية الأبعاد: آلاف النقاط المضيئة تتجمّع لكل محطة في اسم النبي بخط الرقعة
// وتحته رمزه (هلال ونجمة، سفينة نوح، عصا موسى والبحر المنشق، الكعبة، الحوت الأزرق، المصحف المغلق، المسجد النبوي، ذو الفقار، المصحف المفتوح)
// مع نجوم تدور حول المجسم وتتسارع مع سرعة السكرول.
import * as THREE from 'three';

export const SHAPES = ['crescent', 'ark', 'staff', 'kaaba', 'whale', 'yusuf_dream', 'mushaf', 'dome', 'sword', 'book'];
const TAU = Math.PI * 2;
const MORPH_SECONDS = 1.6;

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- الأشكال ----------
// كل شكل = أجزاء موزونة؛ معظم النقاط على الحواف والخطوط (مثل الرسم بالضوء) لا على الكتل.
// flow: 0 ثابت، 1 موج يتحرك أفقيًا، 2 ماء يصعد، 3 نور يصعد ببطء، 4 حروف الاسم، 5 جسم الحوت الأزرق
function buildShape(name, n, r) {
  const pos = new Float32Array(n * 3);
  const flow = new Float32Array(n);
  const g = () => (r() + r() + r() - 1.5) / 1.5;
  const J = (j) => g() * j;
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const seg = (a, b, j = 0.018) => () => { const p = lerp(a, b, r()); return [p[0] + J(j), p[1] + J(j), p[2] + J(j)]; };
  const curve = (f, j = 0.018) => () => { const p = f(r()); return [p[0] + J(j), p[1] + J(j), p[2] + J(j)]; };
  const many = (list) => () => list[Math.floor(r() * list.length)]();
  const boxEdges = (x0, x1, y0, y1, z0, z1, j) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    return many(e.map(([i, k]) => seg(c[i], c[k], j)));
  };
  const ground = (y, R) => () => { const th = r() * TAU, rad = Math.sqrt(r()) * R; return [Math.cos(th) * rad, y + J(0.02), Math.sin(th) * rad * 0.55]; };
  const dust = (R) => () => { const th = r() * TAU, ph = Math.acos(2 * r() - 1), rad = R * (0.55 + r() * 0.45); return [Math.sin(ph) * Math.cos(th) * rad, Math.cos(ph) * rad * 0.7, Math.sin(ph) * Math.sin(th) * rad * 0.6]; };
  const starOutline = (cx, cy, R) => () => {
    const k = Math.floor(r() * 10), a0 = -Math.PI / 2 + k * Math.PI / 5, a1 = a0 + Math.PI / 5;
    const r0 = k % 2 ? R * 0.42 : R, r1 = k % 2 ? R : R * 0.42, u = r();
    const x0 = Math.cos(a0) * r0, y0 = -Math.sin(a0) * r0, x1 = Math.cos(a1) * r1, y1 = -Math.sin(a1) * r1;
    return [cx + x0 + (x1 - x0) * u + J(0.012), cy + y0 + (y1 - y0) * u + J(0.012), J(0.03)];
  };
  let parts = [];

  if (name === 'crescent') {
    // هلال رقيق: حافتان بقوسين + نجمة خماسية بالخطوط
    // دائرة خارجية (0,0) نصف قطر 2 وداخلية (0.85,0) نصف قطر 1.75 تتقاطعان عند زاويتي الطرفين
    const outer = curve((u) => { const a = 0.338 * Math.PI + u * 1.324 * Math.PI; return [Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0]; }, 0.02);
    const inner = curve((u) => { const a = 0.477 * Math.PI + u * 1.046 * Math.PI; return [0.85 + Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0]; }, 0.02);
    const fill = () => { let x, y, t = 0; do { const th = r() * TAU, rad = 2.0 * Math.sqrt(r()); x = Math.cos(th) * rad; y = Math.sin(th) * rad; t++; } while (((x - 0.85) ** 2 + y * y) < 1.75 ** 2 && t < 40); return [x, y, J(0.1)]; };
    parts = [[0.30, outer], [0.16, inner], [0.16, fill], [0.12, starOutline(1.45, 0.35, 0.5)], [0.04, starOutline(2.25, -0.75, 0.24)], [0.22, dust(4.5)]];
  } else if (name === 'ark') {
    // السفينة: خطوط البدن (السطح، القاع، أضلاع) + بيت بالحواف + سقف + نوافذ، وموج خطي
    const L = 2.6;
    const deckY = (u) => -0.3 + Math.pow(Math.abs(u), 2.4) * 0.55;
    const deck = (side) => curve((t) => { const u = t * 2 - 1; return [u * L, deckY(u), side * 0.92 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), 3)))]; }, 0.016);
    const keel = curve((t) => { const u = t * 2 - 1; return [u * L * 0.92, -1.05 + Math.pow(Math.abs(u), 2.2) * 0.75, 0]; }, 0.016);
    const ribs = () => { const u = Math.round((r() * 2 - 1) * 6) / 6, side = r() < 0.5 ? -1 : 1, v = r(); const half = 0.92 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), 3)));
      const top = deckY(u), bot = -1.05 + Math.pow(Math.abs(u), 2.2) * 0.75; return [u * L, top + (bot - top) * v, side * half * Math.cos(v * Math.PI / 2) + J(0.01)]; };
    const house = boxEdges(-1.25, 1.25, -0.3, 0.45, -0.55, 0.55, 0.012);
    const roof = many([seg([-1.38, 0.45, -0.62], [-1.38, 0.95, 0]), seg([-1.38, 0.95, 0], [-1.38, 0.45, 0.62]), seg([1.38, 0.45, -0.62], [1.38, 0.95, 0]), seg([1.38, 0.95, 0], [1.38, 0.45, 0.62]), seg([-1.38, 0.95, 0], [1.38, 0.95, 0], 0.012)]);
    const windows = () => { const wx = [-0.85, -0.3, 0.3, 0.85][Math.floor(r() * 4)]; const a = r() * TAU; return [wx + Math.cos(a) * 0.1, 0.08 + Math.sin(a) * 0.1, 0.56]; };
    parts = [[0.12, deck(1)], [0.12, deck(-1)], [0.09, keel], [0.12, ribs], [0.12, house], [0.07, roof], [0.04, windows], [0.06, dust(4.2)]];
    parts.waves = [0.26, () => { const row = Math.floor(r() * 5), z = -1.8 + row * 0.9 + J(0.05); return [(r() - 0.5) * 12, -1.25 + J(0.02), z]; }];
  } else if (name === 'staff') {
    // العصا غصن شجرة: ساق متعرّج بلحاء وعُقد، فرعان صغيران وأوراق في الأعلى + ستائر ماء على الجانبين + طريق
    const c = (u) => [0.1 * Math.sin(u * 4.2 + 0.5) - 0.05 + 0.08 * u, -2.5 + u * 4.1, 0.06 * Math.sin(u * 3)];
    const rad = (u) => 0.11 * (1 - 0.45 * u) + 0.05 * Math.exp(-(((u - 0.3) / 0.03) ** 2)) + 0.04 * Math.exp(-(((u - 0.62) / 0.03) ** 2));
    const bark = () => { const u = r(), a = r() < 0.6 ? Math.floor(r() * 6) * TAU / 6 : r() * TAU, p = c(u), q = rad(u); return [p[0] + Math.cos(a) * q, p[1] + J(0.006), p[2] + Math.sin(a) * q]; };
    const knots = () => { const u = r() < 0.5 ? 0.3 : 0.62, a = r() * TAU, p = c(u), q = rad(u) * 1.05; return [p[0] + Math.cos(a) * q, p[1] + J(0.02), p[2] + Math.sin(a) * q]; };
    const twig = (u0, d, bend) => curve((u) => { const p = c(u0); return [p[0] + d[0] * u + Math.sin(u * Math.PI) * bend, p[1] + d[1] * u, p[2] + d[2] * u]; }, 0.01);
    const tip = (u0, d) => { const p = c(u0); return [p[0] + d[0], p[1] + d[1], p[2] + d[2]]; };
    const T1 = [0.6, 0.55, 0.1], T2 = [-0.42, 0.5, 0], T3 = [0.22, 0.58, -0.1];
    const twigs = many([twig(0.62, T1, -0.06), twig(1, T2, 0.05), twig(1, T3, -0.04)]);
    // ورقة: محيط بيضاوي مدبب + عرق في المنتصف
    const leaf = (base, ang) => many([
      curve((u) => { const t = u * TAU, lx = 0.26 + Math.cos(t) * 0.26, ly = Math.sin(t) * 0.1 * Math.sin(Math.acos(Math.cos(t)) || 0.0001); return [base[0] + lx * Math.cos(ang) - ly * Math.sin(ang), base[1] + lx * Math.sin(ang) + ly * Math.cos(ang), base[2] + J(0.01)]; }, 0.006),
      curve((u) => [base[0] + u * 0.52 * Math.cos(ang), base[1] + u * 0.52 * Math.sin(ang), base[2]], 0.005)
    ]);
    const b1 = tip(0.62, T1), b2 = tip(1, T2), b3 = tip(1, T3);
    const leaves = many([leaf(b1, 0.5), leaf(b1, 1.5), leaf(b2, 2.2), leaf(b2, 1.2), leaf(b3, 0.9), leaf(b3, 1.9), leaf(tip(0.8, [0, 0, 0]), 0.2)]);
    const halo = () => { const th = r() * TAU, q = 0.25 + r() * 0.35; return [Math.cos(th) * q, -0.6 + r() * 2.6, Math.sin(th) * q]; };
    const path = ground(-2.55, 1.0);
    parts = [[0.2, bark], [0.03, knots], [0.06, twigs], [0.13, leaves], [0.03, halo], [0.07, path], [0.06, dust(4.6)]];
    parts.water = [0.46, () => { const side = r() < 0.5 ? -1 : 1, col = Math.floor(r() * 6), x = side * (1.25 + col * 0.36); return [x, -2.5 + r() * 4.3, -1.4 + r() * 2.8]; }];
  } else if (name === 'kaaba') {
    // الكعبة: حواف المكعب + حزام الكسوة + الباب + أوجه خفيفة + حلقات المطاف
    const W = 1.15, D = 1.0, Y0 = -1.3, Y1 = 1.15;
    const cube = boxEdges(-W, W, Y0, Y1, -D, D, 0.012);
    const onFace = (y) => { const f = Math.floor(r() * 4), u = r() * 2 - 1; return f === 0 ? [u * W, y, D] : f === 1 ? [u * W, y, -D] : f === 2 ? [W, y, u * D] : [-W, y, u * D]; };
    const band = () => { const p = onFace(0.62 + r() * 0.2); return [p[0], p[1], p[2] + J(0.01)]; };
    const door = many([seg([0.25, -0.9, D + 0.01], [0.25, 0.15, D + 0.01]), seg([0.65, -0.9, D + 0.01], [0.65, 0.15, D + 0.01]), seg([0.25, 0.15, D + 0.01], [0.65, 0.15, D + 0.01]), seg([0.25, -0.9, D + 0.01], [0.65, -0.9, D + 0.01])]);
    const faces = () => { const p = onFace(Y0 + r() * (Y1 - Y0)); return [p[0], p[1], p[2]]; };
    const rings = () => { const R = [1.8, 2.3, 2.8][Math.floor(r() * 3)], a = r() * TAU; return [Math.cos(a) * R, Y0 - 0.05 + J(0.02), Math.sin(a) * R * 0.8]; };
    parts = [[0.22, cube], [0.12, band], [0.05, door], [0.12, faces], [0.22, rings], [0.07, dust(4.2)]];
  } else if (name === 'whale') {
    // الحوت الأزرق (نبي الله يونس) بنسب حقيقية: جسم طويل انسيابي برأس عريض مفلطح، أخاديد الحلق تحت الفك،
    // زعنفة ظهرية صغيرة جدًا قرب الذيل، زعنفتان صدريتان طويلتان، وزعنفة ذيل أفقية ضخمة، ونفثة ماء من فتحة التنفس.
    // النقاط الزرقاء (flow 5) تُلوَّن بالأزرق في الشيدر.
    const BLUE = 5, X0 = -2.7, L = 4.6, X1 = X0 + L;
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const rad = (t) => (t < 0.3 ? 0.1 + 0.48 * (0.55 + 0.45 * sm(0, 0.3, t)) : 0.1 + 0.48 * Math.pow(1 - sm(0.3, 1, t), 1.15)) * Math.sqrt(Math.min(1, t / 0.05 + 0.08));
    // الذيل مرفوع قليلًا كأنه في منتصف ضربة سباحة
    const cy = (t) => -0.04 * Math.sin(Math.PI * t) + 0.06 * t + 0.32 * sm(0.72, 1, t);
    const at = (t, a, k = 1) => { const q = rad(t) * k; return [X0 + t * L, cy(t) + Math.sin(a) * q * (0.7 + 0.12 * sm(0, 0.3, t)), Math.cos(a) * q * 0.95]; };
    const lines = () => at(r(), Math.floor(r() * 14) * TAU / 14);
    const rings = () => at(Math.floor(r() * 18) / 17, r() * TAU);
    const skin = () => at(r(), r() * TAU);
    const grooves = () => { const t = 0.03 + r() * 0.4, k = Math.floor(r() * 11); return at(t, -Math.PI / 2 + (k / 10 - 0.5) * 1.7 * (1 - t * 0.6), 1.015); };
    const mouth = () => { const t = r() * 0.2, s = r() < 0.5 ? -1 : 1, p = at(t, -0.3 + t * 1.2); return [p[0], p[1], p[2] * s]; };
    const eye = () => { const s = r() < 0.5 ? -1 : 1, a = r() * TAU, p = at(0.215, 0.05, 1.01); return [p[0] + Math.cos(a) * 0.045, p[1] + Math.sin(a) * 0.045, p[2] * s]; };
    const blowhole = () => { const t = 0.12 + r() * 0.05, p = at(t, Math.PI / 2, 1.06); return [p[0], p[1], p[2] + J(0.04)]; };
    const dorsal = () => { const u = r(), v = r(), p0 = at(0.74 + u * 0.08, Math.PI / 2); return [p0[0] + v * 0.08, p0[1] + (1 - u) * v * 0.16, J(0.01)]; };
    // الزعانف الصدرية: نصل طويل رفيع يتجه للخلف وللأسفل وللخارج
    const flipper = () => {
      const s = r() < 0.5 ? -1 : 1, u = r(), base = at(0.27, -0.9);
      const d = [0.62, -0.42, 0.66 * s], len = 1.15, w = 0.12 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7);
      const side = r() < 0.75 ? (r() < 0.5 ? -1 : 1) : (r() * 2 - 1);
      return [base[0] + d[0] * u * len + side * w * 0.55, base[1] + d[1] * u * len + side * w * 0.8, base[2] * s + d[2] * u * len];
    };
    // زعنفة الذيل: جناحان أفقيان كبيران بحافة أمامية محدبة وخلفية مقعرة وشق في المنتصف
    const fluke = () => {
      const s = r() < 0.5 ? -1 : 1, u = r(), y = cy(1), k = r();
      const lead = [X1 - 0.05 + 0.85 * Math.pow(u, 1.7), y, s * 1.5 * Math.sin(u * Math.PI / 2)];
      const trail = [X1 + 0.66 - 0.12 * Math.sin(u * Math.PI) + 0.24 * u, y, s * 1.5 * u];
      if (k < 0.7) { const e = k < 0.35 ? lead : trail; return [e[0] + J(0.01), e[1] - Math.abs(e[2]) * 0.06 + J(0.01), e[2]]; }
      const v = r(); return [lead[0] + (trail[0] - lead[0]) * v, y - Math.abs(lead[2]) * 0.06 + J(0.012), lead[2] + (trail[2] - lead[2]) * v];
    };
    const peduncle = () => { const t = 0.9 + r() * 0.1, a = r() * TAU; const p = at(t, a); return [p[0], p[1], p[2] * 0.6]; };
    const spout = () => { const v = r(), p = at(0.14, Math.PI / 2), spread = 0.05 + v * 0.35; const a = r() * TAU; return [p[0] + Math.cos(a) * spread * 0.5 - v * 0.15, p[1] + 0.1 + v * 1.1, Math.sin(a) * spread]; };
    parts = [[0.18, lines, BLUE], [0.09, rings, BLUE], [0.09, skin, BLUE], [0.09, grooves, BLUE], [0.025, mouth, BLUE], [0.012, eye], [0.01, blowhole, BLUE],
      [0.02, dorsal, BLUE], [0.1, flipper, BLUE], [0.2, fluke, BLUE], [0.03, peduncle, BLUE], [0.04, dust(4.0)]];
    parts.light = [0.07, spout];
  } else if (name === 'mushaf') {
    // مصحف مغلق واقف (مختلف عن المصحف المفتوح على الرحل): غلاف بإطارين وزخارف أركان،
    // نجمة ثمانية في دائرة في المنتصف، لسان التجليد على الحافة، أوراق الحافة، أشرطة الكعب، ونور يصعد من خلفه
    const W = 0.8, H = 1.1, T = 0.21, F = T + 0.006;
    const cover = boxEdges(-W, W, -H, H, -T, T, 0.01);
    const rect = (i) => many([seg([-W + i, -H + i, F], [W - i, -H + i, F], 0.006), seg([W - i, -H + i, F], [W - i, H - i, F], 0.006), seg([W - i, H - i, F], [-W + i, H - i, F], 0.006), seg([-W + i, H - i, F], [-W + i, -H + i, F], 0.006)]);
    const frames = many([rect(0.1), rect(0.17)]);
    const star8 = (R) => () => { const sq = Math.floor(r() * 2), k = Math.floor(r() * 4), u = r(); const a0 = sq * Math.PI / 4 + k * Math.PI / 2, a1 = a0 + Math.PI / 2; return [Math.cos(a0) * R + (Math.cos(a1) - Math.cos(a0)) * R * u, Math.sin(a0) * R + (Math.sin(a1) - Math.sin(a0)) * R * u, F + J(0.006)]; };
    const ring = (R) => curve((u) => [Math.cos(u * TAU) * R, Math.sin(u * TAU) * R, F], 0.006);
    const medallion = many([star8(0.4), star8(0.24), ring(0.5), ring(0.12)]);
    const corners = () => { const cx = r() < 0.5 ? -1 : 1, cyy = r() < 0.5 ? -1 : 1, a = r() * Math.PI / 2, R = 0.2; const ox = cx * (W - 0.17), oy = cyy * (H - 0.17); return [ox - cx * Math.cos(a) * R, oy - cyy * Math.sin(a) * R, F]; };
    const flap = many([seg([W, 0.55, F], [W - 0.32, 0, F], 0.006), seg([W - 0.32, 0, F], [W, -0.55, F], 0.006)]);
    const pages = () => { if (r() < 0.6) { const z = -T + 0.03 + Math.floor(r() * 8) / 7 * (2 * T - 0.06); return [W - 0.02, -H + 0.04 + r() * (2 * H - 0.08), z]; } const z = -T + 0.03 + Math.floor(r() * 8) / 7 * (2 * T - 0.06); return [-W + 0.04 + r() * (2 * W - 0.08), H - 0.02, z]; };
    const spine = () => { const y = -H + 0.25 + Math.floor(r() * 5) * ((2 * H - 0.5) / 4), a = r() * Math.PI; return [-W - Math.sin(a) * 0.05, y + J(0.01), Math.cos(a) * T]; };
    parts = [[0.14, cover], [0.13, frames], [0.18, medallion], [0.06, corners], [0.04, flap], [0.12, pages], [0.06, spine], [0.07, dust(4.0)]];
    parts.light = [0.1, () => { const v = r(), th = r() * TAU, q = Math.sqrt(r()) * (0.4 + v * 0.7); return [Math.cos(th) * q, 0.6 + v * 1.6, -0.5 + Math.sin(th) * q * 0.4]; }];
  } else if (name === 'dome') {
    // المسجد النبوي: مبنى بالحواف + أسطوانة + قبة بخطوط الطول والعرض + هلال صغير + مئذنة
    const base = boxEdges(-1.4, 1.4, -2.0, -0.6, -0.9, 0.9, 0.012);
    const drum = () => { const a = r() * TAU, y = r() < 0.5 ? [-0.6, -0.2][Math.floor(r() * 2)] : -0.6 + r() * 0.4; return [Math.cos(a) * 0.8, y, Math.sin(a) * 0.8]; };
    const R = 0.85;
    const dome = () => { const meridian = r() < 0.55; const th = meridian ? r() * Math.PI / 2 : [0.5, 1.0, 1.3][Math.floor(r() * 3)]; const ph = meridian ? Math.floor(r() * 10) * TAU / 10 : r() * TAU; return [R * Math.sin(th) * Math.cos(ph), -0.2 + 1.15 * R * Math.cos(th), R * Math.sin(th) * Math.sin(ph)]; };
    const finial = many([seg([0, 0.78, 0], [0, 1.12, 0], 0.008), curve((u) => { const a = -0.9 + u * 4.2; return [Math.cos(a) * 0.13, 1.28 + Math.sin(a) * 0.13, 0]; }, 0.008)]);
    const MX = 2.0;
    const minaret = () => { const k = r(); if (k < 0.55) { const a = Math.floor(r() * 6) * TAU / 6; return [MX + Math.cos(a) * 0.14, -2.0 + r() * 3.2, Math.sin(a) * 0.14]; } if (k < 0.75) { const a = r() * TAU; return [MX + Math.cos(a) * 0.26, 0.6, Math.sin(a) * 0.26]; } const v = r(), a = r() * TAU; return [MX + Math.cos(a) * 0.15 * (1 - v), 1.2 + v * 0.5, Math.sin(a) * 0.15 * (1 - v)]; };
    parts = [[0.18, base], [0.1, drum], [0.3, dome], [0.05, finial], [0.17, minaret], [0.07, dust(4.2)]];
  } else if (name === 'sword') {
    // ذو الفقار: حافتا النصل + خط المنتصف + طرفان متفرعان + واقٍ مقوّس + مقبض بحلقات + كرة
    const w = (y) => 0.2 - (y + 0.55) * 0.012;
    const edge = (side) => curve((u) => { const y = -0.55 + u * 2.95; return [side * w(y), y, 0]; }, 0.01);
    const fuller = curve((u) => [0, -0.4 + u * 2.6, 0.02], 0.008);
    const prong = (side) => many([
      curve((u) => [side * (0.02 + u * 0.24), 2.4 + u * 0.95, 0], 0.01),
      curve((u) => [side * (0.17 + u * 0.12), 2.4 + u * 0.95, 0], 0.01)
    ]);
    const guard = curve((u) => { const x = (u * 2 - 1) * 0.85; return [x, -0.6 + Math.pow(Math.abs(x), 2) * 0.22, 0]; }, 0.014);
    const grip = () => { const ring = Math.floor(r() * 8), y = -0.72 - ring * 0.15, th = r() * TAU; return [Math.cos(th) * 0.1, y + J(0.01), Math.sin(th) * 0.1]; };
    const pommel = () => { const th = r() * TAU, ph = Math.acos(2 * r() - 1); return [Math.sin(ph) * Math.cos(th) * 0.16, -2.0 + Math.cos(ph) * 0.16, Math.sin(ph) * Math.sin(th) * 0.16]; };
    parts = [[0.17, edge(1)], [0.17, edge(-1)], [0.07, fuller], [0.09, prong(1)], [0.09, prong(-1)], [0.12, guard], [0.12, grip], [0.05, pommel], [0.12, dust(4.0)]];
  } else if (name === 'yusuf_dream') {
    // رؤيا يوسف: الشمس بأشعتها + القمر هلالًا + أحد عشر كوكبًا في قوس فوقهما (نور يصعد من الشمس)
    const SX = -1.15, SY = -0.35, SR = 0.72;
    const sunRing = curve((u) => [SX + Math.cos(u * TAU) * SR, SY + Math.sin(u * TAU) * SR, 0], 0.016);
    const sunDisk = () => { const a = r() * TAU, q = Math.sqrt(r()) * SR * 0.92; return [SX + Math.cos(a) * q, SY + Math.sin(a) * q, J(0.05)]; };
    const rays = () => { const a = Math.floor(r() * 12) * TAU / 12 + J(0.02), q = SR * (1.2 + r() * 0.45); return [SX + Math.cos(a) * q, SY + Math.sin(a) * q, J(0.02)]; };
    const MX = 1.35, MY = -0.3;
    const moonOuter = curve((u) => { const a = 0.338 * Math.PI + u * 1.324 * Math.PI; return [MX + Math.cos(a) * 0.78, MY + Math.sin(a) * 0.78, 0]; }, 0.014);
    const moonInner = curve((u) => { const a = 0.477 * Math.PI + u * 1.046 * Math.PI; return [MX + 0.33 + Math.cos(a) * 0.68, MY + Math.sin(a) * 0.68, 0]; }, 0.014);
    // 11 كوكبًا على قوس فوق الشمس والقمر
    const stars = many(Array.from({ length: 11 }, (_, k) => { const a = Math.PI * (0.08 + k * 0.084); return starOutline(Math.cos(a) * 2.45, 0.05 + Math.sin(a) * 1.75, k % 2 ? 0.17 : 0.21); }));
    parts = [[0.14, sunRing], [0.07, sunDisk], [0.1, rays], [0.13, moonOuter], [0.08, moonInner], [0.38, stars], [0.06, dust(4.2)]];
    parts.light = [0.06, () => { const v = r(), a = r() * TAU, q = Math.sqrt(r()) * SR * 0.6; return [SX + Math.cos(a) * q, SY + 0.2 + v * 1.2, Math.sin(a) * q * 0.5]; }];
  } else if (name === 'book') {
    // مصحف مفتوح: حواف الصفحتين المنحنية + سطور + رحل بخطوط X + نور خفيف
    const pageY = (u) => 0.1 + u * 0.32 + Math.sin(u * Math.PI) * 0.16;
    const pageEdge = (side) => many([
      curve((u) => [side * u * 1.9, pageY(u), -0.85]), curve((u) => [side * u * 1.9, pageY(u), 0.85]),
      curve((u) => [side * 1.9, pageY(1), -0.85 + u * 1.7])
    ]);
    const lines = (side) => () => { const row = Math.floor(r() * 9), z = -0.68 + row * 0.17, u = 0.12 + r() * 0.8; return [side * u * 1.9, pageY(u) + 0.01, z + J(0.008)]; };
    const spine = seg([0, 0.1, -0.88], [0, 0.1, 0.88], 0.01);
    const rehal = many([seg([-0.95, 0.05, -0.5], [0.95, -1.7, -0.5], 0.012), seg([0.95, 0.05, -0.5], [-0.95, -1.7, -0.5], 0.012), seg([-0.95, 0.05, 0.5], [0.95, -1.7, 0.5], 0.012), seg([0.95, 0.05, 0.5], [-0.95, -1.7, 0.5], 0.012)]);
    parts = [[0.12, pageEdge(1)], [0.12, pageEdge(-1)], [0.15, lines(1)], [0.15, lines(-1)], [0.05, spine], [0.17, rehal], [0.12, dust(4.4)]];
    parts.light = [0.12, () => { const v = r(), th = r() * TAU, rad = Math.sqrt(r()) * (0.3 + v * 0.8); return [Math.cos(th) * rad, 0.45 + v * 2.0, Math.sin(th) * rad * 0.6]; }];
  }

  // التوزيع حسب الأوزان
  const extra = parts.waves ? [1, parts.waves] : parts.water ? [2, parts.water] : parts.light ? [3, parts.light] : null;
  const list = parts.slice();
  if (extra) list.push([extra[1][0], extra[1][1], extra[0]]);
  const total = list.reduce((a, p) => a + p[0], 0);
  for (let i = 0; i < n; i++) {
    let k = r() * total, j = 0;
    while (k > list[j][0] && j < list.length - 1) k -= list[j++][0];
    const p = list[j][1]();
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    flow[i] = list[j][2] || 0;
  }
  if (name === 'book') for (let i = 0; i < n; i++) { const y = pos[i * 3 + 1], z = pos[i * 3 + 2], c = Math.cos(0.75), s2 = Math.sin(0.75); pos[i * 3 + 1] = y * c - z * s2; pos[i * 3 + 2] = y * s2 + z * c; }
  if (name === 'crescent') for (let i = 0; i < n; i++) pos[i * 3] -= 0.35;
  if (name === 'sword') for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], c = Math.cos(-0.3), s2 = Math.sin(-0.3); pos[i * 3] = x * c - y * s2; pos[i * 3 + 1] = x * s2 + y * c; }
  if (name === 'dome') for (let i = 0; i < n; i++) pos[i * 3] -= 0.3;
  if (name === 'mushaf') for (let i = 0; i < n * 3; i++) pos[i] *= 1.2;
  // الحوت: زاوية ثلاثة أرباع من أعلى قليلًا حتى تظهر زعنفة الذيل الأفقية الضخمة والظهر، والرأس متجه نحو المشاهد
  if (name === 'whale') {
    const cx = Math.cos(0.45), sx = Math.sin(0.45), cyw = Math.cos(0.35), syw = Math.sin(0.35);
    for (let i = 0; i < n; i++) {
      let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const y1 = y * cx - z * sx, z1 = y * sx + z * cx; y = y1; z = z1;
      const x2 = x * cyw + z * syw, z2 = -x * syw + z * cyw;
      pos[i * 3] = x2; pos[i * 3 + 1] = y - 0.15; pos[i * 3 + 2] = z2;
    }
  }
  return { pos, flow };
}

// ---------- اسم النبي بخط الرقعة ----------
// نرسم النص على لوحة مخفية ثم نأخذ بكسلاته كنقاط: نصفها على حواف الحروف (رسم بالضوء) والباقي يملأها
const textCache = {};
function textPixels(text, font) {
  const key = font + '|' + text;
  if (textCache[key]) return textCache[key];
  const fs = 150;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const css = `700 ${fs}px ${font}`;
  ctx.font = css;
  const w = Math.ceil(ctx.measureText(text).width + fs), h = Math.ceil(fs * 2.2);
  cv.width = w; cv.height = h;
  ctx.font = css; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(text, w / 2, h / 2);
  const d = ctx.getImageData(0, 0, w, h).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 128;
  const fill = [], edge = [];
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue;
    (on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1) ? fill : edge).push(x, y);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return (textCache[key] = { fill, edge, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, bw: Math.max(1, x1 - x0), bh: Math.max(1, y1 - y0) });
}

// نقاط النص داخل صندوق (عرض أقصى، ارتفاع أقصى) مركزه (ox, oy) مع عمق خفيف ليظهر مجسمًا عند الدوران
function textSampler(text, font, r, { maxW, maxH, ox = 0, oy = 0 }) {
  const t = textPixels(text, font);
  const s = Math.min(maxW / t.bw, maxH / t.bh);
  return () => {
    const src = (r() < 0.5 && t.edge.length) || !t.fill.length ? t.edge : t.fill;
    if (!src.length) return [ox, oy, 0];
    const k = Math.floor(r() * (src.length / 2)) * 2;
    const back = r() < 0.28;
    return [ox + (src[k] + r() - t.cx) * s, oy - (src[k + 1] + r() - t.cy) * s, back ? -0.16 + (r() - 0.5) * 0.04 : (r() - 0.5) * 0.06];
  };
}

// زخرفة تحت الاسم في المحطات التي ليس لها مجسم بعد: نجمة ثمانية + خطان جانبيان
function ornament(r, cy) {
  const R = 0.42;
  const star = () => {
    const sq = Math.floor(r() * 2), k = Math.floor(r() * 4), u = r();
    const a0 = sq * Math.PI / 4 + k * Math.PI / 2 + Math.PI / 4, a1 = a0 + Math.PI / 2;
    return [Math.cos(a0) * R + (Math.cos(a1) - Math.cos(a0)) * R * u, cy + Math.sin(a0) * R + (Math.sin(a1) - Math.sin(a0)) * R * u, (r() - 0.5) * 0.04];
  };
  const line = () => { const side = r() < 0.5 ? -1 : 1, u = r(); return [side * (0.65 + u * 1.2), cy + (r() - 0.5) * 0.02 - Math.sin(u * Math.PI) * 0.04, 0]; };
  return () => (r() < 0.6 ? star() : line());
}

// تكبير المجسم وإنزاله تحت الاسم. ثوابت الموج والماء في الشيدر محسوبة على نفس القيم
export const SYM_SCALE = 0.6, SYM_Y = -0.75;
const TEXT = 4; // قيمة flow لنقاط الاسم: لون ذهبي موحّد في الشيدر

// مجسم المحطة كاملًا: اسم بالرقعة + رمز النبي (أو زخرفة لو لم يُحدد رمز بعد)
// layout: 'stack' اسم فوق الرمز، 'side' اسم وبجانبه الرمز (البداية)، 'name' اسم فقط
function buildStation(st, n, r, font) {
  const pos = new Float32Array(n * 3), flow = new Float32Array(n);
  let o = 0;
  const take = (count, gen, f = 0) => { for (let i = 0; i < count && o < n; i++, o++) { const p = gen(); pos[o * 3] = p[0]; pos[o * 3 + 1] = p[1]; pos[o * 3 + 2] = p[2]; flow[o] = f; } };
  const takeShape = (count, name, sc, dx, dy) => {
    const s = buildShape(name, count, r);
    for (let i = 0; i < count && o < n; i++, o++) { pos[o * 3] = s.pos[i * 3] * sc + dx; pos[o * 3 + 1] = s.pos[i * 3 + 1] * sc + dy; pos[o * 3 + 2] = s.pos[i * 3 + 2] * sc; flow[o] = s.flow[i]; }
  };
  const g = () => (r() + r() + r() - 1.5) / 1.5;
  const dust = (R, cy) => () => { const th = r() * TAU, ph = Math.acos(2 * r() - 1), q = R * (0.6 + r() * 0.4); return [Math.sin(ph) * Math.cos(th) * q, cy + Math.cos(ph) * q * 0.6 + g() * 0.02, Math.sin(ph) * Math.sin(th) * q * 0.6]; };
  const label = st.label || '';
  // محور دوران الرمز وحده (x, y, مفعّل): الاسم لا يدور معه حتى يبقى كما هو مقروءًا
  let pivot = [0, SYM_Y, 1];
  if (st.layout === 'side') {
    pivot = [2.35, 0, 1];
    const nt = Math.floor(n * 0.55);
    take(nt, textSampler(label, font, r, { maxW: 3.5, maxH: 1.5, ox: -1.05, oy: 0 }), TEXT);
    takeShape(n - nt, st.symbol || 'crescent', 0.55, 2.35, 0);
  } else if (st.layout === 'name' || !st.symbol) {
    pivot = [0, 0, 0];
    const nt = Math.floor(n * 0.72), no = Math.floor(n * 0.1);
    take(nt, textSampler(label, font, r, { maxW: 4.2, maxH: 1.75, ox: 0, oy: 0.35 }), TEXT);
    take(no, ornament(r, -1.05));
    take(n - nt - no, dust(3.6, 0));
  } else if (st.sub) {
    // اسم + سطر صغير تحته (مثل: صلى الله عليه وسلم) ثم الرمز
    const nt = Math.floor(n * 0.33), ns = Math.floor(n * 0.12);
    pivot = [0, SYM_Y - 0.1, 1];
    take(nt, textSampler(label, font, r, { maxW: 3.4, maxH: 1.0, ox: 0, oy: 2.05 }), TEXT);
    take(ns, textSampler(st.sub, font, r, { maxW: 2.6, maxH: 0.5, ox: 0, oy: 1.2 }), TEXT);
    takeShape(n - nt - ns, st.symbol, SYM_SCALE, 0, SYM_Y - 0.1);
  } else {
    const nt = Math.floor(n * 0.4);
    take(nt, textSampler(label, font, r, { maxW: 3.6, maxH: 1.25, ox: 0, oy: 1.85 }), TEXT);
    takeShape(n - nt, st.symbol, SYM_SCALE, 0, SYM_Y);
  }
  // خلط الترتيب حتى لا يختفي جزء كامل عند تخفيف عدد النقاط على الأجهزة الضعيفة
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    for (let a = 0; a < 3; a++) { const t = pos[i * 3 + a]; pos[i * 3 + a] = pos[j * 3 + a]; pos[j * 3 + a] = t; }
    const f = flow[i]; flow[i] = flow[j]; flow[j] = f;
  }
  return { pos, flow, pivot };
}

const vertex = /* glsl */`
  attribute vec3 aTo;
  attribute float aRand;
  attribute float aFlow;
  uniform float uTime;
  uniform float uProgress;
  uniform float uSize;
  uniform float uPixel;
  uniform float uSymRot;
  uniform vec3 uPivot;
  varying float vRand;
  varying float vFlow;
  varying float vDepth;
  // الموج والماء يتحركان داخل حدود الرمز بعد تصغيره وإنزاله تحت الاسم (SYM_SCALE = 0.6, SYM_Y = -0.75)
  vec3 flowed(vec3 p, float f, float t) {
    if (f > 0.5 && f < 1.5) {
      p.x = mod(p.x + t * 0.54 + 3.6, 7.2) - 3.6;
      p.y += sin(p.x * 2.3 + p.z * 1.8 + t * 1.6) * 0.1;
    } else if (f > 1.5 && f < 2.5) {
      p.y = mod(p.y + t * 0.21 + aRand * 2.76 + 2.37, 2.76) - 2.37;
      p.x += sin(p.y * 3.3 + t) * 0.03;
    } else if (f > 2.5 && f < 3.5) {
      p.y += mod(t * 0.25 + aRand * 3.0, 3.0) * 0.21;
    }
    return p;
  }
  // الرمز يدور حول محوره الرأسي مع السكرول والمؤشر، ونقاط الاسم (flow 4) ثابتة
  vec3 spinSym(vec3 p, float f) {
    if (f > 3.5 && f < 4.5) return p;
    float a = uSymRot * uPivot.z, c = cos(a), s = sin(a), dx = p.x - uPivot.x;
    return vec3(uPivot.x + dx * c + p.z * s, p.y, -dx * s + p.z * c);
  }
  void main() {
    float k = clamp((uProgress - aRand * 0.35) / 0.65, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    vec3 p = mix(position, spinSym(flowed(aTo, aFlow, uTime), aFlow), k);
    float t = uTime * 0.6 + aRand * 20.0;
    p += vec3(sin(t), cos(t * 1.3), sin(t * 0.7)) * 0.018;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.55 + aRand * 0.9) * uPixel * (10.0 / -mv.z);
    vRand = aRand; vFlow = aFlow;
    vDepth = clamp((-mv.z - 4.0) / 8.0, 0.0, 1.0);
  }
`;
const fragment = /* glsl */`
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD;
  uniform float uOpacity; uniform float uLight;
  varying float vRand; varying float vFlow; varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = mix(pow(1.0 - d * 2.0, 1.7), pow(1.0 - d * 2.0, 1.2), uLight);
    vec3 col = mix(uA, uB, smoothstep(0.0, 0.35, vRand));
    col = mix(col, uC, smoothstep(0.74, 0.86, vRand));
    col = mix(col, uD, smoothstep(0.95, 1.0, vRand));
    if (vFlow > 0.5 && vFlow < 2.5) col = mix(uC, mix(vec3(0.75, 0.9, 1.0), uC, uLight), 0.45);
    if (vFlow > 2.5 && vFlow < 3.5) col = mix(mix(uA, vec3(1.0), 0.5), uA, uLight);
    // اسم النبي: ذهبي دافئ موحّد حتى يُقرأ الخط بوضوح، مع لمعة خفيفة
    if (vFlow > 3.5 && vFlow < 4.5) col = mix(mix(uA, uB, 0.35 + vRand * 0.5), uD, step(0.93, vRand) * 0.6);
    // الحوت الأزرق: درجات أزرق حقيقية مع لمعة فاتحة، وأغمق في الثيم الفاتح
    if (vFlow > 4.5) col = mix(mix(vec3(0.24, 0.52, 0.92), vec3(0.62, 0.84, 1.0), vRand), mix(vec3(0.1, 0.3, 0.72), vec3(0.2, 0.48, 0.86), vRand), uLight);
    float fa = vFlow > 2.5 && vFlow < 3.5 ? mix(0.8, 0.5, uLight) : 1.0;
    gl_FragColor = vec4(col, clamp(glow, 0.0, 1.0) * fa * uOpacity * (1.0 - vDepth * 0.4));
  }
`;

// نجوم الخلفية والنجوم التي تدور حول المجسم
const starVertex = /* glsl */`
  attribute float aRand;
  attribute float aKind;
  uniform float uTime; uniform float uPixel; uniform float uSpin;
  varying float vTw; varying float vKind;
  void main() {
    vec3 p = position;
    if (aKind > 0.5) {
      float a = atan(p.z, p.x) + uSpin * (0.6 + aRand * 0.6);
      float r = length(p.xz);
      p.x = cos(a) * r; p.z = sin(a) * r;
      p.y += sin(uTime * 0.8 + aRand * 6.28) * 0.15;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float base = aKind > 0.5 ? 13.0 + aRand * 6.0 : 4.0 + aRand * 6.0;
    gl_PointSize = base * uPixel * (10.0 / -mv.z);
    vTw = 0.55 + 0.45 * sin(uTime * (1.2 + aRand * 2.0) + aRand * 40.0);
    vKind = aKind;
  }
`;
const starFragment = /* glsl */`
  uniform float uOpacity; uniform float uLight; uniform vec3 uStar; uniform vec3 uDust;
  varying float vTw; varying float vKind;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a;
    if (vKind > 0.5) {
      // نجمة رباعية لامعة
      float cross = max(0.0, 1.0 - abs(c.x) * 14.0) * max(0.0, 1.0 - abs(c.y) * 2.2)
                  + max(0.0, 1.0 - abs(c.y) * 14.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
      a = clamp(cross + pow(max(0.0, 1.0 - d * 3.2), 2.0), 0.0, 1.0);
      gl_FragColor = vec4(uStar, a * mix(vTw, 0.55 + vTw * 0.45, uLight) * uOpacity);
    } else {
      if (d > 0.5) discard;
      a = pow(1.0 - d * 2.0, 2.0);
      gl_FragColor = vec4(uDust, a * vTw * uOpacity * mix(0.85, 0.55, uLight));
    }
  }
`;

export function detectTier() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const conn = navigator.connection || {};
  const saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  const small = window.matchMedia('(max-width: 760px)').matches;
  if (reduced) return 'static';
  if (saveData || mem <= 2 || cores <= 2) return 'low';
  if (small || mem <= 4 || cores <= 4) return 'mid';
  return 'high';
}

const TIERS = {
  high:   { n: 9000, pixelMax: 1.75, stars: 380, orbit: 14 },
  mid:    { n: 6000,  pixelMax: 1.5,  stars: 240, orbit: 10 },
  low:    { n: 3500,  pixelMax: 1.0,  stars: 140, orbit: 6 },
  static: { n: 5000,  pixelMax: 1.25, stars: 200, orbit: 8 }
};

export function createWorld(canvas, opts = {}) {
  let tierName = opts.tier || detectTier();
  const reduced = tierName === 'static';
  const tier = TIERS[tierName];
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (_) { return null; }
  let pixel = Math.min(window.devicePixelRatio || 1, tier.pixelMax);
  renderer.setPixelRatio(pixel);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const N = tier.n;
  // المحطات: { id, label, sub, symbol, layout }. تُبنى عند الحاجة ثم في أوقات الفراغ وتُحفظ
  const stations = opts.stations || [{ id: 'crescent', label: '', symbol: 'crescent', layout: 'stack' }];
  const font = opts.font || 'serif';
  const shapes = {};
  const shapeOf = (id) => {
    if (!shapes[id]) {
      const i = stations.findIndex((s) => s.id === id);
      if (i < 0) return null;
      shapes[id] = buildStation(stations[i], N, rand(77 + i * 31), font);
    }
    return shapes[id];
  };
  let current = opts.initial && shapeOf(opts.initial) ? opts.initial : stations[0].id;
  const first = shapeOf(current);

  const from = new Float32Array(N * 3);
  const r0 = rand(5);
  for (let i = 0; i < from.length; i++) from[i] = (r0() - 0.5) * 20;
  const to = new Float32Array(first.pos);
  const flow = new Float32Array(first.flow);
  const rnd = new Float32Array(N);
  const rr = rand(42);
  for (let i = 0; i < N; i++) rnd[i] = rr();

  const geo = new THREE.BufferGeometry();
  const fromAttr = new THREE.BufferAttribute(from, 3), toAttr = new THREE.BufferAttribute(to, 3), flowAttr = new THREE.BufferAttribute(flow, 1);
  geo.setAttribute('position', fromAttr);
  geo.setAttribute('aTo', toAttr);
  geo.setAttribute('aFlow', flowAttr);
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 14);

  const small = window.matchMedia('(max-width: 760px)').matches;
  const uniforms = {
    uTime: { value: 0 }, uProgress: { value: reduced ? 1 : 0 }, uSize: { value: small ? 3.2 : 2.8 }, uPixel: { value: pixel }, uOpacity: { value: 1 }, uLight: { value: 0 },
    uSymRot: { value: 0 }, uPivot: { value: new THREE.Vector3(...first.pivot) },
    uA: { value: new THREE.Color('#FFE7B0') }, uB: { value: new THREE.Color('#F5B942') }, uC: { value: new THREE.Color('#19C3B1') }, uD: { value: new THREE.Color('#9C8BFF') }
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // النجوم
  const SN = tier.stars + tier.orbit;
  const sPos = new Float32Array(SN * 3), sRand = new Float32Array(SN), sKind = new Float32Array(SN);
  const sr = rand(11);
  for (let i = 0; i < SN; i++) {
    sRand[i] = sr();
    if (i < tier.stars) {
      const th = sr() * TAU, ph = Math.acos(2 * sr() - 1), rad = 14 + sr() * 18;
      sPos[i * 3] = Math.sin(ph) * Math.cos(th) * rad; sPos[i * 3 + 1] = Math.cos(ph) * rad * 0.7; sPos[i * 3 + 2] = -Math.abs(Math.sin(ph) * Math.sin(th) * rad) - 4;
    } else {
      sKind[i] = 1;
      const a = sr() * TAU, rad = 3.4 + sr() * 0.9;
      sPos[i * 3] = Math.cos(a) * rad; sPos[i * 3 + 1] = (sr() - 0.5) * 2.6; sPos[i * 3 + 2] = Math.sin(a) * rad;
    }
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aRand', new THREE.BufferAttribute(sRand, 1));
  sGeo.setAttribute('aKind', new THREE.BufferAttribute(sKind, 1));
  sGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  const sUniforms = { uTime: { value: 0 }, uPixel: { value: pixel }, uSpin: { value: 0 }, uOpacity: { value: 1 }, uLight: { value: 0 }, uStar: { value: new THREE.Color('#FFDB7A') }, uDust: { value: new THREE.Color('#E6E0FF') } };
  const sMat = new THREE.ShaderMaterial({ vertexShader: starVertex, fragmentShader: starFragment, uniforms: sUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const starPoints = new THREE.Points(sGeo, sMat);
  scene.add(starPoints);
  // النجوم المدارية تتبع المجسم
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const state = { x: 0, y: 0, scale: 1, rotY: 0, tilt: 0 };
  const goal = { x: 0, y: 0, scale: 1, yaw: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollLocal = 0, scrollLocalS = 0, velocity = 0, spin = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reduced) draw();
  }
  window.addEventListener('resize', resize);
  const onPointer = (e) => { pointer.tx = (e.clientX / innerWidth - 0.5) * 2; pointer.ty = (e.clientY / innerHeight - 0.5) * 2; };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // بناء باقي المحطات في أوقات فراغ المتصفح حتى لا يحدث تقطيع أثناء السكرول
  const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 60));
  let idleId = 0, alive = true;
  const prebuild = () => { const next = stations.find((s) => !shapes[s.id]); if (!next || !alive) return; idleId = idle(() => { if (!alive) return; shapeOf(next.id); prebuild(); }); };
  prebuild();

  function cpuFlowed(j, f, t) {
    let x = to[j], y = to[j + 1], z = to[j + 2];
    if (f > 0.5 && f < 1.5) { x = (((x + t * 0.54 + 3.6) % 7.2) + 7.2) % 7.2 - 3.6; y += Math.sin(x * 2.3 + z * 1.8 + t * 1.6) * 0.1; }
    else if (f > 1.5 && f < 2.5) { const i = j / 3; y = (((y + t * 0.21 + rnd[i] * 2.76 + 2.37) % 2.76) + 2.76) % 2.76 - 2.37; }
    return [x, y, z];
  }
  function cpuSpin(p, f) {
    if (f > 3.5 && f < 4.5) return p;
    const pv = uniforms.uPivot.value, a = uniforms.uSymRot.value * pv.z, c = Math.cos(a), s = Math.sin(a), dx = p[0] - pv.x;
    return [pv.x + dx * c + p[2] * s, p[1], -dx * s + p[2] * c];
  }
  function retarget(next) {
    const p = uniforms.uProgress.value, t = uniforms.uTime.value;
    for (let i = 0, j = 0; i < N; i++, j += 3) {
      let k = Math.min(1, Math.max(0, (p - rnd[i] * 0.35) / 0.65)); k = k * k * (3 - 2 * k);
      const tt = cpuSpin(cpuFlowed(j, flow[i], t), flow[i]);
      from[j] += (tt[0] - from[j]) * k; from[j + 1] += (tt[1] - from[j + 1]) * k; from[j + 2] += (tt[2] - from[j + 2]) * k;
    }
    to.set(next.pos); flow.set(next.flow);
    uniforms.uPivot.value.set(...next.pivot);
    fromAttr.needsUpdate = toAttr.needsUpdate = flowAttr.needsUpdate = true;
    uniforms.uProgress.value = reduced ? 1 : 0;
  }

  function draw() {
    group.position.set(state.x, state.y, 0);
    group.scale.setScalar(state.scale);
    renderer.render(scene, camera);
  }

  // مراقبة الأداء: لو الإطارات بطيئة لمدة ثانيتين نخفف تلقائيًا
  const perf = { acc: 0, frames: 0, downgraded: 0 };
  function watchPerf(raw) {
    perf.acc += raw; perf.frames++;
    if (perf.acc >= 2) {
      const avg = perf.acc / perf.frames;
      perf.acc = 0; perf.frames = 0;
      if (avg > 0.034 && perf.downgraded < 2) {
        perf.downgraded++;
        pixel = Math.max(0.75, pixel * 0.75);
        renderer.setPixelRatio(pixel); uniforms.uPixel.value = pixel; sUniforms.uPixel.value = pixel;
        geo.setDrawRange(0, Math.floor(N * (perf.downgraded === 1 ? 0.7 : 0.5)));
        resize();
      }
    }
  }

  const THEMES = {
    dark:  { blend: THREE.AdditiveBlending, light: 0, A: '#FFE7B0', B: '#F5B942', C: '#19C3B1', D: '#9C8BFF', star: '#FFE7B0', dust: '#E6E0FF', size: 1, op: 0.95 },
    light: { blend: THREE.NormalBlending,   light: 1, A: '#7B5CFF', B: '#5B3FE0', C: '#0EA38C', D: '#E39400', star: '#E9A100', dust: '#9C8BFF', size: 0.95, op: 0.8 }
  };
  let baseSize = uniforms.uSize.value;
  function applyTheme(name) {
    const th = THEMES[name] || THEMES.dark;
    mat.blending = th.blend; sMat.blending = th.blend; mat.needsUpdate = sMat.needsUpdate = true;
    uniforms.uLight.value = th.light; sUniforms.uLight.value = th.light;
    uniforms.uA.value.set(th.A); uniforms.uB.value.set(th.B); uniforms.uC.value.set(th.C); uniforms.uD.value.set(th.D); uniforms.uOpacity.value = th.op;
    sUniforms.uStar.value.set(th.star); sUniforms.uDust.value.set(th.dust);
    uniforms.uSize.value = baseSize * th.size;
  }
  applyTheme(opts.theme || 'light');

  const clock = new THREE.Clock();
  let running = !reduced, lost = false;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function frame() {
    if (!running || lost) return;
    const raw = clock.getDelta(), dt = Math.min(raw, 0.05), t = clock.elapsedTime;
    watchPerf(raw);
    uniforms.uTime.value = t; sUniforms.uTime.value = t;
    const u = uniforms.uProgress;
    if (u.value < 1) u.value = Math.min(1, u.value + Math.min(raw, 0.25) / MORPH_SECONDS);

    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    for (const key of ['x', 'y', 'scale']) state[key] += (goal[key] - state[key]) * 0.07;
    scrollLocalS += (scrollLocal - scrollLocalS) * 0.12;
    velocity *= 0.92;
    spin += dt * (0.25 + Math.min(3, Math.abs(velocity)) * 1.6);
    sUniforms.uSpin.value = spin;

    // دوران هادئ حول الوضع المواجه حتى يبقى الاسم مقروءًا
    state.rotY += wrap(goal.yaw + (scrollLocalS - 0.5) * 0.5 + Math.sin(t * 0.3) * 0.08 - state.rotY) * 0.06;
    group.rotation.y = state.rotY + pointer.x * 0.22;
    group.rotation.x = 0.05 + pointer.y * 0.12 + (scrollLocalS - 0.5) * 0.1;
    uniforms.uSymRot.value = (scrollLocalS - 0.5) * 1.4 + pointer.x * 0.6 + Math.sin(t * 0.25) * 0.25;
    starPoints.rotation.y = pointer.x * 0.05;
    draw();
    requestAnimationFrame(frame);
  }
  resize();
  if (running) requestAnimationFrame(frame); else draw();

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; canvas.classList.add('is-lost'); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; canvas.classList.remove('is-lost'); if (running) { clock.getDelta(); requestAnimationFrame(frame); } else draw(); });
  const onVis = () => {
    if (reduced || lost) return;
    const was = running; running = !document.hidden;
    if (running && !was) { clock.getDelta(); requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVis);

  function dispose() {
    running = false; lost = true; alive = false;
    if (window.cancelIdleCallback) window.cancelIdleCallback(idleId); else clearTimeout(idleId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVis);
    geo.dispose(); mat.dispose(); sGeo.dispose(); sMat.dispose(); renderer.dispose();
  }

  return {
    dispose,
    tier: tierName,
    morph(id, o = {}) {
      if (id !== current) { const s = shapeOf(id); if (s) { retarget(s); current = id; } }
      Object.assign(goal, { x: 0, y: 0, scale: 1, yaw: 0 }, o);
      if (reduced) { Object.assign(state, { x: goal.x, y: goal.y, scale: goal.scale }); group.rotation.set(0.05, goal.yaw, 0); draw(); }
    },
    scroll(local, vel) { scrollLocal = local; velocity = vel; },
    setTheme(name) { applyTheme(name); if (reduced) draw(); },
    debug() {
      return { shape: current, tier: tierName, progress: uniforms.uProgress.value, pixel, downgraded: perf.downgraded, drawCount: geo.drawRange.count === Infinity ? N : geo.drawRange.count, state: { ...state }, goal: { ...goal }, symRot: uniforms.uSymRot.value };
    }
  };
}

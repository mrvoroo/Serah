// @ts-nocheck
// أشكال الأنبياء من آدم إلى شعيب عليهم السلام (رسم بالضوء: معظم النقاط على الحواف والخطوط)
import { TAU } from './kit.js';

// ---------- أجزاء مشتركة ----------
// هلال: قوس خارجي وقوس داخلي متقاطعان (مثل هلال الرحلة)
const crescent = (k, cx, cy, R, j = 0.016) => {
  const o = R * 0.425, ri = R * 0.875;
  return k.mix([
    [0.6, k.curve((u) => { const a = 0.338 * Math.PI + u * 1.324 * Math.PI; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0]; }, j)],
    [0.4, k.curve((u) => { const a = 0.477 * Math.PI + u * 1.046 * Math.PI; return [cx + o + Math.cos(a) * ri, cy + Math.sin(a) * ri, 0]; }, j)],
  ]);
};
// تعبئة الهلال بين القوسين
const crescentFill = (k, cx, cy, R) => () => {
  const o = R * 0.425, ri = R * 0.875;
  let x, y, t = 0;
  do { const th = k.r() * TAU, q = R * Math.sqrt(k.r()); x = Math.cos(th) * q; y = Math.sin(th) * q; t++; } while (((x - o) ** 2 + y * y) < ri * ri && t < 40);
  return [cx + x, cy + y, k.J(0.08)];
};
// شمس: محيط + قرص خفيف + أشعة
const sun = (k, cx, cy, R, rays = 12) => k.mix([
  [0.45, k.arc(cx, cy, R, 0, TAU, 0.016)],
  [0.2, k.disc(cx, cy, R * 0.92, 0, 0.06)],
  [0.35, () => { const a = Math.floor(k.r() * rays) * TAU / rays, q = R * (1.25 + k.r() * 0.45); return [cx + Math.cos(a) * q + k.J(0.012), cy + Math.sin(a) * q + k.J(0.012), k.J(0.02)]; }],
]);
// ساق شجرة بين نقطتين بسمك متناقص (أسطوانة نقاط على المحيط)
const limb = (k, a, b, r0, r1) => () => {
  const u = k.r(), p = k.lerp(a, b, u), q = r0 + (r1 - r0) * u, th = k.r() * TAU;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [p[0] + nx * Math.cos(th) * q + k.J(0.006), p[1] + ny * Math.cos(th) * q + k.J(0.006), (p[2] || 0) + Math.sin(th) * q];
};
// تاج شجرة: كرات متداخلة نأخذ قشرتها الخارجية فقط (سحابة أوراق)
const canopy = (k, balls) => () => {
  for (let t = 0; t < 30; t++) {
    const [cx, cy, cz, R] = balls[Math.floor(k.r() * balls.length)];
    const th = k.r() * TAU, ph = Math.acos(2 * k.r() - 1);
    const p = [cx + Math.sin(ph) * Math.cos(th) * R, cy + Math.cos(ph) * R, cz + Math.sin(ph) * Math.sin(th) * R * 0.8];
    // نحذف النقاط المدفونة داخل كرة أخرى حتى يبقى محيط التاج واضحًا
    if (!balls.some(([x, y, z, Rb]) => (x !== cx || y !== cy) && (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2 < (Rb * 0.92) ** 2)) return [p[0] + k.J(0.02), p[1] + k.J(0.02), p[2] + k.J(0.02)];
  }
  const b = balls[0];
  return [b[0], b[1] + b[3], b[2]];
};
// شجرة كاملة: جذع وفروع وتاج وأرض
const treeParts = (k, s = 1, dx = 0, dy = 0) => {
  const P = (x, y, z = 0) => [dx + x * s, dy + y * s, z * s];
  const trunk = k.mix([
    [0.55, limb(k, P(0, -2.3), P(0.05, -0.2), 0.26 * s, 0.16 * s)],
    [0.15, limb(k, P(0.05, -0.5), P(-0.9, 0.55, 0.2), 0.11 * s, 0.05 * s)],
    [0.15, limb(k, P(0.05, -0.35), P(0.95, 0.6, -0.2), 0.11 * s, 0.05 * s)],
    [0.15, limb(k, P(0.05, -0.2), P(0.1, 0.9, 0.1), 0.1 * s, 0.05 * s)],
  ]);
  const balls = [[0, 0.75, 0, 1.0], [-1.05, 0.45, 0.1, 0.75], [1.05, 0.5, -0.1, 0.78], [-0.5, 1.3, 0.2, 0.7], [0.55, 1.3, -0.15, 0.7]].map(([x, y, z, R]) => [dx + x * s, dy + y * s, z * s, R * s]);
  const roots = k.many([k.curve((u) => [dx + (-0.2 - u * 0.7) * s, dy + (-2.3 - Math.sin(u * 2) * 0.12) * s, u * 0.2 * s], 0.012), k.curve((u) => [dx + (0.2 + u * 0.75) * s, dy + (-2.3 - Math.sin(u * 2) * 0.1) * s, -u * 0.25 * s], 0.012)]);
  return [[0.28, trunk], [0.5, canopy(k, balls)], [0.06, roots], [0.08, k.move(k.ground(-2.35, 1.6), dx, dy, s)]];
};
// نجوم صغيرة متناثرة في قوس
const sprinkle = (k, n, x0, x1, y0, y1, R = 0.1) => k.many(Array.from({ length: n }, (_, i) => { const r = ((i * 7919) % 97) / 97; return k.glow(x0 + (x1 - x0) * ((i + 0.5) / n), y0 + (y1 - y0) * r, R); }));
// حجر/طوبة: صندوق صغير
const brick = (k, x, y, w = 0.5, h = 0.28, d = 0.32, z = 0) => k.box(x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2, 0.008);
// أحد عشر كوكبًا: نقاط مضيئة مستديرة (ليست نجومًا خماسية ولا كواكب بحلقات)
const eleven = (k, pos, R) => k.many(pos.map(([x, y]) => k.mix([[0.7, k.sphere(x, y, R, 0, 0.006)], [0.3, k.glow(x, y, R * 0.6)]])));

export const SHAPES_A = {
  // ======== آدم ========
  // الطين: كومة طين بخطوط كنتور + كتل صغيرة حولها
  clay: (k) => {
    const H = (y) => Math.sqrt(Math.max(0, 1 - ((y + 2.1) / 2.6) ** 2)) * 2.1;
    const contours = () => { const i = Math.floor(k.r() * 7), y = -2.1 + i * 0.36, a = k.r() * TAU, R = H(y) * (1 + 0.09 * Math.sin(a * 3 + i * 1.7) + 0.05 * Math.sin(a * 7 + i)); return [Math.cos(a) * R + k.J(0.015), y + 0.04 * Math.sin(a * 2 + i) + k.J(0.012), Math.sin(a) * R * 0.6]; };
    const ridges = () => { const a = k.r() * TAU, q = Math.sqrt(k.r()), y = -2.1 + (1 - q * q) * 2.45, R = H(y) * q; return [Math.cos(a) * R, y + k.J(0.03), Math.sin(a) * R * 0.6]; };
    const lumps = k.many([k.sphere(-2.0, -1.95, 0.2), k.sphere(1.95, -2.0, 0.17), k.sphere(1.5, -2.15, 0.12), k.sphere(-1.45, -2.2, 0.13)]);
    return [[0.5, contours], [0.2, ridges], [0.12, lumps], [0.1, k.ground(-2.2, 2.4)], [0.08, k.dust(4.2)]];
  },
  // الشجرة
  tree: (k) => [...treeParts(k), [0.08, k.dust(4.2)]],
  // الأسماء: حروف عربية تدور حول شجرة صغيرة على مدار بيضاوي
  letters_swirl: (k) => {
    const L = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'د', 'ر'];
    const letters = k.many(L.map((ch, i) => { const a = i * TAU / L.length + 0.3; return k.text(ch, { maxW: 0.55, maxH: 0.55, ox: Math.cos(a) * 2.15, oy: 0.1 + Math.sin(a) * 1.55 }); }));
    const orbit = () => { const a = k.r() * TAU; return [Math.cos(a) * 2.15 + k.J(0.01), 0.1 + Math.sin(a) * 1.55 + k.J(0.01), Math.sin(a) * 0.5]; };
    const t = treeParts(k, 0.55, 0, 0.25).map(([w, gen]) => [w * 0.55, gen]);
    return [...t, [0.32, letters], [0.1, orbit], [0.05, k.dust(4.2)]];
  },
  // التوبة: نور يصعد من الأرض إلى السماء في عمود لطيف مع حلقات
  light_rising: (k) => [
    [0.3, () => { const v = k.r(), th = k.r() * TAU, q = Math.sqrt(k.r()) * (0.25 + v * 0.55); return [Math.cos(th) * q, -2.0 + v * 4.0, Math.sin(th) * q * 0.6]; }, 3],
    [0.25, () => { const i = Math.floor(k.r() * 4), y = -1.9 + i * 1.1, R = 0.55 + i * 0.28, a = k.r() * TAU; return [Math.cos(a) * R + k.J(0.012), y + k.J(0.012), Math.sin(a) * R * 0.45]; }],
    [0.15, k.ellipse(0, -2.05, 1.9, 0.5, 0, TAU, 0.015)],
    [0.12, () => { const side = k.r() < 0.5 ? -1 : 1, i = Math.floor(k.r() * 4), v = k.r() * 0.35; return [side * (1.3 + i * 0.25), -1.4 + i * 0.85 + v, k.J(0.02)]; }],
    [0.1, k.glow(0, 1.7, 0.3)],
    [0.08, k.dust(4.2)],
  ],
  // ======== إدريس ========
  // الصدق: قلب مضيء بأشعة
  heart_light: (k) => {
    const h = (t) => { const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return [x * 0.11, y * 0.11 + 0.1]; };
    const edge = (z) => k.curve((u) => { const p = h(u * TAU); return [p[0], p[1], z]; }, 0.014);
    const fill = () => { for (let t = 0; t < 20; t++) { const s = Math.sqrt(k.r()), p = h(k.r() * TAU); return [p[0] * s, 0.1 + (p[1] - 0.1) * s, k.J(0.1)]; } };
    const rays = () => { const a = Math.floor(k.r() * 14) * TAU / 14, q = 2.15 + k.r() * 0.35; return [Math.cos(a) * q, 0.0 + Math.sin(a) * q * 0.95, k.J(0.02)]; };
    return [[0.3, edge(0.15)], [0.25, edge(-0.15)], [0.15, fill], [0.18, rays], [0.04, k.glow(0, 0.2, 0.35)], [0.08, k.dust(4.2)]];
  },
  // الصبر: ساعة رملية بإطار ورمل ينزل
  hourglass: (k) => {
    const prof = (y) => 0.12 + 1.15 * Math.pow(Math.abs(y) / 1.75, 1.6); // نصف قطر الزجاج عند الارتفاع y
    const glass = () => { const y = (k.r() * 2 - 1) * 1.75, a = Math.floor(k.r() * 10) * TAU / 10 + (k.r() < 0.4 ? k.r() * TAU : 0), R = prof(y); return [Math.cos(a) * R + k.J(0.01), y + k.J(0.01), Math.sin(a) * R]; };
    const rings = () => { const y = [-1.75, 1.75, 0][Math.floor(k.r() * 3)], R = prof(y), a = k.r() * TAU; return [Math.cos(a) * R, y + k.J(0.01), Math.sin(a) * R]; };
    const plates = () => { const y = k.r() < 0.5 ? -2.0 : 2.0, a = k.r() * TAU; return k.r() < 0.65 ? [Math.cos(a) * 1.6, y + k.J(0.015), Math.sin(a) * 1.6] : [Math.cos(a) * 1.6, y + (y > 0 ? 0.14 : -0.14), Math.sin(a) * 1.6]; };
    const posts = k.many([0, 1, 2, 3].map((i) => { const a = i * TAU / 4 + TAU / 8; return k.seg([Math.cos(a) * 1.45, -2.0, Math.sin(a) * 1.45], [Math.cos(a) * 1.45, 2.0, Math.sin(a) * 1.45], 0.012); }));
    const sandBottom = () => { const v = Math.pow(k.r(), 0.7), y = -1.72 + v * 0.75, R = prof(y) * (1 - v) * 0.95, a = k.r() * TAU, q = R * Math.sqrt(k.r()); return [Math.cos(a) * q, y, Math.sin(a) * q]; };
    const sandTop = () => { const y = 0.25 + k.r() * 0.7, R = prof(y) * 0.92, a = k.r() * TAU, q = R * Math.sqrt(k.r()); return [Math.cos(a) * q, y, Math.sin(a) * q]; };
    const stream = k.seg([0, 0.2, 0], [0, -1.0, 0], 0.02);
    return [[0.3, glass], [0.06, rings], [0.14, plates], [0.1, posts], [0.16, sandBottom], [0.1, sandTop], [0.06, stream], [0.05, k.dust(4.3)]];
  },
  // المكان العليّ: نجم عالٍ مضيء ودرب من النور يصعد إليه
  star_high: (k) => [
    [0.3, k.star(0, 1.15, 0.95, 0.013, 0.12)],
    [0.12, k.star(0, 1.15, 0.95, 0.013, -0.12)],
    [0.08, k.glow(0, 1.15, 0.35)],
    [0.12, () => { const a = Math.floor(k.r() * 16) * TAU / 16, q = 1.2 + k.r() * 0.35; return [Math.cos(a) * q, 1.15 + Math.sin(a) * q * 0.85, k.J(0.02)]; }],
    [0.2, () => { const v = k.r(), w = 0.15 + (1 - v) * 0.6; return [k.J(w * 0.5), -2.2 + v * 2.6, k.J(w * 0.3)]; }, 3],
    [0.1, k.ellipse(0, -2.25, 1.8, 0.4, 0, TAU, 0.015)],
    [0.08, k.dust(4.3)],
  ],
  // السماء الرابعة: سبع قباب سماوية متتالية، والرابعة مضيئة وعليها نجمة
  sky_layers: (k) => {
    const layer = (i) => { const rx = 0.75 + i * 0.29, ry = 0.95 + i * 0.6; return () => { const a = k.r() * Math.PI; return [Math.cos(a) * rx + k.J(0.012), -2.25 + Math.sin(a) * ry + k.J(0.012), (i - 3) * 0.12 + Math.sin(a * 2) * 0.05]; }; };
    const others = k.many([0, 1, 2, 4, 5, 6].map(layer));
    const fourth = layer(3);
    return [[0.42, others], [0.26, fourth], [0.12, k.star(0, -2.25 + 0.95 + 3 * 0.6 + 0.2, 0.32, 0.01)], [0.06, k.glow(0, -2.25 + 0.95 + 3 * 0.6, 0.2)], [0.08, k.seg([-2.4, -2.25, 0], [2.4, -2.25, 0], 0.012)], [0.06, k.dust(4.3)]];
  },
  // ======== نوح ========
  // الألواح والمسامير: ألواح خشب مكدّسة ولوح مائل عليها
  planks: (k) => {
    const stack = k.many([0, 1, 2, 3, 4].map((i) => k.box(-2.1 + (i % 2) * 0.15, 2.0 - (i % 2) * 0.1, -2.1 + i * 0.32, -1.86 + i * 0.32, -0.55, 0.55, 0.008)));
    const lean = () => { const p = k.box(-0.24, 0.24, -1.9, 1.9, -0.06, 0.06, 0.008)(); const a = -0.95, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s + 0.2, p[0] * s + p[1] * c + 0.55, p[2] + 0.62]; };
    const grain = () => { const i = Math.floor(k.r() * 5), y = -2.1 + i * 0.32 + 0.12; return [-2 + k.r() * 4, y + Math.sin(k.r() * 9) * 0.02, 0.56]; };
    const nails = k.many([[-1.6, -1.2], [-0.4, -1.2], [0.8, -1.2], [1.7, -0.9], [-1.0, -0.86]].map(([x, y]) => k.glow(x, y + 0.6, 0.06, 0.57)));
    return [[0.48, stack], [0.2, lean], [0.12, grain], [0.12, nails], [0.08, k.dust(4.2)]];
  },
  // الطوفان: سحاب ومطر منهمر وموج يتحرك
  rain_waves: (k) => {
    const cloud = k.many([[-1.2, 1.5, 0.6], [-0.3, 1.75, 0.75], [0.75, 1.6, 0.65], [1.6, 1.4, 0.5]].map(([x, y, R]) => k.arc(x, y, R, 0, Math.PI, 0.016)));
    const base = k.seg([-1.8, 1.4, 0], [2.1, 1.4, 0], 0.016);
    const rain = () => { const i = Math.floor(k.r() * 16), x = -1.9 + i * 0.26 + Math.sin(i * 5) * 0.06, y0 = 1.25 - (i % 3) * 0.15, v = k.r() * 0.45, y1 = y0 - 0.35 - (i % 4) * 0.55; const yy = y1 - v * 0.5; return [x - (y0 - yy) * 0.1 + k.J(0.006), yy + k.J(0.006), ((i % 5) - 2) * 0.25]; };
    const rainAll = () => { const x = -2 + k.r() * 4.1, len = 0.25, y = 1.2 - k.r() * 2.6, v = k.r() * len; return [x - v * 0.15, y - v, k.J(0.6)]; };
    const waves = () => { const x = -2.5 + k.r() * 5, row = Math.floor(k.r() * 4), z = -0.8 + row * 0.5; return [x, -1.75 + row * 0.08 + Math.sin(x * 2.2 + row) * 0.18 + k.J(0.01), z]; };
    return [[0.26, cloud], [0.06, base], [0.1, rain], [0.18, rainAll], [0.32, waves, 1], [0.08, k.dust(4.2)]];
  },
  // على الجودي: جبل وفوق قمته سفينة صغيرة
  mountain_ark: (k) => {
    const ridge = k.poly([[-2.5, -2.2], [-1.6, -1.1], [-1.2, -1.3], [-0.45, 0.25], [0.45, 0.25], [1.2, -0.9], [1.6, -0.7], [2.5, -2.2]], false, 0.014);
    const back = k.poly([[-2.2, -2.2, -0.7], [-0.9, -0.2, -0.7], [0, 0.1, -0.7], [1.0, -0.4, -0.7], [2.3, -2.2, -0.7]], false, 0.014);
    const top = (x) => (Math.abs(x) <= 0.45 ? 0.25 : 0.25 - (Math.abs(x) - 0.45) * (2.45 / 2.05));
    const face = () => { const i = Math.floor(k.r() * 9), x = -2.0 + i * 0.5 + (k.r() - 0.5) * 0.04, y = -2.2 + k.r() * Math.max(0, top(x) + 2.2) * 0.85; return [x, y, 0.12]; };
    const L = 0.95, Y = 0.55;
    const hull = k.mix([
      [0.4, k.curve((u) => { const t = u * 2 - 1; return [t * L, Y + Math.pow(Math.abs(t), 2.2) * 0.25, 0.35 * Math.sqrt(Math.max(0, 1 - t ** 4))]; }, 0.01)],
      [0.3, k.curve((u) => { const t = u * 2 - 1; return [t * L, Y + Math.pow(Math.abs(t), 2.2) * 0.25, -0.35 * Math.sqrt(Math.max(0, 1 - t ** 4))]; }, 0.01)],
      [0.3, k.curve((u) => { const t = u * 2 - 1; return [t * L * 0.9, Y - 0.38 + Math.pow(Math.abs(t), 2) * 0.33, 0]; }, 0.01)],
    ]);
    const house = k.box(-0.45, 0.45, Y, Y + 0.32, -0.22, 0.22, 0.008);
    const roof = k.poly([[-0.5, Y + 0.32], [0, Y + 0.58], [0.5, Y + 0.32]], false, 0.008);
    return [[0.26, ridge], [0.1, back], [0.12, face], [0.22, hull], [0.1, house], [0.06, roof], [0.06, k.glow(1.7, 1.6, 0.18)], [0.08, k.dust(4.2)]];
  },
  // ======== هود ========
  // إرم ذات العماد: أعمدة عالية بتيجان وقاعدة
  pillars: (k) => {
    const xs = [-2.0, -1.0, 0, 1.0, 2.0], hs = [2.9, 3.6, 4.1, 3.6, 2.9];
    const col = (i) => () => { const x = xs[i], h = hs[i], y = -2.1 + k.r() * h, a = Math.floor(k.r() * 8) * TAU / 8; return [x + Math.cos(a) * 0.2 + k.J(0.006), y, Math.sin(a) * 0.2]; };
    const caps = (i) => () => { const x = xs[i], y = -2.1 + hs[i], a = k.r() * TAU; return k.r() < 0.5 ? [x + Math.cos(a) * 0.32, y + k.J(0.01), Math.sin(a) * 0.32] : [x + (k.r() - 0.5) * 0.7, y + 0.14 + k.J(0.008), (k.r() < 0.5 ? -1 : 1) * 0.3]; };
    const bases = (i) => () => { const a = k.r() * TAU; return [xs[i] + Math.cos(a) * 0.3, -2.1 + k.J(0.01), Math.sin(a) * 0.3]; };
    return [[0.5, k.many([0, 1, 2, 3, 4].map(col))], [0.18, k.many([0, 1, 2, 3, 4].map(caps))], [0.1, k.many([0, 1, 2, 3, 4].map(bases))], [0.08, k.seg([-2.5, -2.2, 0], [2.5, -2.2, 0], 0.02)], [0.08, k.box(-2.5, 2.5, -2.4, -2.2, -0.5, 0.5, 0.01)], [0.06, k.dust(4.3)]];
  },
  // السحاب: سحابة كبيرة بطبقات
  cloud: (k) => {
    const bumps = [[-1.55, -0.2, 0.75], [-0.75, 0.45, 0.95], [0.35, 0.65, 1.05], [1.4, 0.15, 0.85]];
    const outline = (z, s) => k.many(bumps.map(([x, y, R]) => k.arc(x * s, y * s + 0.1, R * s, -0.05, Math.PI + 0.05, 0.016, z)));
    const base = (z) => k.seg([-2.3, -0.15, z], [2.25, -0.15, z], 0.016);
    const fill = () => { const [x, y, R] = bumps[Math.floor(k.r() * 4)], a = k.r() * Math.PI, q = Math.sqrt(k.r()) * R; return [x + Math.cos(a) * q, Math.max(-0.15, y + 0.1 + Math.sin(a) * q * 0.9), k.J(0.25)]; };
    const strokes = () => { const i = Math.floor(k.r() * 3), y = -0.6 - i * 0.35, x0 = -1.6 + i * 0.4; return [x0 + k.r() * (2.6 - i * 0.6), y + k.J(0.012), k.J(0.1)]; };
    return [[0.38, outline(0.2, 1)], [0.14, outline(-0.25, 0.92)], [0.1, base(0)], [0.18, fill], [0.12, strokes], [0.08, k.dust(4.2)]];
  },
  // الريح: إعصار حلزوني يضيق نحو الأسفل وخطوط ريح أفقية
  wind_swirl: (k) => {
    const helix = () => { const v = k.r(), y = -2.1 + v * 4.0, R = 0.18 + v * 1.65, a = v * 7 * TAU + k.J(0.05); return [Math.cos(a) * R + Math.sin(v * 5) * 0.15, y + k.J(0.02), Math.sin(a) * R * 0.75]; };
    const rings = () => { const i = Math.floor(k.r() * 6), v = (i + 0.5) / 6, R = 0.18 + v * 1.65, a = k.r() * TAU; return [Math.cos(a) * R, -2.1 + v * 4.0 + k.J(0.015), Math.sin(a) * R * 0.75]; };
    const streaks = () => { const i = Math.floor(k.r() * 5), y = -1.6 + i * 0.75, x = (i % 2 ? 1 : -1) * (1.2 + k.r() * 1.3); return [x, y + Math.sin(x * 3) * 0.06 + k.J(0.01), k.J(0.2)]; };
    return [[0.45, helix], [0.2, rings], [0.22, streaks], [0.13, k.dust(4.4)]];
  },
  // النجاة: أنوار صغيرة آمنة داخل قبة رحمة، والريح تدور خارجها
  small_lights_safe: (k) => {
    const dome = () => { const a = k.r() * Math.PI, ph = k.r() * Math.PI; return [Math.cos(a) * 1.6 * Math.sin(ph) + k.J(0.01), -1.6 + Math.sin(a) * 1.9 * Math.sin(ph), Math.cos(ph) * 1.0]; };
    const domeRim = k.ellipse(0, -1.6, 1.6, 0.45, 0, TAU, 0.014);
    const domeArc = k.arc(0, -1.6, 1.6, 0, Math.PI, 0.014);
    const lights = k.many([[-0.8, -1.2], [-0.3, -0.9], [0.25, -1.25], [0.75, -0.95], [0, -0.45], [-0.55, -0.4], [0.55, -0.45]].map(([x, y]) => k.glow(x, y, 0.13)));
    const wind = () => { const a = k.r() * TAU, R = 2.25 + Math.sin(a * 3) * 0.12; return [Math.cos(a) * R, -0.6 + Math.sin(a) * 1.65 + k.J(0.02), Math.sin(a * 2) * 0.4]; };
    return [[0.12, dome], [0.08, domeRim], [0.2, domeArc], [0.28, lights], [0.18, wind], [0.06, k.seg([-2.4, -1.6, 0], [2.4, -1.6, 0], 0.012)], [0.08, k.dust(4.3)]];
  },
  // ======== صالح ========
  // بيوت الجبال: جبل منحوت فيه أبواب مقوسة
  rock_houses: (k) => {
    const outline = k.poly([[-2.55, -2.2], [-2.35, -1.3], [-2.0, -0.9], [-1.95, -0.3], [-1.5, 0.15], [-1.3, 0.7], [-0.85, 0.85], [-0.55, 1.4], [-0.1, 1.3], [0.3, 1.65], [0.75, 1.2], [1.15, 1.05], [1.45, 0.45], [1.85, 0.2], [2.05, -0.6], [2.35, -1.1], [2.55, -2.2]], false, 0.016);
    const strata = () => { const i = Math.floor(k.r() * 4), y = -1.7 + i * 0.75, w = 2.3 - i * 0.45; return [(k.r() * 2 - 1) * w, y + Math.sin(k.r() * 8) * 0.04, 0.1]; };
    const door = (x, y, w, h) => k.many([k.seg([x - w, y, 0.2], [x - w, y + h, 0.2], 0.008), k.seg([x + w, y, 0.2], [x + w, y + h, 0.2], 0.008), k.arc(x, y + h, w, 0, Math.PI, 0.008, 0.2), k.seg([x - w, y, 0.2], [x + w, y, 0.2], 0.008)]);
    const doors = k.many([door(-1.5, -2.0, 0.25, 0.55), door(-0.45, -2.0, 0.3, 0.7), door(0.75, -2.0, 0.25, 0.55), door(1.75, -2.0, 0.22, 0.45), door(-0.95, -0.6, 0.2, 0.4), door(0.2, -0.55, 0.22, 0.45), door(1.15, -0.7, 0.18, 0.35), door(-0.2, 0.55, 0.17, 0.32)]);
    const inside = () => { const pts = [[-1.5, -2.0, 0.25, 0.55], [-0.45, -2.0, 0.3, 0.7], [0.75, -2.0, 0.25, 0.55], [-0.95, -0.6, 0.2, 0.4], [0.2, -0.55, 0.22, 0.45]]; const [x, y, w, h] = pts[Math.floor(k.r() * pts.length)]; return [x + (k.r() * 2 - 1) * w * 0.8, y + k.r() * h, -0.1]; };
    const depthEdge = k.poly([[-2.3, -2.2, -0.8], [-1.6, -0.2, -0.8], [-0.7, 0.9, -0.8], [0.3, 1.2, -0.8], [1.3, 0.5, -0.8], [2.3, -2.2, -0.8]], false, 0.016);
    return [[0.28, outline], [0.1, depthEdge], [0.14, strata], [0.34, doors], [0.07, inside], [0.07, k.dust(4.2)]];
  },
  // ناقة الله: ناقة بخطوط واضحة (منظر جانبي)
  camel: (k) => {
    const body = [[-1.8, 0.25], [-1.55, 0.7], [-1.05, 1.15], [-0.55, 1.3], [-0.1, 1.05], [0.25, 0.6], [0.5, 0.55], [0.95, 0.95], [1.3, 1.45], [1.55, 1.7], [1.95, 1.75], [2.25, 1.55], [2.3, 1.38], [1.95, 1.33], [1.65, 1.2], [1.35, 0.6], [1.0, -0.05], [0.75, -0.35], [0.2, -0.45], [-0.6, -0.45], [-1.3, -0.4], [-1.75, -0.1]];
    const out = (z) => k.poly(body.map(([x, y]) => [x - 0.2, y + 0.15, z]), true, 0.012);
    const leg = (x0, x1, z) => k.poly([[x0 - 0.2, -0.3, z], [x0 - 0.22, -1.25, z], [x1 - 0.2, -1.35, z], [x1 - 0.2, -2.25, z], [x1 - 0.05, -2.25, z]], false, 0.012);
    const legs = k.many([leg(0.75, 0.8, 0.22), leg(0.45, 0.45, -0.22), leg(-1.1, -1.15, 0.22), leg(-1.4, -1.45, -0.22)]);
    const tail = k.curve((u) => [-2.0 - Math.sin(u * 2) * 0.12, 0.35 - u * 0.95, 0], 0.01);
    const hump = () => { const a = k.r() * Math.PI, x = -0.85 + Math.cos(a) * 0.62, y = 0.6 + Math.sin(a) * 0.82; return [x, y, k.J(0.3)]; };
    const fillBody = () => [-1.7 + k.r() * 2.6, -0.2 + k.r() * 0.75, k.J(0.18)];
    return [[0.3, out(0.25)], [0.18, out(-0.25)], [0.26, legs], [0.04, tail], [0.06, hump], [0.06, fillBody], [0.03, k.glow(1.8, 1.62, 0.05, 0.27)], [0.07, k.ground(-2.3, 2.3)]];
  },
  // قسمة الماء: حوض ماء مقسوم نصفين، وفوق كل نصف شمس (يوم لها ويوم لهم)
  water_share: (k) => {
    const rim = k.ellipse(0, -1.2, 2.2, 0.75, 0, TAU, 0.015);
    const rimLow = k.ellipse(0, -1.75, 2.2, 0.75, 0, Math.PI * 2, 0.015);
    const ripples = () => { const i = Math.floor(k.r() * 3), side = k.r() < 0.5 ? -1 : 1, a = k.r() * TAU; return [side * 1.1 + Math.cos(a) * (0.25 + i * 0.22), -1.2 + Math.sin(a) * (0.08 + i * 0.07), 0]; };
    const water = () => { const a = k.r() * TAU, q = Math.sqrt(k.r()); return [Math.cos(a) * 2.1 * q, -1.2 + Math.sin(a) * 0.7 * q, 0]; };
    const divider = k.seg([0, -1.95, 0.75], [0, -0.45, -0.75], 0.012);
    const suns = k.many([sun(k, -1.15, 0.95, 0.42, 10), sun(k, 1.15, 0.95, 0.42, 10)]);
    return [[0.22, rim], [0.08, rimLow], [0.14, ripples, 1], [0.12, water], [0.1, divider], [0.28, suns], [0.06, k.dust(4.2)]];
  },
  // ======== إبراهيم ========
  // الكوكب: نجمة كبيرة بعمق
  star: (k) => [[0.35, k.star(0, 0.1, 1.85, 0.014, 0.18)], [0.25, k.star(0, 0.1, 1.85, 0.014, -0.18)], [0.12, k.many([0, 1, 2, 3, 4].map((m) => { const a = -Math.PI / 2 + m * TAU / 5; return k.seg([Math.cos(a) * 1.85, 0.1 - Math.sin(a) * 1.85, 0.18], [Math.cos(a) * 1.85, 0.1 - Math.sin(a) * 1.85, -0.18], 0.01); }))], [0.12, k.glow(0, 0.1, 0.35)], [0.06, k.seg([-2.4, -2.2, 0], [2.4, -2.2, 0], 0.012)], [0.1, k.dust(4.3)]],
  // القمر: هلال كبير فوق الأفق (يغيب)
  moon: (k) => [[0.42, crescent(k, -0.2, 0.3, 1.9)], [0.12, k.move(crescent(k, -0.2, 0.3, 1.9), 0, 0, 1)], [0.2, crescentFill(k, -0.2, 0.3, 1.9)], [0.1, k.seg([-2.5, -2.2, 0], [2.5, -2.2, 0], 0.014)], [0.06, k.many([k.glow(1.9, 1.5, 0.08), k.glow(2.2, 0.5, 0.06), k.glow(1.6, -0.6, 0.07)])], [0.1, k.dust(4.3)]],
  // النار بردًا وسلامًا: لهب هادئ متداخل، ونسيم بارد حوله
  flame_calm: (k) => {
    // محيط اللهب: قطرة مقلوبة رأسها مدبب للأعلى وقاعها مستدير، مع تموج خفيف
    const drop = (s, dx, z) => k.curve((u) => { const t = u * TAU; return [dx + Math.sin(t) * Math.sin(t / 2) * 0.95 * s + Math.sin(t * 3) * 0.04 * s, -1.75 + s * 3.4 * Math.cos(t / 2) ** 2, z]; }, 0.014);
    const ring = () => { const i = Math.floor(k.r() * 3), a = k.r() * TAU, R = 1.75 + i * 0.3; return [Math.cos(a) * R, -1.0 + i * 0.55 + Math.sin(a * 2) * 0.08, Math.sin(a) * R * 0.5]; };
    return [[0.3, drop(1, 0, 0)], [0.16, drop(0.62, -0.05, 0.1)], [0.1, drop(0.32, 0.03, 0.2)], [0.12, () => { const v = k.r(); return [k.J(0.45 * (1 - v)), -1.6 + v * 2.7, k.J(0.2)]; }, 3], [0.2, ring], [0.06, k.ellipse(0, -1.8, 1.4, 0.35, 0, TAU, 0.015)], [0.06, k.dust(4.2)]];
  },
  // ======== لوط ========
  // النصيحة: فانوس مضيء بمقبض
  lantern: (k) => {
    const W0 = 0.9, W1 = 0.75, y0 = -1.7, y1 = 0.6;
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    const posts = k.many(corners.map(([a, b]) => k.seg([a * W0, y0, b * W0 * 0.8], [a * W1, y1, b * W1 * 0.8], 0.01)));
    const ringAt = (y, W) => k.many(corners.map(([a, b], i) => { const [c, d] = corners[(i + 1) % 4]; return k.seg([a * W, y, b * W * 0.8], [c * W, y, d * W * 0.8], 0.01); }));
    const cap = () => { const v = k.r(), a = k.r() * TAU, R = W1 * (1 - v); return [Math.cos(a) * R, y1 + v * 0.6, Math.sin(a) * R * 0.8]; };
    const handle = k.arc(0, y1 + 0.75, 0.42, 0, Math.PI, 0.012);
    const base = () => { const a = k.r() * TAU; return [Math.cos(a) * 1.05, y0 - 0.15 + k.J(0.01), Math.sin(a) * 0.85]; };
    const flameIn = k.curve((u) => { const t = u * TAU; return [Math.sin(t) * 0.22 * Math.abs(Math.sin(t / 2)), -1.1 + 0.9 * Math.cos(t / 2) ** 2, 0]; }, 0.01);
    const rays = () => { const a = Math.floor(k.r() * 12) * TAU / 12, q = 1.45 + k.r() * 0.6; return [Math.cos(a) * q, -0.55 + Math.sin(a) * q, k.J(0.02)]; };
    return [[0.26, posts], [0.1, ringAt(y0, W0)], [0.1, ringAt(y1, W1)], [0.08, cap], [0.06, handle], [0.06, base], [0.1, flameIn], [0.06, k.glow(0, -0.75, 0.32)], [0.12, rays], [0.06, k.dust(4.2)]];
  },
  // السير ليلًا: طريق يمتد بعيدًا تحت هلال ونجوم
  moon_road: (k) => {
    const V = [0.2, -0.35]; // نقطة التلاشي عند الأفق
    const edge = (x0) => k.curve((u) => [x0 + (V[0] - x0) * u, -2.4 + (V[1] + 2.4) * u, -1 + u * 1.2], 0.012);
    const dashes = () => { const i = Math.floor(k.r() * 6), t0 = i / 6, u = t0 + k.r() * 0.08; return [0 + (V[0]) * u + k.J(0.01), -2.4 + (V[1] + 2.4) * u, -1 + u * 1.2]; };
    const horizon = k.seg([-2.5, -0.35, 0.2], [2.5, -0.35, 0.2], 0.012);
    const hills = k.curve((u) => { const x = -2.5 + u * 5; return [x, -0.35 + 0.25 * Math.max(0, Math.sin(x * 1.3 + 1)) + 0.15 * Math.max(0, Math.sin(x * 2.1)), 0.2]; }, 0.012);
    return [[0.18, edge(-2.2)], [0.18, edge(2.4)], [0.1, dashes], [0.06, horizon], [0.08, hills], [0.22, crescent(k, 1.2, 1.35, 0.7)], [0.06, crescentFill(k, 1.2, 1.35, 0.7)], [0.06, sprinkle(k, 7, -2.2, 0.3, 0.4, 1.9, 0.06)], [0.06, k.dust(4.2)]];
  },
  // إلى الأمام: آثار أقدام تمضي للأمام
  footsteps_forward: (k) => {
    const foot = (x, y, s, side, z) => k.mix([
      [0.7, k.ellipse(x, y, 0.2 * s, 0.42 * s, 0, TAU, 0.008, z)],
      [0.3, k.many([0, 1, 2, 3, 4].map((t) => k.arc(x + side * (-0.16 + t * 0.075) * s, y + (0.52 - Math.abs(t - 1.5) * 0.04) * s, (0.06 - t * 0.006) * s, 0, TAU, 0.004, z)))],
    ]);
    const steps = k.many(Array.from({ length: 6 }, (_, i) => { const s = 1.35 - i * 0.16, side = i % 2 ? 1 : -1; return foot(side * 0.42 * s, -1.9 + i * 0.72 - i * i * 0.02, s, side, -i * 0.15); }));
    const arrow = k.poly([[-0.35, 1.75], [0, 2.1], [0.35, 1.75]], false, 0.01);
    return [[0.68, steps], [0.08, arrow], [0.06, k.seg([0, 1.3, 0], [0, 2.05, 0], 0.01)], [0.1, k.ground(-2.3, 2.2)], [0.08, k.dust(4.2)]];
  },
  // الصبح: شمس تشرق من الأفق
  sunrise: (k) => {
    const half = k.arc(0, -0.9, 1.25, 0, Math.PI, 0.016);
    const fill = () => { const a = k.r() * Math.PI, q = Math.sqrt(k.r()) * 1.15; return [Math.cos(a) * q, -0.9 + Math.sin(a) * q, k.J(0.06)]; };
    const rays = () => { const a = (Math.floor(k.r() * 9) + 0.5) * Math.PI / 9, q = 1.55 + k.r() * 0.75; return [Math.cos(a) * q, -0.9 + Math.sin(a) * q, k.J(0.02)]; };
    const horizon = k.seg([-2.5, -0.9, 0], [2.5, -0.9, 0], 0.014);
    const light = () => { const i = Math.floor(k.r() * 5), y = -1.15 - i * 0.28, w = 2.3 - i * 0.35; return [(k.r() * 2 - 1) * w, y + k.J(0.01), k.J(0.1)]; };
    return [[0.28, half], [0.12, fill], [0.26, rays], [0.1, horizon], [0.16, light, 1], [0.08, k.dust(4.2)]];
  },
  // ======== إسماعيل ========
  // زمزم: بئر حجري مستدير والماء ينبع منه
  spring_zamzam: (k) => {
    const R = 1.35, y0 = -2.0, y1 = -0.9;
    const rings = () => { const y = [y0, y1, y1 + 0.12][Math.floor(k.r() * 3)], a = k.r() * TAU; return [Math.cos(a) * R, y + k.J(0.01), Math.sin(a) * R * 0.75]; };
    const stones = () => { const row = Math.floor(k.r() * 3), y = y0 + row * 0.37, a = (Math.floor(k.r() * 10) + (row % 2) * 0.5) * TAU / 10; return k.r() < 0.5 ? [Math.cos(a) * R, y + k.r() * 0.37, Math.sin(a) * R * 0.75] : [Math.cos(a + k.r() * TAU / 10) * R, y, Math.sin(a + k.r() * TAU / 10) * R * 0.75]; };
    const fountain = () => { const a = Math.floor(k.r() * 10) * TAU / 10 + k.J(0.02), v = k.r(), d = v * 1.3; return [Math.cos(a) * d, y1 + 0.1 + 2.2 * v * (1.15 - v) * 2.2 - v * 0.6, Math.sin(a) * d * 0.6]; };
    const jet = () => { const v = k.r(); return [k.J(0.05), y1 + v * 2.2, k.J(0.05)]; };
    const water = () => { const a = k.r() * TAU, q = Math.sqrt(k.r()) * R * 0.9; return [Math.cos(a) * q, y1 + 0.02, Math.sin(a) * q * 0.75]; };
    const drops = () => { const a = Math.floor(k.r() * 8) * TAU / 8, v = k.r(); return [Math.cos(a) * (0.5 + v * 1.2), y1 + 1.4 - v * v * 1.6, Math.sin(a) * (0.5 + v * 1.2) * 0.6]; };
    return [[0.18, rings], [0.18, stones], [0.22, fountain], [0.08, jet, 2], [0.1, water, 1], [0.08, drops], [0.08, k.ground(-2.05, 2.4)], [0.08, k.dust(4.2)]];
  },
  // الذبح العظيم: كبش بقرن ملتف وصوف
  ram: (k) => {
    const bodyC = [-0.45, -0.1], RX = 1.45, RY = 0.85;
    const wool = (z, s) => () => { const a = k.r() * TAU, rr = 1 + 0.07 * Math.sin(a * 11); return [bodyC[0] + Math.cos(a) * RX * rr * s, bodyC[1] + Math.sin(a) * RY * rr * s + k.J(0.012), z]; };
    const curls = () => { const a = k.r() * TAU, q = Math.sqrt(k.r()) * 0.85, c = [bodyC[0] + Math.cos(a) * RX * q, bodyC[1] + Math.sin(a) * RY * q], b = k.r() * TAU; return [c[0] + Math.cos(b) * 0.09, c[1] + Math.sin(b) * 0.09, k.J(0.3)]; };
    const head = k.curve((u) => { const t = u * TAU, x = Math.cos(t) * 0.55, y = Math.sin(t) * 0.3, a = -0.75; return [1.4 + x * Math.cos(a) - y * Math.sin(a), 0.35 + x * Math.sin(a) + y * Math.cos(a), 0.05]; }, 0.01);
    const neck = k.many([k.seg([0.85, 0.55], [1.15, 0.85], 0.01), k.seg([0.95, -0.15], [1.45, 0.0], 0.01)]);
    const horn = (z) => k.curve((u) => { const a = 0.9 + u * 1.85 * TAU, R = 0.5 * (1 - u * 0.78); return [1.12 + Math.cos(a) * R, 0.95 + Math.sin(a) * R * 0.9, z]; }, 0.01);
    const leg = (x, z) => k.seg([x, -0.75, z], [x + 0.03, -2.2, z], 0.012);
    const legs = k.many([leg(0.45, 0.2), leg(0.2, -0.2), leg(-1.15, 0.2), leg(-1.4, -0.2)]);
    const hooves = k.many([0.45, 0.2, -1.15, -1.4].map((x) => k.seg([x - 0.08, -2.2, 0], [x + 0.12, -2.2, 0], 0.008)));
    return [[0.26, wool(0.3, 1)], [0.14, wool(-0.3, 0.95)], [0.12, curls], [0.1, head], [0.04, neck], [0.12, horn(0.15)], [0.04, horn(-0.1)], [0.1, legs], [0.03, hooves], [0.02, k.glow(1.62, 0.42, 0.05, 0.12)], [0.03, k.ground(-2.25, 2.2)]];
  },
  // بناء الكعبة: جدران قيد البناء وحجارة ترتفع مدماكًا فوق مدماك
  kaaba_stones: (k) => {
    const W = 1.35, D = 1.1, Y0 = -2.0;
    const courses = () => { const row = Math.floor(k.r() * 5), y = Y0 + row * 0.38, face = Math.floor(k.r() * 4), u = k.r() * 2 - 1; const p = face === 0 ? [u * W, y, D] : face === 1 ? [u * W, y, -D] : face === 2 ? [W, y, u * D] : [-W, y, u * D]; return k.r() < 0.6 ? [p[0], p[1] + k.J(0.008), p[2]] : (() => { const n = 7, s = Math.floor((u + 1) / 2 * n) + (row % 2) * 0.5, x = -1 + (s / n) * 2; const q = face === 0 ? [x * W, y + k.r() * 0.38, D] : face === 1 ? [x * W, y + k.r() * 0.38, -D] : face === 2 ? [W, y + k.r() * 0.38, x * D] : [-W, y + k.r() * 0.38, x * D]; return q; })(); };
    const corners = k.many([[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => k.seg([a * W, Y0, b * D], [a * W, Y0 + 1.9, b * D], 0.01)));
    const rising = k.many([[0.55, 0.25], [-0.2, 0.55], [0.25, 0.95], [-0.45, 1.3], [0.1, 1.7]].map(([x, y]) => brick(k, x, y, 0.55, 0.3, 0.38, 0.4)));
    const ground = k.many([brick(k, -2.0, -2.05, 0.6, 0.3, 0.4, 0.6), brick(k, 2.0, -2.05, 0.55, 0.3, 0.4, -0.3), brick(k, 1.85, -1.75, 0.5, 0.28, 0.36, -0.3)]);
    return [[0.44, courses], [0.1, corners], [0.24, rising], [0.1, ground], [0.06, k.ground(-2.1, 2.5)], [0.06, k.dust(4.2)]];
  },
  // ======== إسحاق ========
  // البشارة: بذرة في الأرض ونور يصعد منها
  seed_light: (k) => {
    const seed = (z) => k.curve((u) => { const t = u * TAU; return [Math.sin(t) * 0.42 * (1 - 0.25 * Math.cos(t)), -1.2 + Math.cos(t) * 0.62, z]; }, 0.01);
    const line = k.curve((u) => [Math.sin(u * 3) * 0.05, -1.75 + u * 1.1, 0.12], 0.008);
    const light = () => { const v = k.r(), th = k.r() * TAU, q = Math.sqrt(k.r()) * (0.15 + v * 0.65); return [Math.cos(th) * q, -0.5 + v * 2.6, Math.sin(th) * q * 0.6]; };
    const soil = () => { const i = Math.floor(k.r() * 3), y = -1.95 - i * 0.18; return [(k.r() * 2 - 1) * (2.4 - i * 0.4), y + k.J(0.012), k.J(0.4)]; };
    const rays = () => { const a = Math.PI * (0.2 + Math.floor(k.r() * 7) / 6 * 0.6), q = 1.6 + k.r() * 0.6; return [Math.cos(a) * q, -1.0 + Math.sin(a) * q * 1.4, k.J(0.02)]; };
    return [[0.24, seed(0.1)], [0.1, seed(-0.1)], [0.05, line], [0.24, light, 3], [0.14, soil], [0.15, rays], [0.08, k.dust(4.2)]];
  },
  // ومن ورائه يعقوب: شتلة صغيرة بورقتين وبرعم
  sapling: (k) => {
    const stem = limb(k, [0, -2.0, 0], [0.05, 0.6, 0], 0.08, 0.04);
    const leaf = (bx, by, ang, L) => k.mix([
      [0.75, k.curve((u) => { const t = u * TAU, lx = L / 2 + Math.cos(t) * L / 2, ly = Math.sin(t) * L * 0.22 * Math.abs(Math.sin(t / 2)) * 1.6; return [bx + lx * Math.cos(ang) - ly * Math.sin(ang), by + lx * Math.sin(ang) + ly * Math.cos(ang), k.J(0.02)]; }, 0.008)],
      [0.25, k.seg([bx, by], [bx + L * Math.cos(ang), by + L * Math.sin(ang)], 0.006)],
    ]);
    const leaves = k.many([leaf(0.02, -0.9, 0.45, 1.5), leaf(0.02, -0.5, Math.PI - 0.5, 1.4), leaf(0.04, 0.2, 0.7, 0.9), leaf(0.04, 0.35, Math.PI - 0.75, 0.85)]);
    const bud = k.ellipse(0.05, 0.85, 0.16, 0.28, 0, TAU, 0.008);
    const roots = k.many([-0.6, -0.25, 0.3, 0.7].map((x) => k.curve((u) => [x * u * 1.4, -2.05 - u * 0.4 + Math.sin(u * 4) * 0.05, k.J(0.1)], 0.01)));
    return [[0.14, stem], [0.4, leaves], [0.08, bud], [0.06, k.glow(0.05, 1.45, 0.14)], [0.12, roots], [0.12, k.ground(-2.05, 2.1)], [0.08, k.dust(4.2)]];
  },
  // شجرة النجوم: فروع تنتهي بنجوم (النبوة في ذريته)
  star_tree: (k) => {
    const tips = [];
    const branches = [];
    const grow = (x, y, ang, len, depth) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      branches.push([[x, y, depth * 0.08], [x2, y2, depth * 0.08], 0.1 / (depth + 1)]);
      if (depth >= 2) { tips.push([x2, y2]); return; }
      grow(x2, y2, ang + 0.55, len * 0.66, depth + 1);
      grow(x2, y2, ang - 0.55, len * 0.66, depth + 1);
    };
    grow(0, -2.2, Math.PI / 2, 1.55, 0);
    const wood = k.many(branches.map(([a, b, t]) => limb(k, a, b, t, t * 0.6)));
    const stars = k.many(tips.map(([x, y]) => k.star(x, y + 0.15, 0.3, 0.008)));
    const glows = k.many(tips.map(([x, y]) => k.glow(x, y + 0.15, 0.08)));
    return [[0.36, wood], [0.38, stars], [0.08, glows], [0.08, k.ground(-2.25, 1.8)], [0.1, k.dust(4.3)]];
  },
  // ======== يعقوب ========
  // الحزن: دمعة كبيرة وقطرات صغيرة
  tear: (k) => {
    // قطرة: رأس مدبب للأعلى وقاع مستدير
    const tearShape = (cx, cy, s, z) => k.curve((u) => { const t = u * TAU; const x = Math.sin(t) * (1 - Math.cos(t)) * 0.5; const y = Math.cos(t); return [cx + x * s * 1.3, cy + y * s * 1.25, z]; }, 0.012);
    const fill = () => { const t = k.r() * TAU, q = Math.sqrt(k.r()); const x = Math.sin(t) * (1 - Math.cos(t)) * 0.5, y = Math.cos(t); return [x * 1.6 * 1.3 * q, 0.2 + y * 1.6 * 1.25 * q, k.J(0.1)]; };
    const shine = k.arc(-0.2, -0.45, 0.75, Math.PI * 0.95, Math.PI * 1.3, 0.008, 0.25);
    const small = k.many([tearShape(1.85, -1.5, 0.32, 0), tearShape(-1.9, -1.2, 0.24, 0), tearShape(2.0, 0.6, 0.2, 0)]);
    return [[0.36, tearShape(0, 0.2, 1.6, 0.18)], [0.18, tearShape(0, 0.2, 1.6, -0.18)], [0.12, fill], [0.08, shine], [0.18, small], [0.08, k.dust(4.2)]];
  },
  // الشكوى إلى الله: كفّان مرفوعتان بالدعاء (محيط فقط) ونور يصعد بينهما
  hands_dua: (k) => {
    // محيط كف مفتوحة (اليمنى ثم نعكسها): الرسغ في الأسفل، أربع أصابع للأعلى، والإبهام نحو الوسط
    const hand = (side) => {
      const pts = [[1.8, -2.2], [1.98, -0.9], [2.05, 0.3]];
      const fingers = [[2.05, 1.78, 0.95], [1.78, 1.5, 1.3], [1.5, 1.22, 1.42], [1.22, 0.95, 1.22]];
      fingers.forEach(([xo, xi, top]) => {
        const w = (xo - xi) / 2, c = (xo + xi) / 2;
        pts.push([xo, top - w]);
        for (let s2 = 0; s2 <= 8; s2++) { const a = Math.PI * (s2 / 8); pts.push([c + Math.cos(a) * w, top - w + Math.sin(a) * w]); }
        pts.push([xi, 0.3]);
      });
      pts.push([0.95, 0.15], [0.72, 0.0], [0.5, 0.28], [0.36, 0.3], [0.33, 0.15], [0.55, -0.35], [0.8, -1.0], [0.95, -2.2]);
      return k.poly(pts.map(([x, y]) => [side * x, y, 0]), false, 0.01);
    };
    const palm = (side) => k.curve((u) => [side * (1.25 + Math.sin(u * Math.PI) * 0.12), -1.6 + u * 1.3, 0.05], 0.01);
    const light = () => { const v = k.r(); return [k.J(0.12 + v * 0.25), -1.6 + v * 3.6, k.J(0.15)]; };
    return [[0.33, hand(-1)], [0.33, hand(1)], [0.06, palm(-1)], [0.06, palm(1)], [0.14, light, 3], [0.08, k.dust(4.2)]];
  },
  // القميص: قميص بأكمام وياقة، ونور يصعد منه
  shirt: (k) => {
    const out = (z) => k.poly([[-0.55, 1.75, z], [-1.5, 1.45, z], [-2.35, 0.55, z], [-1.85, 0.05, z], [-1.25, 0.6, z], [-1.25, -2.0, z], [1.25, -2.0, z], [1.25, 0.6, z], [1.85, 0.05, z], [2.35, 0.55, z], [1.5, 1.45, z], [0.55, 1.75, z]], false, 0.012);
    const collar = (z) => k.curve((u) => { const a = Math.PI + u * Math.PI; return [Math.cos(a) * 0.55, 1.75 + Math.sin(a) * 0.4, z]; }, 0.01);
    const placket = k.seg([0, 1.35, 0.16], [0, -0.3, 0.16], 0.008);
    const buttons = k.many([1.0, 0.55, 0.1].map((y) => k.arc(0.12, y, 0.06, 0, TAU, 0.004, 0.17)));
    const fold = k.many([k.curve((u) => [-0.7 + Math.sin(u * 3) * 0.08, 0.6 - u * 2.4, 0.16], 0.01), k.curve((u) => [0.75 + Math.sin(u * 3 + 1) * 0.08, 0.5 - u * 2.3, 0.16], 0.01)]);
    const light = () => { const v = k.r(); return [(k.r() * 2 - 1) * (1.2 - v * 0.8), -0.5 + v * 2.6, k.J(0.3)]; };
    return [[0.34, out(0.15)], [0.18, out(-0.15)], [0.08, collar(0.15)], [0.06, placket], [0.04, buttons], [0.1, fold], [0.12, light, 3], [0.08, k.dust(4.2)]];
  },
  // عاد بصيرًا: عين مضيئة بأشعة نور
  eye_light: (k) => {
    const lid = (sgn, z) => k.curve((u) => { const x = -2.1 + u * 4.2; return [x, sgn * 0.95 * (1 - (x / 2.1) ** 2), z]; }, 0.012);
    const iris = k.arc(0, 0, 0.72, 0, TAU, 0.012, 0.1);
    const pupil = k.disc(0, 0, 0.3, 0.12, 0.03);
    const shine = k.glow(0.28, 0.28, 0.1, 0.2);
    const rays = () => { const a = Math.floor(k.r() * 16) * TAU / 16, q = 1.5 + k.r() * 0.75; const x = Math.cos(a) * q * 1.35, y = Math.sin(a) * q * 0.95; return [x, y, k.J(0.02)]; };
    return [[0.18, lid(1, 0.1)], [0.18, lid(-1, 0.1)], [0.06, lid(1, -0.12)], [0.06, lid(-1, -0.12)], [0.18, iris], [0.08, pupil], [0.04, shine], [0.16, rays], [0.06, k.dust(4.3)]];
  },
  // ======== يوسف ========
  // الرؤيا: الشمس والقمر وأحد عشر كوكبًا (نقاط مضيئة مستديرة) في قوس فوقهما
  planets11_sun_moon: (k) => {
    const pos = Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (0.06 + i * 0.088); return [Math.cos(a) * 2.35, -0.05 + Math.sin(a) * 1.95]; });
    return [[0.28, sun(k, -1.0, -0.95, 0.68, 12)], [0.2, crescent(k, 1.15, -0.95, 0.75)], [0.06, crescentFill(k, 1.15, -0.95, 0.75)], [0.38, eleven(k, pos, 0.14)], [0.08, k.dust(4.2)]];
  },
  // تحققت الرؤيا: الشمس والقمر في الأعلى، والأحد عشر كوكبًا منخفضة ساجدة في قوس أسفلهما بنور أقوى
  planets11_sun_moon_glow: (k) => {
    const pos = Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (1.08 + i * 0.084); return [Math.cos(a) * 2.25, -0.3 + Math.sin(a) * 1.7]; });
    const halos = k.many(pos.map(([x, y]) => k.arc(x, y, 0.26, 0, TAU, 0.01)));
    return [[0.22, sun(k, -1.0, 1.15, 0.6, 12)], [0.16, crescent(k, 1.15, 1.15, 0.66)], [0.05, crescentFill(k, 1.15, 1.15, 0.66)], [0.34, eleven(k, pos, 0.16)], [0.1, halos], [0.07, () => { const [x, y] = pos[Math.floor(k.r() * 11)]; const v = k.r(); return [x + k.J(0.05), y + v * 0.7, k.J(0.05)]; }, 3], [0.06, k.dust(4.2)]];
  },
  // البئر: بئر حجري بسقف وبكرة ودلو، ونور داخله (والله معه)
  well: (k) => {
    const R = 1.25, y0 = -2.0, y1 = -0.75;
    const rings = () => { const y = [y0, y1][Math.floor(k.r() * 2)], a = k.r() * TAU; return [Math.cos(a) * R, y + k.J(0.01), Math.sin(a) * R * 0.7]; };
    const stones = () => { const row = Math.floor(k.r() * 3), y = y0 + row * 0.42, a = (Math.floor(k.r() * 9) + (row % 2) * 0.5) * TAU / 9; return k.r() < 0.5 ? [Math.cos(a) * R, y + k.r() * 0.42, Math.sin(a) * R * 0.7] : [Math.cos(k.r() * TAU) * R, y, 0]; };
    const posts = k.many([k.seg([-1.15, y1, 0], [-1.15, 1.3, 0], 0.014), k.seg([1.15, y1, 0], [1.15, 1.3, 0], 0.014)]);
    const roof = k.many([k.poly([[-1.6, 1.15, 0.5], [0, 2.0, 0.5], [1.6, 1.15, 0.5]], false, 0.012), k.poly([[-1.6, 1.15, -0.5], [0, 2.0, -0.5], [1.6, 1.15, -0.5]], false, 0.012), k.seg([0, 2.0, 0.5], [0, 2.0, -0.5], 0.01)]);
    const axle = k.seg([-1.15, 0.95, 0], [1.15, 0.95, 0], 0.012);
    const rope = k.seg([0.2, 0.95, 0], [0.2, -0.15, 0], 0.006);
    const bucket = k.many([k.ellipse(0.2, -0.15, 0.25, 0.08, 0, TAU, 0.006), k.ellipse(0.2, -0.55, 0.2, 0.06, 0, TAU, 0.006), k.seg([-0.05, -0.15], [0.0, -0.55], 0.006), k.seg([0.45, -0.15], [0.4, -0.55], 0.006)]);
    const light = () => { const a = k.r() * TAU, q = Math.sqrt(k.r()) * R * 0.8, v = k.r(); return [Math.cos(a) * q * (1 - v * 0.5), y1 + v * 1.2, Math.sin(a) * q * 0.6]; };
    return [[0.16, rings], [0.18, stones], [0.1, posts], [0.1, roof], [0.05, axle], [0.04, rope], [0.08, bucket], [0.15, light, 3], [0.06, k.ground(-2.05, 2.3)], [0.06, k.dust(4.2)]];
  },
  // السنابل السبع: حزمة من سبع سنابل قمح
  seven_ears: (k) => {
    const ears = Array.from({ length: 7 }, (_, i) => { const a = Math.PI / 2 + (i - 3) * 0.2; return { a, len: 3.4 - Math.abs(i - 3) * 0.18, z: ((i % 3) - 1) * 0.2 }; });
    const tie = [0, -1.3];
    const stalk = (e) => { const tx = tie[0] + Math.cos(e.a) * e.len * 0.6, ty = tie[1] + Math.sin(e.a) * e.len * 0.6; return { tx, ty }; };
    const stems = k.many(ears.map((e) => { const { tx, ty } = stalk(e); const bx = tie[0] - Math.cos(e.a) * 0.9, by = -2.25; return k.poly([[bx, by, e.z], [tie[0], tie[1], e.z], [tx, ty, e.z]], false, 0.008); }));
    const grains = k.many(ears.map((e) => { const { tx, ty } = stalk(e); return () => { const s = Math.floor(k.r() * 7), side = k.r() < 0.5 ? -1 : 1, u = s / 7; const cx = tx + Math.cos(e.a) * (u * 1.15), cy = ty + Math.sin(e.a) * (u * 1.15); const na = e.a + side * 0.6, gx = cx + Math.cos(na) * 0.13, gy = cy + Math.sin(na) * 0.13; const t = k.r() * TAU; return [gx + Math.cos(t) * 0.07 * Math.cos(na) - Math.sin(t) * 0.04 * Math.sin(na), gy + Math.cos(t) * 0.07 * Math.sin(na) + Math.sin(t) * 0.04 * Math.cos(na), e.z]; }; }));
    const awns = k.many(ears.map((e) => { const { tx, ty } = stalk(e); const ex = tx + Math.cos(e.a) * 1.2, ey = ty + Math.sin(e.a) * 1.2; return k.seg([ex, ey, e.z], [ex + Math.cos(e.a) * 0.45, ey + Math.sin(e.a) * 0.45, e.z], 0.005); }));
    const band = k.ellipse(0, -1.3, 0.3, 0.1, 0, TAU, 0.008);
    return [[0.22, stems], [0.48, grains], [0.1, awns], [0.06, band], [0.06, k.ground(-2.3, 1.8)], [0.08, k.dust(4.2)]];
  },
};

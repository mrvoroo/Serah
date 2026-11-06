// @ts-nocheck
// أشكال الأنبياء من موسى إلى محمد ﷺ (رموز الرحلة وأشكال صفحة النبي المتحولة بالضغط)
const PI = Math.PI;

// ---------- أدوات خاصة بهذا الملف ----------
// أنبوب حول منحنى c(u) بنصف قطر rad(u): للأجسام الطويلة (العصا، الثعبان، الجذع). ring = حلقات متقطعة
function tube(k, c, rad, j = 0.006, ring = 0) {
  return () => {
    const u = ring ? Math.round(k.r() * ring) / ring : k.r(), a = k.r() * k.TAU, p = c(u), e = 0.002;
    const p0 = c(Math.max(0, u - e)), p1 = c(Math.min(1, u + e));
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1], tz = (p1[2] || 0) - (p0[2] || 0);
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    let nx = -ty, ny = tx; const nl = Math.hypot(nx, ny);
    if (nl < 1e-4) { nx = 1; ny = 0; } else { nx /= nl; ny /= nl; }
    const bx = -tz * ny, by = tz * nx, bz = tx * ny - ty * nx;
    const q = rad(u), ca = Math.cos(a) * q, sa = Math.sin(a) * q;
    return [p[0] + nx * ca + bx * sa + k.J(j), p[1] + ny * ca + by * sa + k.J(j), (p[2] || 0) + bz * sa + k.J(j)];
  };
}
// سطح مجسم بيضاوي
const ell = (k, cx, cy, cz, rx, ry, rz, j = 0.008) => () => { const th = k.r() * k.TAU, ph = Math.acos(2 * k.r() - 1); return [cx + Math.sin(ph) * Math.cos(th) * rx + k.J(j), cy + Math.cos(ph) * ry + k.J(j), cz + Math.sin(ph) * Math.sin(th) * rz + k.J(j)]; };
// حلقة أفقية (في مستوى xz)
const ringXZ = (k, cx, y, cz, R, Rz = R, j = 0.01) => () => { const a = k.r() * k.TAU; return [cx + Math.cos(a) * R + k.J(j), y + k.J(j), cz + Math.sin(a) * Rz + k.J(j)]; };
// أسطوانة بالحواف: حلقتان + خطوط طولية
const cyl = (k, cx, y0, y1, R, n = 8) => { const g = k.mix([[0.35, ringXZ(k, cx, y0, 0, R)], [0.35, ringXZ(k, cx, y1, 0, R)], [0.3, () => { const a = Math.floor(k.r() * n) * k.TAU / n; return [cx + Math.cos(a) * R + k.J(0.008), y0 + (y1 - y0) * k.r(), Math.sin(a) * R + k.J(0.008)]; }]]);
  // إمالة خفيفة حتى تظهر الحلقات بيضاوية لا خطًا
  return () => { const p = g(); return [p[0], p[1] + p[2] * 0.3, p[2]]; }; };
// لهب شمعة: رأس مدبب لأعلى وقاع مستدير
const flame = (k, cx, fb, h, w, z = 0) => k.curve((t) => { const v = t * k.TAU; return [cx + w * Math.sin(v) * Math.sin(v / 2), fb + h - (h / 2) * (1 - Math.cos(v)), z]; }, 0.01);
// ورقة على شكل قلب (طرفها لأسفل) مع دوران
const heart = (k, cx, cy, s, rot = 0, z = 0) => k.curve((t) => {
  const v = t * k.TAU, x = 16 * Math.sin(v) ** 3, y = 13 * Math.cos(v) - 5 * Math.cos(2 * v) - 2 * Math.cos(3 * v) - Math.cos(4 * v);
  const X = (x * s) / 16, Y = (y * s) / 16, c = Math.cos(rot), sn = Math.sin(rot);
  return [cx + X * c - Y * sn, cy + X * sn + Y * c, z];
}, 0.008);
// دوران مولّد حول المحور x (إمالة للأمام)
const rotX = (gen, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return () => { const p = gen(); return [p[0], p[1] * c - (p[2] || 0) * s, p[1] * s + (p[2] || 0) * c]; }; };
// هل النقطة داخل مضلع
const inside = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
// نور يصعد ببطء من منطقة
const rising = (k, cx, cy, R, H) => () => { const a = k.r() * k.TAU, q = Math.sqrt(k.r()) * R; return [cx + Math.cos(a) * q, cy + k.r() * H, Math.sin(a) * q * 0.6]; };
// أشعة من مركز (phase يدير الأشعة حتى لا يقع شعاعان على المحورين فيكوّنا «+» داخل الدائرة)
const rays = (k, cx, cy, n, r0, r1, alt = 0.7, j = 0.012, phase = 0) => () => { const m = Math.floor(k.r() * n), a = (m * k.TAU) / n + phase, L = m % 2 ? r0 + (r1 - r0) * alt : r1, q = r0 + k.r() * (L - r0); return [cx + Math.cos(a) * q + k.J(j), cy + Math.sin(a) * q + k.J(j), k.J(0.03)]; };

// شمعة كاملة: جسم، فتيل، لهب خارجي وداخلي، توهج، هالة، ونور صاعد
const candleParts = (k, cx, base, h, R, s = 1) => [
  [0.3 * s, cyl(k, cx, base, base + h, R, 10)],
  [0.04 * s, k.seg([cx, base + h, 0], [cx, base + h + 0.12, 0], 0.006)],
  [0.18 * s, flame(k, cx, base + h + 0.06, 0.66, 0.26)],
  [0.08 * s, flame(k, cx, base + h + 0.1, 0.36, 0.12)],
  [0.08 * s, k.glow(cx, base + h + 0.32, 0.15)],
  [0.06 * s, () => { const a = k.r() * k.TAU, q = 0.45 + k.r() * 0.3; return [cx + Math.cos(a) * q, base + h + 0.35 + Math.sin(a) * q * 0.9, k.J(0.1)]; }],
  [0.06 * s, rising(k, cx, base + h + 0.5, 0.2, 1.0), 3],
];

// الميزان: عمود، قاعدة، ذراع مائلة بزاوية tilt، كفّتان بسلاسل
function scaleParts(k, tilt, light = false) {
  const top = 1.15, L = 1.9, ct = Math.cos(tilt), st = Math.sin(tilt);
  const ends = [[-L * ct, top + L * st], [L * ct, top - L * st]];
  const pans = [];
  for (const [ex, ey] of ends) {
    const py = ey - 1.45, R = 0.72;
    const rim = [0, 1, 2].map((m) => { const a = PI / 2 + (m * k.TAU) / 3; return [ex + Math.cos(a) * R, py, Math.sin(a) * R * 0.7]; });
    pans.push([0.09, k.many(rim.map((p) => k.seg([ex, ey, 0], p, 0.008)))]);
    pans.push([0.08, ringXZ(k, ex, py, 0, R, R * 0.7)]);
    pans.push([0.08, k.many([k.curve((u) => { const a = PI + u * PI; return [ex + Math.cos(a) * R, py + Math.sin(a) * 0.32, 0]; }), k.curve((u) => { const a = PI + u * PI; return [ex, py + Math.sin(a) * 0.32, Math.cos(a) * R * 0.7]; })])]);
  }
  const parts = [
    [0.1, tube(k, (u) => [0, -2.0 + u * (top + 2.0), 0], () => 0.06)],
    [0.06, ringXZ(k, 0, -2.0, 0, 0.85, 0.5)],
    [0.05, k.curve((u) => { const a = u * PI; return [Math.cos(a) * 0.85, -2.0 + Math.sin(a) * 0.35, 0]; })],
    [0.12, tube(k, (u) => [ends[0][0] + (ends[1][0] - ends[0][0]) * u, ends[0][1] + (ends[1][1] - ends[0][1]) * u, 0], () => 0.045)],
    [0.03, k.glow(0, top + 0.18, 0.12)],
    [0.04, k.ellipse(0, top, 0.22, 0.22)],
    ...pans,
    [0.05, k.dust(4.2)],
  ];
  if (light) parts.push([0.08, k.glow(0, top + 0.18, 0.3)], [0.08, rays(k, 0, top + 0.18, 16, 0.45, 1.0)], [0.06, rising(k, 0, top + 0.3, 0.3, 0.8), 3]);
  return parts;
}

// قوس مدبب (محراب): نصفا دائرتين يلتقيان في القمة. s مقياس، z عمق، yS خط بداية القوس
function ogive(k, s, z, yS = 0.3, j = 0.014) {
  const c = 0.4667, R = 1.667, a0 = 1.854;
  const left = k.curve((u) => { const a = a0 + u * (PI - a0); return [(c + Math.cos(a) * R) * s, yS + Math.sin(a) * R * s, z]; }, j);
  const right = k.curve((u) => { const a = u * (PI - a0); return [(-c + Math.cos(a) * R) * s, yS + Math.sin(a) * R * s, z]; }, j);
  return k.many([left, right]);
}

// طائر صغير في السماء (خطان كجناحين)
const birdV = (k, cx, cy, s, z = 0) => k.many([
  k.curve((u) => [cx - u * s, cy + Math.sin(u * PI * 0.85) * s * 0.45, z], 0.008),
  k.curve((u) => [cx + u * s, cy + Math.sin(u * PI * 0.85) * s * 0.45, z], 0.008),
]);

export const SHAPES_B = {
  // ---------- موسى عليه السلام ----------
  // عصا خشبية مستقيمة بانحناءة في أعلاها، قائمة على الأرض
  staff_plain: (k) => {
    const x0 = 0.04 * Math.sin(4.3);
    const c = (u) => {
      if (u < 0.86) { const v = u / 0.86; return [0.04 * Math.sin(v * 4.3), -2.4 + v * 3.9, 0.03 * Math.sin(v * 3)]; }
      const v = (u - 0.86) / 0.14, a = v * PI * 1.05;
      return [x0 + 0.32 - 0.32 * Math.cos(a), 1.5 + 0.32 * Math.sin(a), 0];
    };
    return [
      [0.62, tube(k, c, (u) => 0.1 - 0.025 * u)],
      [0.06, tube(k, (u) => c(0.55 + u * 0.12), () => 0.112, 0.004, 9)],
      [0.1, k.ground(-2.45, 0.95)],
      [0.07, () => { const a = k.r() * k.TAU, q = 0.3 + k.r() * 0.35; return [Math.cos(a) * q, -1.6 + k.r() * 3.2, Math.sin(a) * q]; }],
      [0.07, k.dust(4.2)],
    ];
  },
  // انفلاق البحر: نفس العصا مضروبة في الأرض، وعلى الجانبين جداران عاليان من الماء (طبقات موج متراصة بحافة زبد)
  // وبينهما طريق يابس يمتد للأفق (﴿فَانفَلَقَ فَكَانَ كُلُّ فِرْقٍ كَالطَّوْدِ الْعَظِيمِ﴾)
  sea_split: (k) => {
    const staff = SHAPES_B.staff_plain(k).slice(0, 2).map(([w, gen]) => [w, k.move(gen, 0, -0.1, 0.62)]);
    // جدار ماء مواجه للمشاهد: طبقات موج أفقية من حافة الطريق (|x| = 0.75) إلى الخارج، والطرف الخارجي أبعد قليلًا للخلف
    const TOP = 1.6, IN = 0.75, OUT = 2.5;
    const topAt = (ax) => TOP - (ax - IN) * 0.18;
    const layers = (side) => () => {
      const row = Math.floor(k.r() * 14), y = -2.4 + row * 0.29, ax = IN + k.r() * (OUT - IN);
      if (y > topAt(ax)) return [side * ax, topAt(ax) + k.J(0.02), -(ax - IN) * 0.5];
      return [side * ax, y + 0.07 * Math.sin(ax * 7 + row * 1.3) + k.J(0.012), -(ax - IN) * 0.5 + 0.06 * Math.sin(ax * 5 + row)];
    };
    // الحافة الداخلية: سطح الماء الواقف بجانب الطريق، مموج رأسيًا
    const face = (side) => () => { const y = -2.4 + k.r() * (TOP + 2.4), z = -1.2 + k.r() * 2.0; return [side * (IN + 0.06 * Math.sin(y * 4 + z * 2)), y, z * 0.5 + k.J(0.02)]; };
    const foam = (side) => () => { const ax = IN + k.r() * (OUT - IN); return [side * (ax - 0.12 * k.r()), topAt(ax) + 0.04 + k.r() * 0.2, -(ax - IN) * 0.5 + k.J(0.06)]; };
    const spray = (side) => () => { const ax = IN + k.r() * (OUT - IN); return [side * ax, -2.3 + k.r() * 3.6, -(ax - IN) * 0.5 + 0.25]; };
    const road = k.many([k.seg([-0.7, -2.45, 1.2], [-0.25, -2.2, -1.8], 0.02), k.seg([0.7, -2.45, 1.2], [0.25, -2.2, -1.8], 0.02)]);
    const sand = () => { const v = k.r(), half = 0.7 - v * 0.45; return [(k.r() * 2 - 1) * half, -2.45 + v * 0.25 + k.J(0.015), 1.2 - v * 3]; };
    return [
      ...staff,
      // الطبقات ثابتة (flow 2 يعيد توزيع الارتفاع فيفسد شكل الجدار)، والرذاذ وحده يصعد
      [0.16, layers(1)], [0.16, layers(-1)],
      [0.05, face(1)], [0.05, face(-1)],
      [0.05, foam(1)], [0.05, foam(-1)],
      [0.04, spray(1), 2], [0.04, spray(-1), 2],
      [0.05, road], [0.05, sand],
      [0.04, k.dust(4.4)],
    ];
  },
  // حية تسعى: جسم ملتف على شكل S يرتفع من لفة على الأرض إلى رأس واضح بعينين ولسان مشقوق
  snake: (k) => {
    // الجسم يصعد في موجتين ثم ينحني الرقبة للأمام فيتجه الرأس أفقيًا
    const c = (u) => {
      const amp = 0.85 * (1 - 0.55 * u), base = [amp * Math.sin(u * PI * 2.4 + 0.3), -2.05 + u * 3.3, 0.35 * Math.cos(u * PI * 2.4)];
      if (u < 0.82) return base;
      const v = (u - 0.82) / 0.18, b0 = (() => { const a2 = 0.85 * (1 - 0.55 * 0.82); return [a2 * Math.sin(0.82 * PI * 2.4 + 0.3), -2.05 + 0.82 * 3.3, 0.35 * Math.cos(0.82 * PI * 2.4)]; })();
      const a = v * PI * 0.5;
      return [b0[0] + Math.sin(a) * 0.45, b0[1] + (1 - Math.cos(a)) * -0.05 + Math.sin(a) * 0.5, b0[2] * (1 - v)];
    };
    const rad = (u) => (0.03 + 0.17 * Math.sin(PI * Math.min(1, u * 1.15) * 0.5)) * (u > 0.85 ? 1 - (u - 0.85) * 2.5 : 1);
    const coil = (t) => { const a = t * k.TAU * 1.25 + 1.2, R = 1.05 - 0.45 * t; return [Math.cos(a) * R, -2.25 + 0.15 * t + Math.sin(a) * R * 0.18, Math.sin(a) * R * 0.6]; };
    const p1 = c(1), tx = 0.94, ty = 0.34;
    const nx = -ty, ny = tx, hx = p1[0] + tx * 0.3, hy = p1[1] + ty * 0.3;
    const at = (a, b, z = 0) => [hx + tx * a + nx * b, hy + ty * a + ny * b, p1[2] + z];
    // رأس الحية: أعرض من الخلف ومدبب قليلًا للأمام
    const headOutline = k.curve((u) => { const a = u * k.TAU, w = 0.25 * (1 - 0.35 * Math.cos(a)); return at(Math.cos(a) * 0.42, Math.sin(a) * w); }, 0.01);
    const headTop = k.curve((u) => { const a = u * PI; return at(Math.cos(a) * 0.42, 0.05, Math.sin(a) * 0.24); }, 0.01);
    const tongue = k.many([k.seg(at(0.36, 0), at(0.62, 0), 0.005), k.seg(at(0.62, 0), at(0.78, 0.08), 0.005), k.seg(at(0.62, 0), at(0.78, -0.08), 0.005)]);
    return [
      [0.48, tube(k, c, rad)],
      [0.08, tube(k, c, (u) => rad(u) * 1.03, 0.004, 30)],
      [0.14, tube(k, coil, (t) => 0.07 + 0.08 * t)],
      [0.1, headOutline],
      [0.05, headTop],
      [0.03, k.many([k.glow(...at(0.12, 0.1, 0.16).slice(0, 2), 0.05, p1[2] + 0.16), k.glow(...at(0.12, 0.1, -0.16).slice(0, 2), 0.05, p1[2] - 0.16)])],
      [0.04, tongue],
      [0.05, k.dust(4.2)],
    ];
  },

  // ---------- هارون عليه السلام ----------
  candle: (k) => [
    ...candleParts(k, 0, -2.0, 2.4, 0.42, 1),
    [0.07, ringXZ(k, 0, -2.05, 0, 0.85, 0.55)],
    [0.05, k.dust(4)],
  ],
  two_candles: (k) => [
    ...candleParts(k, -0.8, -2.0, 2.0, 0.34, 0.48),
    ...candleParts(k, 0.8, -2.0, 2.0, 0.34, 0.48),
    [0.06, k.ellipse(0, -2.05, 1.75, 0.3)],
    [0.05, k.curve((u) => [-0.8 + u * 1.6, 0.75 + Math.sin(u * PI) * 0.55, 0], 0.02)],
    [0.05, k.dust(4)],
  ],
  // نور كبير واحد (الفرقان وضياء)
  big_light: (k) => [
    [0.18, k.glow(0, 0, 0.55)],
    [0.12, k.sphere(0, 0, 0.9)],
    [0.28, rays(k, 0, 0, 16, 1.1, 2.1)],
    [0.1, k.arc(0, 0, 1.45, 0, k.TAU, 0.03)],
    [0.1, rising(k, 0, 0.4, 0.5, 1.6), 3],
    [0.07, k.dust(4.4)],
  ],

  // ---------- ذو الكفل عليه السلام ----------
  // مطر الرحمة: سحابة، قطرات، وأرض تنبت
  rain_mercy: (k) => {
    const C = [[-1.2, 1.0, 0.55], [-0.45, 1.35, 0.75], [0.45, 1.3, 0.7], [1.2, 0.95, 0.55]];
    const cloud = () => {
      for (let t = 0; t < 30; t++) {
        const [cx, cy, R] = C[Math.floor(k.r() * C.length)], a = k.r() * k.TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        if (y < 0.78) continue;
        if (C.some(([ox, oy, oR]) => (ox !== cx || oy !== cy) && Math.hypot(x - ox, y - oy) < oR - 0.02)) continue;
        return [x + k.J(0.015), y + k.J(0.015), (k.r() * 2 - 1) * 0.25];
      }
      return [k.r() * 3.4 - 1.7, 0.78, 0];
    };
    const drops = Array.from({ length: 36 }, () => [k.r() * 3 - 1.5, -1.5 + k.r() * 2.05, (k.r() * 2 - 1) * 0.5]);
    const rain = k.many(drops.map(([x, y, z]) => k.seg([x, y, z], [x - 0.08, y - 0.3, z], 0.006)));
    const sprout = (x) => k.many([k.seg([x, -2.0, 0], [x, -1.6, 0], 0.006), k.curve((u) => [x - u * 0.28, -1.65 + Math.sin(u * PI) * 0.12 + u * 0.08, 0], 0.006), k.curve((u) => [x + u * 0.28, -1.7 + Math.sin(u * PI) * 0.12 + u * 0.1, 0], 0.006)]);
    return [
      [0.32, cloud],
      [0.06, k.seg([-1.7, 0.78, 0], [1.7, 0.78, 0], 0.015)],
      [0.28, rain],
      [0.1, k.ellipse(0, -2.0, 2.2, 0.25)],
      [0.14, k.many([-1.5, -0.8, -0.1, 0.6, 1.3].map(sprout))],
      [0.05, k.dust(4)],
    ];
  },
  // نجوم مجتمعة
  star_cluster: (k) => {
    const S = [[0, 0.25, 0.75], [-1.4, 1.0, 0.42], [1.5, 1.05, 0.45], [-1.6, -0.9, 0.36], [1.3, -1.05, 0.4], [0, -1.7, 0.32], [-0.2, 1.75, 0.28]];
    return [
      ...S.map(([x, y, R], i) => [R * 0.95, k.star(x, y, R, 0.012, (i % 3 - 1) * 0.3)]),
      [0.18, k.many(S.map(([x, y, R]) => k.glow(x, y, R * 0.2)))],
      [0.08, k.dust(4.2)],
    ];
  },

  // ---------- داود عليه السلام ----------
  // درع من حلقات الحديد المتداخلة
  armor_rings: (k) => {
    const shirt = [[-0.35, 1.1], [-1.1, 0.95], [-1.85, 0.55], [-1.6, 0.05], [-1.0, 0.3], [-1.05, -2.0], [1.05, -2.0], [1.0, 0.3], [1.6, 0.05], [1.85, 0.55], [1.1, 0.95], [0.35, 1.1], [0.2, 0.92], [0, 0.88], [-0.2, 0.92]];
    const bend = (x) => 0.35 * Math.cos(x * 0.9);
    const centers = [];
    for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) { const x = -1.95 + i * 0.2 + (j % 2) * 0.1, y = -1.93 + j * 0.17; if (inside(shirt, x, y)) centers.push([x, y]); }
    const rings = () => { const [x, y] = centers[Math.floor(k.r() * centers.length)], a = k.r() * k.TAU; return [x + Math.cos(a) * 0.085, y + Math.sin(a) * 0.085, bend(x) + k.J(0.01)]; };
    const outline = k.poly(shirt.map(([x, y]) => [x, y, bend(x)]), true, 0.014);
    const hem = k.many([k.seg([-1.05, -1.9, bend(-1)], [1.05, -1.9, bend(1)], 0.01), k.seg([-1.02, 0.25, bend(-1)], [1.02, 0.25, bend(1)], 0.01)]);
    return [[0.62, rings], [0.2, outline], [0.08, hem], [0.05, k.depth(outline, 0.15)], [0.05, k.dust(4)]];
  },
  // قضيب حديد يلين فوق سندان
  iron_bar: (k) => [
    [0.38, tube(k, (u) => [-2.1 + u * 4.2, -0.9 + 0.95 * Math.sin(u * PI), 0], () => 0.15)],
    [0.22, k.box(-1.0, 1.0, -2.25, -1.5, -0.5, 0.5)],
    [0.05, k.many([k.seg([1.0, -1.5, 0], [1.55, -1.6, 0]), k.seg([1.0, -1.75, 0], [1.55, -1.6, 0])])],
    [0.1, k.glow(0, 0.05, 0.35)],
    [0.13, () => { const a = k.r() * k.TAU, q = 0.2 + k.r() * 0.9; return [Math.cos(a) * q * 1.2, 0.2 + Math.abs(Math.sin(a)) * q, k.J(0.3)]; }, 3],
    [0.05, k.dust(4)],
  ],
  // الجبال والطير تسبّح معه
  mountains_birds: (k) => {
    const back = [[-2.6, -2.0, -0.5], [-1.6, -0.2, -0.5], [-0.9, -1.1, -0.5], [0.1, 0.65, -0.5], [1.0, -0.8, -0.5], [1.8, -0.1, -0.5], [2.6, -2.0, -0.5]];
    const front = [[-2.4, -2.0, 0.4], [-1.2, -1.0, 0.4], [-0.3, -1.7, 0.4], [0.8, -0.9, 0.4], [2.3, -2.0, 0.4]];
    const ridges = k.many([k.seg([-1.6, -0.2, -0.5], [-1.4, -1.6, -0.2]), k.seg([0.1, 0.65, -0.5], [0.3, -0.9, -0.2]), k.seg([1.8, -0.1, -0.5], [1.6, -1.2, -0.2])]);
    const birds = [[-1.7, 1.0, 0.3], [-1.1, 1.5, 0.35], [-0.4, 1.15, 0.28], [0.3, 1.75, 0.32], [0.9, 1.3, 0.36], [1.6, 1.65, 0.3], [2.1, 1.05, 0.26], [-0.9, 2.0, 0.24], [1.3, 2.05, 0.22]];
    return [
      [0.3, k.poly(back, false, 0.016)],
      [0.2, k.poly(front, false, 0.016)],
      [0.07, ridges],
      [0.33, k.many(birds.map(([x, y, s], i) => birdV(k, x, y, s, (i % 3 - 1) * 0.4)))],
      [0.06, k.dust(4.2)],
    ];
  },
  // كتاب الزبور مغلق بزخرفة
  book_zabur: (k) => {
    const X0 = -1.3, X1 = 1.3, Y0 = -1.8, Y1 = 1.6, Z = 0.32;
    const covers = k.many([k.poly([[X0, Y0, Z], [X1, Y0, Z], [X1, Y1, Z], [X0, Y1, Z]], true, 0.012), k.poly([[X0, Y0, -Z], [X1, Y0, -Z], [X1, Y1, -Z], [X0, Y1, -Z]], true, 0.012)]);
    const spine = () => { const y = Y0 + k.r() * (Y1 - Y0), a = -PI / 2 + k.r() * PI; return [X0 - Math.cos(a) * 0.16, y + k.J(0.01), Math.sin(a) * Z]; };
    const pages = () => { const z = -0.26 + Math.floor(k.r() * 12) * 0.047, side = k.r(); return side < 0.6 ? [X1 - 0.05, Y0 + 0.05 + k.r() * (Y1 - Y0 - 0.1), z] : [X0 + 0.1 + k.r() * (X1 - X0 - 0.15), side < 0.8 ? Y1 - 0.05 : Y0 + 0.05, z]; };
    const border = k.poly([[X0 + 0.2, Y0 + 0.2, Z + 0.01], [X1 - 0.2, Y0 + 0.2, Z + 0.01], [X1 - 0.2, Y1 - 0.2, Z + 0.01], [X0 + 0.2, Y1 - 0.2, Z + 0.01]], true, 0.01);
    // زخرفة الغلاف: نجمة ثمانية (لا خماسية في دائرة) وسطور فوقها وتحتها
    const s8 = Array.from({ length: 16 }, (_, i) => { const a = (i * PI) / 8 + PI / 2, R = i % 2 ? 0.28 : 0.6; return [Math.cos(a) * R, 0.05 + Math.sin(a) * R, Z + 0.02]; });
    const lines = () => { const row = [1.05, 0.85, -0.85, -1.05, -1.25][Math.floor(k.r() * 5)]; return [-0.75 + k.r() * 1.5, row, Z + 0.02]; };
    return [
      [0.26, covers], [0.1, spine], [0.16, pages], [0.12, border],
      [0.16, k.poly(s8, true, 0.01)],
      [0.1, lines],
      [0.05, k.dust(4)],
    ];
  },
  // ---------- سليمان عليه السلام ----------
  // النملة من الجانب: ثلاثة أجزاء، ست أرجل، قرنا استشعار
  ant: (k) => {
    const legs = [];
    const L = [[[0.65, -0.42], [1.1, 0.4], [1.45, -1.6]], [[0.35, -0.45], [0.35, 0.45], [0.2, -1.6]], [[0.05, -0.42], [-0.45, 0.4], [-1.05, -1.6]]];
    for (const [a, b, c] of L) for (const z of [0.32, -0.32]) legs.push(k.poly([[a[0], a[1], z * 0.3], [b[0], b[1], z], [c[0] + (z < 0 ? -0.15 : 0), c[1], z * 1.2]], false, 0.01));
    const outline = (cx, cy, rx, ry) => k.ellipse(cx, cy, rx, ry, 0, k.TAU, 0.012);
    return [
      [0.14, outline(-1.25, -0.3, 0.85, 0.6)], [0.1, ell(k, -1.25, -0.3, 0, 0.85, 0.6, 0.45)],
      [0.03, ell(k, -0.25, -0.38, 0, 0.13, 0.12, 0.1)],
      [0.08, outline(0.35, -0.25, 0.55, 0.28)], [0.05, ell(k, 0.35, -0.25, 0, 0.55, 0.28, 0.25)],
      [0.08, outline(1.3, -0.1, 0.42, 0.36)], [0.04, ell(k, 1.3, -0.1, 0, 0.42, 0.36, 0.3)],
      [0.02, k.many([k.glow(1.45, 0.0, 0.05, 0.28), k.glow(1.45, 0.0, 0.05, -0.28)])],
      [0.04, k.many([k.curve((u) => [1.68 + u * 0.25, -0.25 - Math.sin(u * PI) * 0.1, 0.1], 0.006), k.curve((u) => [1.68 + u * 0.25, -0.3 - Math.sin(u * PI) * 0.06, -0.1], 0.006)])],
      [0.07, k.many([k.poly([[1.4, 0.2, 0.15], [1.8, 0.9, 0.2], [2.3, 1.1, 0.25]], false, 0.008), k.poly([[1.3, 0.22, -0.15], [1.6, 1.0, -0.2], [2.1, 1.35, -0.25]], false, 0.008)])],
      [0.26, k.many(legs)],
      [0.05, k.ellipse(0, -1.65, 2.4, 0.3, 0, k.TAU, 0.02)],
      [0.04, k.dust(4)],
    ];
  },
  // الهدهد: تاج ريش مفروش، منقار طويل منحني، أجنحة مخططة
  hoopoe: (k) => {
    const rot = -0.2, cr = Math.cos(rot), sr = Math.sin(rot);
    const body = k.curve((u) => { const a = u * k.TAU, x = Math.cos(a) * 1.15, y = Math.sin(a) * 0.62; return [x * cr - y * sr, -0.3 + x * sr + y * cr, 0]; }, 0.012);
    const feathers = Array.from({ length: 7 }, (_, i) => { const a = (65 + i * 16) * PI / 180, L = 0.75 + (i % 2) * 0.18; return [1.05 + Math.cos(a) * L, 0.8 + Math.sin(a) * L]; });
    const crest = k.many(feathers.map(([x, y]) => k.seg([1.05, 0.8, 0], [x, y, 0], 0.01)));
    const tips = k.many(feathers.map(([x, y]) => k.glow(x, y, 0.06)));
    const stripes = k.many([-0.75, -0.4, -0.05, 0.3].map((x) => k.curve((u) => [x - u * 0.38, 0.05 - u * 0.62 + x * 0.12, 0.3], 0.008)));
    return [
      [0.18, body], [0.08, ell(k, 0, -0.3, 0, 1.15, 0.62, 0.42)],
      [0.1, k.arc(1.15, 0.5, 0.38)], [0.04, k.sphere(1.15, 0.5, 0.36)],
      [0.08, k.many([k.seg([0.72, 0.22, 0], [0.88, 0.3, 0]), k.seg([0.95, -0.2, 0], [1.05, 0.15, 0]), k.seg([0.85, 0.0, 0.15], [0.98, 0.25, 0.15])])],
      [0.08, k.many([k.curve((u) => [1.5 + u * 0.95, 0.5 - u * 0.33 - u * u * 0.12, 0], 0.006), k.curve((u) => [1.5 + u * 0.95, 0.42 - u * 0.27 - u * u * 0.12, 0], 0.006)])],
      [0.12, crest], [0.04, tips],
      [0.02, k.glow(1.27, 0.56, 0.05, 0.3)],
      [0.07, stripes],
      [0.08, k.many([k.seg([-1.05, -0.5, 0], [-2.2, -1.0, 0]), k.seg([-1.05, -0.45, 0.1], [-2.25, -0.78, 0.1]), k.seg([-1.0, -0.6, -0.1], [-2.1, -1.25, -0.1]), k.seg([-1.95, -1.25, 0], [-2.2, -0.75, 0])])],
      [0.05, k.many([k.seg([0.0, -0.88, 0], [-0.1, -1.5, 0]), k.seg([0.3, -0.85, 0], [0.3, -1.5, 0])])],
      [0.06, k.seg([-1.3, -1.52, 0], [1.4, -1.47, 0], 0.02)],
      [0.04, k.dust(4)],
    ];
  },
  // العرش: درجات، مقعد، مساند، ظهر بقوس ونجمة
  throne: (k) => [
    // العرش: درجتان، مقعد على أرجل، مسندان، وظهر مستقيم مستطيل بإطار داخلي (لا قوس ولا ما يشبه شاهد قبر)
    [0.12, k.box(-1.8, 1.8, -2.3, -2.0, -0.9, 0.9)],
    [0.1, k.box(-1.4, 1.4, -2.0, -1.75, -0.7, 0.7)],
    [0.12, k.box(-1.1, 1.1, -1.0, -0.75, -0.6, 0.6)],
    [0.06, k.many([[-1.0, -0.5], [1.0, -0.5], [-1.0, 0.5], [1.0, 0.5]].map(([x, z]) => k.seg([x, -1.0, z], [x, -1.75, z], 0.01)))],
    [0.1, k.many([k.box(-1.35, -1.05, -0.75, -0.15, -0.6, 0.55), k.box(1.05, 1.35, -0.75, -0.15, -0.6, 0.55)])],
    [0.16, k.box(-1.1, 1.1, -0.75, 1.45, -0.7, -0.5)],
    [0.08, k.poly([[-0.8, -0.45, -0.48], [0.8, -0.45, -0.48], [0.8, 1.15, -0.48], [-0.8, 1.15, -0.48]], true, 0.01)],
    [0.06, k.many([k.glow(-1.1, 1.55, 0.09), k.glow(1.1, 1.55, 0.09), k.glow(-1.2, -0.05, 0.07), k.glow(1.2, -0.05, 0.07)])],
    [0.05, k.rect(-1.0, 1.0, -0.74, -0.74, 0, 0.5)],
    [0.05, k.dust(4.2)],
  ],
  // ---------- إلياس عليه السلام ----------
  single_light: (k) => [
    [0.26, k.glow(0, 0, 0.35)],
    [0.06, k.arc(0, 0, 0.7, 0, k.TAU, 0.02)],
    [0.06, k.arc(0, 0, 1.15, 0, k.TAU, 0.03)],
    [0.05, k.arc(0, 0, 1.65, 0, k.TAU, 0.04)],
    [0.22, rays(k, 0, 0, 12, 0.5, 1.5, 0.7, 0.012, PI / 12)],
    [0.15, rising(k, 0, 0.3, 0.35, 1.7), 3],
    [0.08, k.dust(4.4)],
  ],
  // نقاط متفرقة (قبل أن يجتمع النور)
  scattered_dots: (k) => {
    const pts = [];
    while (pts.length < 44) { const x = k.r() * 4.8 - 2.4, y = k.r() * 4.0 - 2.1; if ((x / 2.5) ** 2 + ((y + 0.1) / 2.1) ** 2 < 1) pts.push([x, y, (k.r() * 2 - 1) * 0.8, 0.05 + k.r() * 0.06]); }
    return [[0.85, k.many(pts.map(([x, y, z, R]) => k.glow(x, y, R, z)))], [0.15, k.dust(4.4)]];
  },
  // كلمة «سلام»
  word_salam: (k) => [
    [0.72, k.text('سلام', { maxW: 4.2, maxH: 1.7, ox: 0, oy: 0.15 })],
    [0.1, k.ellipse(0, 0.15, 2.45, 1.45, 0, k.TAU, 0.03)],
    [0.1, rising(k, 0, -0.6, 1.4, 2.2), 3],
    [0.08, k.dust(4.4)],
  ],

  // ---------- اليسع عليه السلام ----------
  // تاج من نجوم
  star_crown: (k) => {
    const n = 8, R = 1.6, Rz = 1.0, yb = -0.65, yt = 0.75;
    const spikes = [], stars = [], jewels = [];
    for (let m = 0; m < n; m++) {
      const a = (m * k.TAU) / n + PI / 2, d = PI / n;
      const P = (ang, y) => [Math.cos(ang) * R, y, Math.sin(ang) * Rz];
      spikes.push(k.seg(P(a - d, yb), P(a, yt)), k.seg(P(a, yt), P(a + d, yb)));
      const t = P(a, yt + 0.25);
      stars.push(k.star(t[0], t[1], 0.22, 0.01, t[2]));
      const jw = P(a, -1.05); jewels.push(k.glow(jw[0], jw[1], 0.07, jw[2]));
    }
    // إمالة خفيفة نحو المشاهد حتى تظهر استدارة التاج
    const T = (g) => () => { const p = g(); return [p[0], p[1] + p[2] * 0.35, p[2]]; };
    return [
      [0.14, T(ringXZ(k, 0, -1.4, 0, R, Rz))], [0.12, T(ringXZ(k, 0, yb, 0, R, Rz))],
      [0.3, T(k.many(spikes))], [0.28, T(k.many(stars))], [0.08, T(k.many(jewels))],
      [0.08, k.dust(4.2)],
    ];
  },

  // ---------- يونس عليه السلام ----------
  // سفينة شراعية صغيرة فوق الموج
  ship: (k) => {
    const L = 1.6;
    const deck = (s) => k.curve((t) => { const u = t * 2 - 1; return [u * L, -0.6 + 0.3 * u * u + (u > 0 ? 0.15 * u * u : 0), s * 0.5 * Math.sqrt(Math.max(0, 1 - u ** 4))]; }, 0.012);
    const keel = k.curve((t) => { const u = t * 2 - 1; return [u * L * 0.9, -1.2 + 0.55 * u ** 4, 0]; }, 0.012);
    const ribs = () => { const u = Math.round((k.r() * 2 - 1) * 5) / 5, v = k.r(), side = k.r() < 0.5 ? -1 : 1, top = -0.6 + 0.3 * u * u, bot = -1.2 + 0.55 * u ** 4; return [u * L * (1 - 0.1 * v), top + (bot - top) * v, side * 0.5 * Math.sqrt(Math.max(0, 1 - u ** 4)) * Math.cos(v * PI / 2)]; };
    const sail = k.many([k.seg([0.05, 1.85, 0], [0.05, -0.35, 0]), k.seg([0.05, -0.35, 0], [1.3, -0.3, 0]), k.curve((u) => [0.05 + u * 1.25, 1.85 - u * 2.15, Math.sin(u * PI) * 0.35], 0.012), k.curve((u) => [0.05 + u * 0.9, 0.75 - u * 1.0, Math.sin(u * PI) * 0.3], 0.01)]);
    const sail2 = k.many([k.seg([-0.05, 1.4, 0], [-1.1, -0.3, 0]), k.seg([-1.1, -0.3, 0], [-0.05, -0.3, 0])]);
    const waves = () => { const z = -1 + Math.floor(k.r() * 5) * 0.5, x = k.r() * 5.2 - 2.6; return [x, -1.25 + 0.12 * Math.sin(x * 2.2 + z * 3) + k.J(0.015), z]; };
    return [
      [0.1, deck(1)], [0.1, deck(-1)], [0.08, keel], [0.07, ribs],
      [0.06, k.seg([0, -0.6, 0], [0, 1.95, 0], 0.01)],
      [0.2, sail], [0.08, sail2],
      [0.02, k.poly([[0, 1.95, 0], [-0.35, 1.85, 0], [0, 1.75, 0]], false, 0.006)],
      [0.24, waves, 1],
      [0.05, k.dust(4)],
    ];
  },
  // ظلمات بعضها فوق بعض وفي وسطها نور الدعاء
  light_in_dark: (k) => {
    const layer = (rx, ry, z, f) => () => { const a = k.r() * k.TAU, w = 1 + 0.08 * Math.sin(a * f); return [Math.cos(a) * rx * w + k.J(0.06), Math.sin(a) * ry * w + k.J(0.06), z + k.J(0.08)]; };
    return [
      [0.11, layer(2.4, 1.95, -0.6, 5)], [0.09, layer(1.8, 1.45, -0.3, 7)], [0.08, layer(1.2, 0.95, 0, 6)],
      [0.24, k.glow(0, 0, 0.3)],
      [0.16, rays(k, 0, 0, 12, 0.4, 0.95, 0.7, 0.012, PI / 12)],
      [0.1, k.arc(0, 0, 0.5, 0, k.TAU, 0.015)],
      [0.12, rising(k, 0, 0.2, 0.25, 1.8), 3],
      [0.04, k.dust(4.4)],
    ];
  },
  // شجرة اليقطين: ساق، أوراق عريضة تظلل، وثمرتان
  gourd_plant: (k) => {
    const stem = (u) => [0.25 * Math.sin(u * 2.2), -2.2 + u * 3.1, 0.1 * Math.sin(u * 3)];
    const top = stem(1);
    const leaves = [[-1.65, 0.85, 0.55, 0.9], [-0.85, 1.5, 0.55, 0.45], [0, 1.72, 0.52, 0], [0.85, 1.48, 0.55, -0.45], [1.65, 0.85, 0.55, -0.9], [-1.1, 0.2, 0.45, 1.3], [1.1, 0.2, 0.45, -1.3]];
    const z = (i) => ((i % 3) - 1) * 0.35;
    const branches = k.many(leaves.map(([x, y], i) => k.curve((u) => [top[0] + (x - top[0]) * u, top[1] + (y + 0.35 - top[1]) * u + Math.sin(u * PI) * 0.2, z(i) * u], 0.01)));
    const blades = k.many(leaves.map(([x, y, s, rot], i) => heart(k, x, y, s, rot, z(i))));
    const veins = k.many(leaves.map(([x, y, s, rot], i) => { const c = Math.cos(rot), sn = Math.sin(rot); return k.seg([x - 0.31 * s * sn, y + 0.31 * s * c, z(i)], [x + 1.0 * s * sn, y - 1.0 * s * c, z(i)], 0.006); }));
    const gourd = (x, y) => k.many([ell(k, x, y, 0.2, 0.22, 0.24, 0.22), ell(k, x, y - 0.42, 0.2, 0.36, 0.34, 0.34), k.seg([x, y + 0.22, 0.2], [x, y + 0.6, 0.2], 0.006)]);
    return [
      [0.14, tube(k, stem, (u) => 0.08 - 0.03 * u)],
      [0.1, branches], [0.36, blades], [0.08, veins],
      [0.14, k.many([gourd(-0.95, -0.25), gourd(1.0, -0.45)])],
      [0.06, k.ellipse(0, -2.25, 2.0, 0.25)],
      [0.04, k.dust(4)],
    ];
  },

  // ---------- زكريا عليه السلام ----------
  // المحراب: قوس مدبب بعمود على كل جانب، تجويف، قنديل معلّق
  mihrab: (k) => [
    [0.18, ogive(k, 1, 0.1)],
    [0.1, ogive(k, 1.3, 0.3)],
    [0.08, ogive(k, 0.8, -0.5)],
    [0.12, k.many([k.seg([-1.2, 0.3, 0.1], [-1.2, -2.0, 0.1]), k.seg([1.2, 0.3, 0.1], [1.2, -2.0, 0.1]), k.seg([-1.56, 0.3, 0.3], [-1.56, -2.0, 0.3]), k.seg([1.56, 0.3, 0.3], [1.56, -2.0, 0.3])])],
    [0.05, k.many([k.seg([-0.96, 0.3, -0.5], [-0.96, -2.0, -0.5]), k.seg([0.96, 0.3, -0.5], [0.96, -2.0, -0.5])])],
    [0.04, k.many([0.3, 1.0, 1.6].map((y) => k.seg([0, y, -0.5], [0, y, 0.1], 0.008)))],
    [0.06, k.many([k.box(-1.35, -1.05, 0.25, 0.4, -0.05, 0.25), k.box(1.05, 1.35, 0.25, 0.4, -0.05, 0.25)])],
    [0.1, k.box(-2.0, 2.0, -2.3, -2.0, -0.7, 0.5)],
    [0.03, k.seg([0, 1.55, -0.2], [0, 0.65, -0.2], 0.005)],
    [0.06, k.many([k.ellipse(0, 0.38, 0.2, 0.26, 0, k.TAU, 0.008, -0.2), k.seg([-0.12, 0.62, -0.2], [0.12, 0.62, -0.2], 0.005)])],
    [0.08, k.glow(0, 0.38, 0.16, -0.2)],
    [0.05, rising(k, 0, 0.55, 0.25, 0.9), 3],
    [0.04, k.dust(4)],
  ],
  // سلة رزق بفاكهة
  fruit_basket: (k) => {
    const yT = -0.5, yB = -1.9;
    const weave = () => { const a = Math.floor(k.r() * 16) * k.TAU / 16, v = k.r(), R = 1.6 - 0.6 * v; return [Math.cos(a) * R, yT + (yB - yT) * v, Math.sin(a) * R * 0.56]; };
    const bands = () => { const v = Math.floor(k.r() * 4 + 1) / 5, a = k.r() * k.TAU, R = 1.6 - 0.6 * v; return [Math.cos(a) * R, yT + (yB - yT) * v, Math.sin(a) * R * 0.56]; };
    const fruits = [[-0.8, -0.05, 0.1, 0.45], [0.1, 0.1, -0.1, 0.52], [0.95, -0.12, 0.15, 0.42], [-0.35, 0.55, -0.3, 0.36]];
    const grapes = Array.from({ length: 10 }, (_, i) => [0.55 + (i % 3) * 0.17 - (Math.floor(i / 3) % 2) * 0.08, 0.95 - Math.floor(i / 3) * 0.17, 0.25]);
    return [
      [0.14, ringXZ(k, 0, yT, 0, 1.6, 0.9)], [0.07, ringXZ(k, 0, yB, 0, 1.0, 0.56)],
      [0.12, weave], [0.08, bands],
      [0.3, k.many(fruits.map(([x, y, z, R]) => k.many([k.arc(x, y, R, 0, k.TAU, 0.012, z), k.sphere(x, y, R * 0.97, z)])))],
      [0.03, k.many(fruits.map(([x, y, z, R]) => k.seg([x, y + R, z], [x + 0.08, y + R + 0.18, z], 0.005)))],
      [0.12, k.many(grapes.map(([x, y, z]) => k.sphere(x, y, 0.09, z)))],
      [0.08, rising(k, 0, 0.6, 0.8, 1.2), 3],
      [0.06, k.dust(4)],
    ];
  },
  // نجمة البشارة الساطعة
  star_bright: (k) => {
    const pts = Array.from({ length: 16 }, (_, i) => { const a = (i * PI) / 8 + PI / 2, R = i % 2 ? 0.7 : 1.7; return [Math.cos(a) * R, Math.sin(a) * R, 0]; });
    return [
      [0.34, k.poly(pts, true, 0.012)],
      // أشعة قصيرة متساوية بين رؤوس النجمة (لا خطوط طويلة على المحورين تشبه صليبًا خلف النجمة)
      [0.14, k.many(Array.from({ length: 8 }, (_, i) => { const a = (i * PI) / 4 + PI / 2 + PI / 8; return k.seg([Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0], [Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0], 0.01); }))],
      [0.18, k.glow(0, 0, 0.4)],
      [0.1, k.arc(0, 0, 0.75, 0, k.TAU, 0.02)],
      [0.12, k.many([k.star(-1.8, 1.4, 0.2), k.star(1.9, 1.5, 0.18), k.star(-1.7, -1.6, 0.16), k.star(1.6, -1.7, 0.2)])],
      [0.06, k.depth(k.poly(pts, true, 0.012), 0.12)],
      [0.06, k.dust(4.4)],
    ];
  },

  // ---------- يحيى عليه السلام ----------
  // كتاب مفتوح يطفو ونور يصعد منه
  book_open: (k) => {
    const pageY = (u) => 0.1 + u * 0.32 + Math.sin(u * PI) * 0.18;
    const edge = (side) => k.many([k.curve((u) => [side * u * 2.0, pageY(u), -1.0]), k.curve((u) => [side * u * 2.0, pageY(u), 1.0]), k.curve((u) => [side * 2.0, pageY(1), -1.0 + u * 2.0])]);
    const lines = (side) => () => { const row = Math.floor(k.r() * 10), z = -0.8 + row * 0.178, u = 0.12 + k.r() * 0.8; return [side * u * 2.0, pageY(u) + 0.01, z + k.J(0.008)]; };
    const stack = (side) => () => { const v = k.r(), u = k.r(); return [side * (0.1 + u * 1.9), pageY(u) - 0.05 - v * 0.18, (k.r() < 0.5 ? -1 : 1) * 1.0]; };
    const T = (g) => k.move(rotX(g, 0.8), 0, -0.5);
    return [
      [0.13, T(edge(1))], [0.13, T(edge(-1))],
      [0.16, T(lines(1))], [0.16, T(lines(-1))],
      [0.05, T(k.seg([0, 0.1, -1.02], [0, 0.1, 1.02], 0.01))],
      [0.07, T(k.many([stack(1), stack(-1)]))],
      [0.06, k.glow(0, 0.35, 0.3)],
      [0.14, rising(k, 0, 0.2, 0.9, 1.9), 3],
      [0.06, k.dust(4.4)],
    ];
  },

  // ---------- عيسى عليه السلام ----------
  // المائدة النازلة من السماء: مائدة مستديرة بأطباق، وعمود نور من أعلى
  maidah: (k) => {
    const y = -0.9, R = 1.55, Rz = 0.85;
    // المائدة مائلة نحو المشاهد حتى يظهر سطحها: كل عمق z يرفع النقطة قليلًا
    const tilt = (g) => () => { const p = g(); return [p[0], p[1] + p[2] * 0.5, p[2]]; };
    const dishes = [[-0.7, 0.2], [0.1, -0.35], [0.75, 0.15], [-0.1, 0.45], [0.55, -0.45], [-0.75, -0.35]];
    const beam = () => { const t = k.r(), a = Math.floor(k.r() * 12) * k.TAU / 12, q = 0.4 + t * 1.1; return [Math.cos(a) * q + k.J(0.01), 2.1 - t * 2.7, Math.sin(a) * q * 0.55]; };
    const cloud = k.many([k.arc(-0.45, 2.05, 0.35, 0.1, PI - 0.1, 0.012), k.arc(0.15, 2.15, 0.42, 0.1, PI - 0.1, 0.012), k.arc(0.7, 2.0, 0.3, 0.1, PI - 0.1, 0.012)]);
    return [
      [0.16, tilt(ringXZ(k, 0, y, 0, R, Rz))], [0.08, tilt(ringXZ(k, 0, y - 0.14, 0, R, Rz))],
      [0.08, tilt(k.many([[-1.0, 0.4], [1.0, 0.4], [-0.8, -0.5], [0.8, -0.5]].map(([x, z]) => k.seg([x, y - 0.14, z], [x, y - 0.8, z], 0.01))))],
      [0.18, tilt(k.many(dishes.map(([x, z]) => () => { const a = k.r() * k.TAU, q = k.r() < 0.7 ? 0.28 : 0.15; return [x + Math.cos(a) * q, y + 0.03 + k.J(0.01), z + Math.sin(a) * q * 0.7]; })))],
      [0.06, tilt(k.many(dishes.map(([x, z]) => k.glow(x, y + 0.12, 0.09, z))))],
      [0.18, beam],
      [0.08, cloud],
      [0.08, rising(k, 0, y + 0.1, 1.0, 1.4), 3],
      [0.05, k.dust(4.2)],
    ];
  },
  // نخلة بعناقيد رطب
  palm_dates: (k) => {
    const trunk = (u) => [0.2 - 0.3 * u + 0.08 * Math.sin(u * 3), -2.3 + u * 3.2, 0];
    const C = trunk(1);
    const fronds = Array.from({ length: 9 }, (_, i) => (i * k.TAU) / 9 + 0.2);
    const frondAt = (phi, u, L = 2.1) => [C[0] + Math.cos(phi) * L * u, C[1] + 1.05 * u - 1.6 * u * u, Math.sin(phi) * L * u * 0.75];
    const frond = () => { const phi = fronds[Math.floor(k.r() * 9)], p = frondAt(phi, k.r()); return [p[0] + k.J(0.012), p[1] + k.J(0.012), p[2] + k.J(0.012)]; };
    const leaflet = () => {
      const phi = fronds[Math.floor(k.r() * 9)], u = (Math.floor(k.r() * 12) + 1) / 13, p = frondAt(phi, u), side = k.r() < 0.5 ? -1 : 1, t = k.r(), L = 0.32 * (1 - u * 0.5);
      return [p[0] - side * Math.sin(phi) * L * 0.5 * t, p[1] - L * t, p[2] + side * Math.cos(phi) * L * 0.5 * t];
    };
    const clusters = [[C[0] - 0.4, C[1] - 0.35, 0.3], [C[0] + 0.35, C[1] - 0.4, -0.2], [C[0] + 0.0, C[1] - 0.45, 0.45]];
    const dates = k.many(clusters.map(([x, y, z]) => () => { const v = k.r(), a = k.r() * k.TAU, q = 0.22 * (1 - v * 0.6); return [x + Math.cos(a) * q, y - v * 0.6, z + Math.sin(a) * q]; }));
    return [
      [0.18, tube(k, trunk, (u) => 0.17 - 0.06 * u)],
      [0.08, tube(k, trunk, (u) => 0.18 - 0.06 * u, 0.004, 22)],
      [0.2, frond], [0.26, leaflet],
      [0.14, dates],
      [0.06, k.ground(-2.35, 1.4)],
      [0.04, k.dust(4)],
    ];
  },
  // المهد، ونور الكلام يعلوه
  cradle: (k) => {
    const rock = (z) => k.curve((u) => { const x = -1.9 + u * 3.8; return [x, -2.05 + 0.4 * (x / 1.9) ** 2, z]; }, 0.012);
    const side = (z) => k.curve((u) => { const a = PI + u * PI; return [Math.cos(a) * 1.5, -0.2 + Math.sin(a) * 1.15, z]; }, 0.012);
    const slats = () => { const x = -1.35 + Math.floor(k.r() * 10) * 0.3, yb = -0.2 - 1.15 * Math.sqrt(Math.max(0, 1 - (x / 1.5) ** 2)); return [x, yb + k.r() * (-0.2 - yb), 0.6 + k.J(0.008)]; };
    const posts = k.many([[-1.0, 0.6], [1.0, 0.6], [-1.0, -0.6], [1.0, -0.6]].map(([x, z]) => k.seg([x, -1.05, z], [x, -1.7, z], 0.01)));
    const hood = k.many([0.55, 0, -0.55].map((z) => k.curve((u) => { const a = u * PI; return [-0.95 + Math.cos(a) * 0.55, -0.2 + Math.sin(a) * 0.75, z]; }, 0.012)));
    const speech = k.many([0.35, 0.65, 0.95].map((R) => k.arc(0.4, 0.2, R, PI / 4, (3 * PI) / 4, 0.012)));
    return [
      [0.12, rock(0.6)], [0.12, rock(-0.6)],
      [0.14, ringXZ(k, 0, -0.2, 0, 1.5, 0.6)],
      [0.1, side(0.6)], [0.07, side(-0.6)],
      [0.12, slats], [0.07, posts], [0.08, hood],
      [0.08, speech], [0.04, k.glow(0.4, 0.55, 0.12)],
      [0.04, rising(k, 0.4, 0.5, 0.3, 1.2), 3],
      [0.03, k.dust(4)],
    ];
  },
  // طائر يطير (من طين بإذن الله)
  bird: (k) => {
    const body = k.curve((u) => { const a = u * k.TAU, x = Math.cos(a) * 0.72, y = Math.sin(a) * 0.32; return [x * 0.96 - y * 0.27, 0.3 + x * 0.27 + y * 0.96, 0]; }, 0.012);
    const wing = (tip, z, n) => {
      const sh = [0.05, 0.55, z];
      const lead = k.curve((u) => [sh[0] + (tip[0] - sh[0]) * u - Math.sin(u * PI) * 0.25, sh[1] + (tip[1] - sh[1]) * u + Math.sin(u * PI) * 0.2, z], 0.01);
      const back = [-0.55, 0.3, z];
      const scallops = k.many(Array.from({ length: n }, (_, i) => { const a = [tip[0] + (back[0] - tip[0]) * (i / n), tip[1] + (back[1] - tip[1]) * (i / n)], b = [tip[0] + (back[0] - tip[0]) * ((i + 1) / n), tip[1] + (back[1] - tip[1]) * ((i + 1) / n)]; return k.curve((u) => [a[0] + (b[0] - a[0]) * u - Math.sin(u * PI) * 0.1, a[1] + (b[1] - a[1]) * u - Math.sin(u * PI) * 0.1, z], 0.008); }));
      return k.mix([[0.55, lead], [0.45, scallops]]);
    };
    const mound = k.curve((u) => [-1.9 + u * 1.4, -2.2 + Math.sin(u * PI) * 0.45, 0], 0.015);
    return [
      [0.14, body], [0.05, ell(k, 0.08, 0.32, 0, 0.7, 0.32, 0.25)],
      [0.08, k.arc(0.72, 0.62, 0.22)],
      [0.03, k.poly([[0.9, 0.7, 0], [1.25, 0.6, 0], [0.92, 0.55, 0]], false, 0.006)],
      [0.02, k.glow(0.78, 0.68, 0.04, 0.12)],
      [0.24, wing([-0.95, 2.05, 0], 0.25, 5)],
      [0.14, wing([-0.25, 1.85, 0], -0.3, 4)],
      [0.1, k.many([k.seg([-0.6, 0.05, 0], [-1.55, -0.35, 0]), k.seg([-0.6, 0.08, 0.1], [-1.6, -0.05, 0.1]), k.seg([-0.58, 0.02, -0.1], [-1.45, -0.62, -0.1])])],
      [0.08, mound],
      [0.08, k.many([0.15, 0.35, 0.55, 0.75].map((t) => k.glow(-1.2 + t * 0.9 + Math.sin(t * PI) * 0.35, -1.8 + t * 1.8, 0.05 + t * 0.03)))],
      [0.04, k.dust(4)],
    ];
  },

  // ---------- نبينا محمد ﷺ ----------
  // غار حراء: سلسلة جبال صخرية عريضة بقمم مستديرة متعددة (لا قمة هرمية واحدة)، والغار فتحة غير منتظمة
  // على السفح الأيسر (لا دائرة نور في المنتصف ولا أشعة ولا نجوم حولها — حتى لا يشبه أي رمز مشبوه)،
  // وفوق الجبال كلمة «اقرأ» بالنور، أول ما نزل من القرآن
  cave_hira: (k) => {
    const ridge = (x) => -2.2 + 1.9 * Math.exp(-((x + 1.35) ** 2) / 0.75) + 1.45 * Math.exp(-((x - 0.25) ** 2) / 0.55) + 1.75 * Math.exp(-((x - 1.55) ** 2) / 0.7) + Math.sin(x * 6) * 0.06;
    // حافة الجبل بعمق (خطان متقاربان بدل سلسلتين متقاطعتين)، وصخور قليلة على السفح
    const front = () => { const x = -2.7 + k.r() * 5.4, d = k.r() < 0.5 ? 0 : 0.06; return [x, ridge(x) - d + k.J(0.01), 0.3 - d * 3]; };
    const slope = () => { const x = -2.5 + k.r() * 5; const top = ridge(x); return [x, -2.2 + (top + 2.2) * (0.25 + k.r() * 0.5) + k.J(0.02), 0.2 + k.J(0.15)]; };
    // فتحة الغار: قوس عريض مستدير واضح (قوسان متداخلان) على سفح الجبل الأيسر، بلا شيء في داخله
    const cx = -0.65, cy = -1.55;
    const arch = (r, w) => k.curve((u) => { const a = u * PI; return [cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r, 0.36]; }, w);
    return [
      [0.36, front],
      [0.08, slope],
      [0.12, arch(0.5, 0.012)],
      [0.06, arch(0.42, 0.01)],
      [0.28, k.text('اقرأ', { maxW: 2.4, maxH: 1.1, ox: 0.15, oy: 1.45 })],
      [0.1, k.dust(4.2)],
    ];
  },
  // انشقاق القمر: نصفان بينهما جبل
  moon_split: (k) => {
    const R = 1.05;
    const jag = (x0, y0, y1) => k.poly(Array.from({ length: 9 }, (_, i) => [x0 + (i % 2 ? 0.07 : -0.04), y0 + ((y1 - y0) * i) / 8, 0]), false, 0.01);
    const half = (cx, cy, s) => () => { let x, y, t = 0; do { const a = k.r() * k.TAU, q = Math.sqrt(k.r()) * R; x = Math.cos(a) * q; y = Math.sin(a) * q; t++; } while (s * x < 0 && t < 20); const d = Math.hypot(x, y); return [cx + x, cy + y, Math.sqrt(Math.max(0, R * R - d * d)) * 0.4 + k.J(0.02)]; };
    // فوهات صغيرة كثيرة متفرقة (لا اثنتان بارزتان تشبهان عينين)
    const craters = k.many([[-0.95, 0.85, 0.09], [-0.75, 0.1, 0.07], [-1.3, 0.45, 0.06], [-0.9, -0.3, 0.05], [0.95, 1.45, 0.08], [1.25, 0.95, 0.07], [0.85, 0.55, 0.06], [1.2, 0.2, 0.05]].map(([x, y, r]) => k.arc(x, y, r, 0, k.TAU, 0.008, 0.3)));
    return [
      [0.18, k.arc(-0.55, 0.2, R, PI / 2, (3 * PI) / 2, 0.012)],
      [0.18, k.arc(0.55, 1.0, R, -PI / 2, PI / 2, 0.012)],
      [0.07, jag(-0.55, -0.85, 1.25)], [0.07, jag(0.55, -0.05, 2.05)],
      [0.1, half(-0.55, 0.2, -1)], [0.1, half(0.55, 1.0, 1)],
      [0.08, craters],
      [0.14, k.curve((u) => { const x = -2.4 + u * 4.8; return [x, -2.0 + 0.18 * Math.sin(x * 1.7) + 0.1 * Math.sin(x * 3.1 + 1), 0]; }, 0.014)],
      [0.08, k.dust(4.4)],
    ];
  },
  // طريق الهجرة: درب في الصحراء عليه آثار أقدام، نجوم، ونخيل ومدينة بعيدة
  hijra_path: (k) => {
    const H = 0.2;
    const edge = (s) => k.curve((t) => [s * (1.45 - 1.35 * t) + 0.25 * Math.sin(t * PI) , -2.4 + t * (H + 2.4), 0], 0.012);
    const steps = Array.from({ length: 9 }, (_, i) => { const t = i / 9, w = 1 - 0.85 * t; return [0.25 * Math.sin(t * PI) + (i % 2 ? 0.22 : -0.22) * w, -2.15 + t * 2.2, w]; });
    const prints = k.many(steps.map(([x, y, w]) => k.ellipse(x, y, 0.09 * w, 0.17 * w, 0, k.TAU, 0.006)));
    const dunes = k.many([k.curve((u) => [-2.6 + u * 2.3, H - 0.05 + Math.sin(u * PI) * 0.3, -0.3]), k.curve((u) => [0.4 + u * 2.2, H - 0.05 + Math.sin(u * PI) * 0.22, -0.3])]);
    const palm = (x) => k.many([k.seg([x, H, -0.4], [x + 0.05, H + 0.6, -0.4], 0.006), ...[0.5, 1.4, 2.4, 3.3].map((a) => k.curve((u) => [x + 0.05 + Math.cos(a) * 0.3 * u, H + 0.6 + Math.sin(a) * 0.12 * u - 0.12 * u * u, -0.4], 0.006))]);
    const city = k.many([k.arc(0.5, H + 0.35, 0.22, 0, PI, 0.008, -0.5), k.box(0.2, 0.8, H, H + 0.35, -0.6, -0.4, 0.006), k.seg([0.5, H + 0.57, -0.5], [0.5, H + 0.75, -0.5], 0.005)]);
    return [
      [0.14, edge(-1)], [0.14, edge(1)],
      [0.16, prints],
      [0.1, k.seg([-2.6, H, -0.3], [2.6, H, -0.3], 0.012)],
      [0.1, dunes],
      [0.1, k.many([palm(-0.9), palm(1.4), city])],
      [0.18, k.many([k.star(-1.9, 1.5, 0.16), k.star(-0.8, 1.9, 0.12), k.star(0.2, 1.4, 0.1), k.star(1.2, 1.85, 0.15), k.star(2.0, 1.25, 0.12), k.arc(-1.5, 0.95, 0.04)])],
      [0.06, k.dust(4)],
    ];
  },

  // ---------- مشتركة ----------
  // عين ماء تنبع من الأرض
  spring: (k) => {
    const fount = (s, z) => k.curve((u) => [s * u * 1.15, 0.9 + 0.35 * u - 2.75 * u * u, z * u], 0.012);
    return [
      [0.24, () => { const a = k.r() * k.TAU, q = Math.sqrt(k.r()) * 0.22; return [Math.cos(a) * q, -1.6 + k.r() * 2.5, Math.sin(a) * q]; }, 2],
      [0.24, k.many([fount(1, 0), fount(-1, 0), fount(0.7, 0.7), fount(-0.7, -0.7), fount(0.4, -0.8), fount(-0.4, 0.8)])],
      [0.22, k.many([0.7, 1.25, 1.8].map((R) => () => { const p = ringXZ(k, 0, -1.65, 0, R, R * 0.5, 0.012)(); return [p[0], p[1] + p[2] * 0.45, p[2]]; }))],
      [0.13, k.many(Array.from({ length: 8 }, (_, i) => { const a = (i * k.TAU) / 8; return k.sphere(Math.cos(a) * 2.1, -1.7 + Math.sin(a) * 1.05 * 0.45, 0.16, Math.sin(a) * 1.05); }))],
      [0.06, k.glow(0, 0.95, 0.15)],
      [0.05, k.dust(4)],
    ];
  },
  // أثر قدم تضرب الأرض فتظهر حلقات الماء
  footprint: (k) => {
    const sole = [[-0.55, -1.85], [0.0, -2.05], [0.5, -1.85], [0.7, -1.2], [0.6, -0.4], [0.85, 0.25], [0.95, 0.75], [0.7, 1.0], [0.0, 1.05], [-0.6, 0.95], [-0.85, 0.5], [-0.75, 0.0], [-0.45, -0.5], [-0.65, -1.2]];
    const toes = [[-0.5, 1.4, 0.27], [0.0, 1.55, 0.2], [0.38, 1.52, 0.18], [0.7, 1.38, 0.16], [0.95, 1.12, 0.14]];
    return [
      [0.34, k.poly(sole.map(([x, y]) => [x, y, 0]), true, 0.014)],
      [0.2, k.many(toes.map(([x, y, R]) => k.ellipse(x, y, R, R * 1.15, 0, k.TAU, 0.01)))],
      [0.08, () => { const [x, y] = [k.r() * 1.5 - 0.75, k.r() * 2.9 - 1.95]; return inside(sole, x, y) ? [x, y, k.J(0.04)] : [0, -0.5, 0]; }],
      [0.2, k.many([2.0, 2.4].map((R) => k.ellipse(0, -0.4, R * 0.95, R, 0, k.TAU, 0.025, -0.2)))],
      [0.12, rising(k, 0, -2.05, 0.4, 0.8), 2],
      [0.06, k.dust(4)],
    ];
  },
  // أسرة كالنجوم: نجمة كبيرة حولها نجوم أصغر متصلة بخطوط خفيفة
  family_stars: (k) => {
    const S = [[0, 0.2, 0.8], [-1.5, 0.95, 0.45], [1.5, 0.85, 0.45], [-1.75, -1.0, 0.3], [-0.6, -1.65, 0.28], [0.7, -1.6, 0.28], [1.75, -0.95, 0.3], [0, 1.75, 0.3]];
    return [
      ...S.map(([x, y, R]) => [R * 0.8, k.star(x, y, R, 0.012)]),
      [0.14, k.many(S.slice(1).map(([x, y]) => k.seg([0, 0.2, 0], [x, y, 0], 0.03)))],
      [0.14, k.many(S.map(([x, y, R]) => k.glow(x, y, R * 0.22)))],
      [0.06, k.dust(4.2)],
    ];
  },
  // الميزان
  scale: (k) => scaleParts(k, 0),
  scale_tilted: (k) => scaleParts(k, 0.24),
  scale_balanced: (k) => scaleParts(k, 0, true),
  // أشعة نور
  light_rays: (k) => [
    [0.16, k.glow(0, 0, 0.42)],
    [0.44, rays(k, 0, 0, 20, 0.6, 2.25, 0.65, 0.01)],
    [0.08, k.arc(0, 0, 0.6, 0, k.TAU, 0.015)],
    [0.06, k.arc(0, 0, 1.3, 0, k.TAU, 0.04)],
    [0.18, rising(k, 0, 0.2, 0.8, 1.8), 3],
    [0.08, k.dust(4.4)],
  ],
};

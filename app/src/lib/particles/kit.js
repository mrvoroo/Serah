// @ts-nocheck
// أدوات رسم الأشكال بالنقاط المضيئة (مشتركة بين رموز الرحلة وأشكال صفحة النبي).
// كل أداة ترجع «مولّد نقطة» () => [x, y, z]. الشكل = قائمة أجزاء [الوزن، المولّد، flow اختياري].
// مساحة الرسم: x من -2.6 إلى 2.6، y من -2.6 إلى 2.2، z عمق خفيف (±1). نرسم بالحواف والخطوط أكثر من الكتل.
// flow: 0 ثابت، 1 موج يتحرك أفقيًا، 2 ماء يصعد، 3 نور يصعد ببطء
export const TAU = Math.PI * 2;

export function kit(r, opts = {}) {
  const g = () => (r() + r() + r() - 1.5) / 1.5;
  const J = (j) => g() * j;
  const jit = (p, j) => [p[0] + J(j), p[1] + J(j), (p[2] || 0) + J(j)];
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * u];
  const k = {
    r, g, J, lerp, TAU,
    // خط مستقيم بين نقطتين
    seg: (a, b, j = 0.018) => () => jit(lerp(a, b, r()), j),
    // منحنى f(u) لـ u من 0 إلى 1
    curve: (f, j = 0.018) => () => jit(f(r()), j),
    // اختيار عشوائي متساوٍ بين مولّدات
    many: (list) => () => list[Math.floor(r() * list.length)](),
    // اختيار موزون [[وزن، مولّد]]
    mix: (list) => { const t = list.reduce((a, p) => a + p[0], 0); return () => { let x = r() * t, i = 0; while (x > list[i][0] && i < list.length - 1) x -= list[i++][0]; return list[i][1](); }; },
    // خط منكسر بنقاط [[x,y,z?]...]، النقاط موزعة حسب طول كل ضلع
    poly: (pts, closed = false, j = 0.016) => {
      const P = closed ? [...pts, pts[0]] : pts, L = [];
      let tot = 0;
      for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; tot += Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)); L.push(tot); }
      return () => { const x = r() * tot; let i = 0; while (L[i] < x && i < L.length - 1) i++; const s = i ? L[i - 1] : 0, u = (x - s) / Math.max(1e-6, L[i] - s); return jit(lerp(P[i], P[i + 1], u), j); };
    },
    // دائرة/قوس محيط
    arc: (cx, cy, R, a0 = 0, a1 = TAU, j = 0.016, z = 0) => () => { const a = a0 + (a1 - a0) * r(); return jit([cx + Math.cos(a) * R, cy + Math.sin(a) * R, z], j); },
    ellipse: (cx, cy, rx, ry, a0 = 0, a1 = TAU, j = 0.016, z = 0) => () => { const a = a0 + (a1 - a0) * r(); return jit([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, z], j); },
    // قرص ممتلئ (للتعبئة الخفيفة)
    disc: (cx, cy, R, z = 0, jz = 0.05) => () => { const a = r() * TAU, q = Math.sqrt(r()) * R; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q, z + J(jz)]; },
    // تعبئة مستطيل
    rect: (x0, x1, y0, y1, z = 0, jz = 0.04) => () => [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), z + J(jz)],
    // حواف صندوق ثلاثي الأبعاد
    box: (x0, x1, y0, y1, z0, z1, j = 0.012) => {
      const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      return k.many(e.map(([i, m]) => k.seg(c[i], c[m], j)));
    },
    // نجمة خماسية بالخطوط
    star: (cx, cy, R, j = 0.012, z = 0) => () => {
      const m = Math.floor(r() * 10), a0 = -Math.PI / 2 + m * Math.PI / 5, a1 = a0 + Math.PI / 5;
      const r0 = m % 2 ? R * 0.42 : R, r1 = m % 2 ? R : R * 0.42, u = r();
      const x0 = Math.cos(a0) * r0, y0 = -Math.sin(a0) * r0, x1 = Math.cos(a1) * r1, y1 = -Math.sin(a1) * r1;
      return [cx + x0 + (x1 - x0) * u + J(j), cy + y0 + (y1 - y0) * u + J(j), z + J(0.03)];
    },
    // نقطة مضيئة صغيرة (كوكب): كرة نقاط صغيرة
    glow: (cx, cy, R = 0.12, z = 0) => () => { const th = r() * TAU, ph = Math.acos(2 * r() - 1), q = R * Math.cbrt(r()); return [cx + Math.sin(ph) * Math.cos(th) * q, cy + Math.cos(ph) * q, z + Math.sin(ph) * Math.sin(th) * q]; },
    // سطح كرة (للأجرام)
    sphere: (cx, cy, R, z = 0, j = 0.01) => () => { const th = r() * TAU, ph = Math.acos(2 * r() - 1); return jit([cx + Math.sin(ph) * Math.cos(th) * R, cy + Math.cos(ph) * R, z + Math.sin(ph) * Math.sin(th) * R], j); },
    // أرض بيضاوية
    ground: (y, R) => () => { const th = r() * TAU, rad = Math.sqrt(r()) * R; return [Math.cos(th) * rad, y + J(0.02), Math.sin(th) * rad * 0.55]; },
    // غبار حول الشكل
    dust: (R) => () => { const th = r() * TAU, ph = Math.acos(2 * r() - 1), rad = R * (0.55 + r() * 0.45); return [Math.sin(ph) * Math.cos(th) * rad, Math.cos(ph) * rad * 0.7, Math.sin(ph) * Math.sin(th) * rad * 0.6]; },
    // عمق: يمد شكلًا مسطحًا للأمام والخلف (مثل جسم مجسم رقيق)
    depth: (gen, d = 0.25) => () => { const p = gen(); return [p[0], p[1], (p[2] || 0) + (r() * 2 - 1) * d]; },
    // تحويل: إزاحة/تكبير/دوران حول z لمولّد
    move: (gen, dx = 0, dy = 0, s = 1, rot = 0) => { const c = Math.cos(rot), sn = Math.sin(rot); return () => { const p = gen(); const x = p[0] * s, y = p[1] * s; return [x * c - y * sn + dx, x * sn + y * c + dy, (p[2] || 0) * s]; }; },
    // نص عربي بالنقاط (يعمل في المتصفح؛ في المعاينة يظهر خطًا مكانه)
    text: (str, { maxW = 3.2, maxH = 1.0, ox = 0, oy = 0 } = {}) => (opts.text ? opts.text(str, { maxW, maxH, ox, oy }) : k.seg([ox - maxW / 2, oy, 0], [ox + maxW / 2, oy, 0], 0.08)),
  };
  return k;
}

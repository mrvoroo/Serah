// @ts-nocheck
// أشكال مراجَعة لاحقًا: توبة سيدنا آدم، وسيوف النبي ﷺ (رسم تقريبي على صفة السيف العربي — content/swords.json)
const PI = Math.PI;

// ورقة بيضاوية مدببة: محيط + عرق في الوسط، مركزها c وزاويتها ang وطولها L
function leaf(k, c, ang, L = 0.42) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const at = (x, y) => [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca, c[2] || 0];
  return k.many([
    k.curve((u) => { const t = u * 2 * PI, x = Math.cos(t) * L / 2, y = Math.sin(t) * L * 0.2 * Math.abs(Math.sin(t) + 0.0001) ** 0.15; return at(x, y); }, 0.008),
    k.curve((u) => at(-L / 2 + u * L * 0.95, 0), 0.006),
  ]);
}

// سيف عربي: نصل مستقيم ذو حدّين برأس واحد مدبب، واقية قصيرة هلالية طرفاها نحو النصل (لا واقية مستقيمة حتى لا تتكون هيئة صليب)،
// مقبض قصير وقبيعة مستديرة (فضة). grooves: حزوز متتابعة في وسط النصل (معنى «ذو الفقار»)
function sword(k, { grooves = false, slim = 1 } = {}) {
  const W = 0.2 * slim, Y0 = -1.05, Y1 = 1.75, TIP = 2.2;
  const half = (y) => (y < Y1 ? W : W * (TIP - y) / (TIP - Y1));
  const edges = k.many([
    k.curve((u) => { const y = Y0 + u * (TIP - Y0); return [half(y), y, 0]; }, 0.008),
    k.curve((u) => { const y = Y0 + u * (TIP - Y0); return [-half(y), y, 0]; }, 0.008),
  ]);
  const body = () => { const y = Y0 + k.r() * (TIP - Y0), h = half(y); return [(k.r() * 2 - 1) * h * 0.9, y, k.J(0.02)]; };
  const ridge = k.seg([0, Y0, 0.02], [0, TIP - 0.05, 0.02], 0.006);
  // حزوز ذي الفقار: بيضاويات صغيرة متتابعة على طول المتن
  const fuqar = () => { const i = Math.floor(k.r() * 9), cy = Y0 + 0.3 + i * 0.27, a = k.r() * 2 * PI; return [Math.cos(a) * W * 0.42, cy + Math.sin(a) * 0.08, 0.03]; };
  // واقية هلالية: طرفاها ينحنيان لأعلى نحو النصل
  const guard = k.curve((u) => { const x = (u * 2 - 1) * 0.55; return [x, Y0 - 0.08 + x * x * 0.55, 0]; }, 0.012);
  const grip = k.many([k.seg([0.075, Y0 - 0.1, 0], [0.075, -1.85, 0], 0.006), k.seg([-0.075, Y0 - 0.1, 0], [-0.075, -1.85, 0], 0.006),
    () => { const y = Y0 - 0.12 - k.r() * 0.7, a = k.r() * 2 * PI; return [Math.cos(a) * 0.075, y + Math.sin(a) * 0.02, Math.sin(a) * 0.075]; }]);
  const pommel = k.sphere(0, -2.03, 0.17, 0, 0.006);
  const parts = [[0.3, edges], [0.12, body], [0.06, ridge], [0.12, guard], [0.12, grip], [0.12, pommel], [0.06, k.dust(4.2)]];
  if (grooves) parts.push([0.14, fuqar]);
  // ميل خفيف حتى يبدو مجسمًا ويختلف عن أي هيئة متعامدة
  return parts.map(([w, g, f]) => [w, k.move(g, 0, 0.05, 1, -0.32), f]);
}

export const SHAPES_C = {
  // التوبة والهبوط إلى الأرض (البقرة ٣٦-٣٧): غصن في الأعلى، أوراق تهبط، «كلمات» نور نقاط منفصلة تكبر نزولًا،
  // وأرض هادئة تخرج منها نبتة بورقتين وفوقها توهج دائري. ممنوع: خطوط متعامدة/متقاطعة، عمود نور، أي هيئة إنسان
  repentance_descent: (k) => {
    const branch = k.curve((u) => { const x = -2.1 + u * 3.6; return [x, 1.75 - 0.18 * Math.sin(u * PI) + 0.12 * u, 0]; }, 0.014);
    const topLeaves = k.many([leaf(k, [-1.4, 1.5], -0.6), leaf(k, [-0.5, 1.45], -0.9), leaf(k, [0.4, 1.55], -0.5), leaf(k, [1.1, 1.62], -1.1, 0.36)]);
    const falling = k.many([leaf(k, [0.9, 0.75], 0.5, 0.36), leaf(k, [-0.3, 0.05], -0.3, 0.34), leaf(k, [-1.25, -0.5], 0.8, 0.3)]);
    // «الكلمات»: نقاط نور منفصلة على مسار متموج من الغصن إلى النبتة، أصغر في الأعلى وأكبر في الأسفل
    const words = k.many(Array.from({ length: 6 }, (_, i) => {
      const u = (i + 0.5) / 6, x = 0.35 * Math.sin(u * PI * 1.6) + 0.15 - u * 0.15, y = 1.15 - u * 2.55;
      return k.glow(x, y, 0.05 + u * 0.07);
    }));
    const ground = k.curve((u) => { const x = -2.4 + u * 4.8; return [x, -2.15 + 0.22 * Math.cos(x * 0.65), k.J(0.05)]; }, 0.016);
    const soil = () => { const x = (k.r() * 2 - 1) * 2.2; return [x, -2.25 + 0.22 * Math.cos(x * 0.65) - k.r() * 0.2, (k.r() * 2 - 1) * 0.5]; };
    const stem = k.curve((u) => [0.04 * Math.sin(u * 3), -1.95 + u * 0.45, 0], 0.008);
    const sprout = k.many([leaf(k, [-0.2, -1.42], 2.5, 0.38), leaf(k, [0.2, -1.42], 0.64, 0.38)]);
    // توهج ناعم بلا حلقة (الحلقة فوق الساق كانت تشبه رمزًا)
    const halo = () => { const a = k.r() * 2 * PI, q = 0.38 * Math.sqrt(k.r()); return [Math.cos(a) * q, -1.1 + Math.sin(a) * q * 0.8, k.J(0.05)]; };
    return [[0.14, branch], [0.16, topLeaves], [0.12, falling], [0.16, words, 3], [0.12, ground], [0.06, soil], [0.04, stem], [0.1, sprout], [0.05, halo, 3], [0.05, k.dust(4.2)]];
  },
  dhulfiqar: (k) => sword(k, { grooves: true }),
  arab_sword: (k) => sword(k),
};

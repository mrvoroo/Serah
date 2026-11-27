// طبقة حركة خفيفة فوق مشهد القصة (Canvas 2D): شرر ذهبي أو ذرات تراب ملونة عند لمس الطفل، وأوراق تتساقط بهدوء.
// بلا أي هيئة بشرية. تتوقف تمامًا لما مفيش حاجة بتتحرك أو لما المشهد يخرج من الشاشة (توفيرًا للبطارية).

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: 0 | 1; rot: number; vr: number };

export type StoryFx = { burst: (x: number, y: number, colors: string[], n?: number, opts?: { down?: boolean }) => void; leaves: (on: boolean) => void; dispose: () => void };

const LEAF = ["#5f8f3a", "#7fae4a", "#9cbf5a", "#c9a64a"];
const MAX = 400;

export function createStoryFx(canvas: HTMLCanvasElement, opts: { lite?: boolean } = {}): StoryFx {
  const ctx = canvas.getContext("2d");
  const ps: P[] = [];
  let raf = 0, last = 0, leavesOn = false, leafTimer = 0, disposed = false, visible = true, w = 1, h = 1;
  const dpr = opts.lite ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const size = () => {
    w = canvas.clientWidth || 1; h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  };
  size();
  const ro = window.ResizeObserver ? new ResizeObserver(size) : null;
  ro?.observe(canvas);

  // كل لون له صورة توهج جاهزة تترسم بـ drawImage (بدل تدرج جديد لكل ذرة في كل فريم)
  const sprites = new Map<string, HTMLCanvasElement>();
  const sprite = (c: string) => {
    let s = sprites.get(c);
    if (!s) {
      s = document.createElement("canvas"); s.width = s.height = 64;
      const x = s.getContext("2d");
      if (x) { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
      sprites.set(c, s);
    }
    return s;
  };

  const spawnLeaf = () => {
    if (ps.length >= MAX) return;
    ps.push({ x: w * (0.3 + Math.random() * 0.4), y: h * (0.18 + Math.random() * 0.15), vx: (Math.random() - 0.5) * 12, vy: 14 + Math.random() * 10,
      life: 0, max: 5 + Math.random() * 2, size: 5 + Math.random() * 3, color: LEAF[(Math.random() * LEAF.length) | 0], kind: 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 1.5 });
  };

  const tick = (t: number) => {
    raf = 0;
    if (disposed || !ctx || !visible) { last = 0; return; }
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    if (leavesOn) { leafTimer -= dt; if (leafTimer <= 0) { spawnLeaf(); leafTimer = 0.9 + Math.random() * 1.2; } }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // تحديث وحذف بالتبديل مع الأخير (أسرع من splice)
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      if (p.kind === 0) { p.vx *= 0.96; p.vy = p.vy * 0.96 - 12 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.x += (p.vx + Math.sin(p.life * 2 + p.rot) * 10) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    }
    // الشرر كله مرة واحدة بالإضافة، وبعده الأوراق عادي
    ctx.globalCompositeOperation = "lighter";
    for (const p of ps) {
      if (p.kind !== 0) continue;
      const k = p.life / p.max, r = p.size * 3;
      ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.3);
      ctx.drawImage(sprite(p.color), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    for (const p of ps) {
      if (p.kind !== 1) continue;
      const c = Math.cos(p.rot) * dpr, s = Math.sin(p.rot) * dpr;
      ctx.setTransform(c, s, -s, c, p.x * dpr, p.y * dpr);
      ctx.globalAlpha = Math.sin(Math.PI * (p.life / p.max)) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    if (ps.length || leavesOn) raf = requestAnimationFrame(tick); else last = 0;
  };
  const kick = () => { if (!raf && !disposed && visible) raf = requestAnimationFrame(tick); };

  const io = window.IntersectionObserver ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }) : null;
  io?.observe(canvas);

  return {
    burst(x, y, colors, n = 26, o = {}) {
      for (let i = 0; i < n && ps.length < MAX; i++) {
        const a = o.down ? Math.PI / 2 + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
        ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.down ? 0 : 25), life: 0, max: 1.2 + Math.random() * 1.3, size: 1.6 + Math.random() * 2.6,
          color: colors[(Math.random() * colors.length) | 0], kind: 0, rot: 0, vr: 0 });
      }
      kick();
    },
    leaves(on) { leavesOn = on; if (on) { leafTimer = 0.2; kick(); } },
    dispose() { disposed = true; if (raf) cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); sprites.clear(); },
  };
}

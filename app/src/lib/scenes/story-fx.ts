// طبقة حركة خفيفة فوق مشهد القصة (Canvas 2D): شرر ذهبي أو ذرات تراب ملونة عند لمس الطفل، وأوراق تتساقط بهدوء.
// بلا أي هيئة بشرية. تتوقف تمامًا لما مفيش حاجة بتتحرك (توفيرًا للبطارية).

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: "spark" | "leaf"; rot: number; vr: number };

export type StoryFx = { burst: (x: number, y: number, colors: string[], n?: number, opts?: { down?: boolean }) => void; leaves: (on: boolean) => void; dispose: () => void };

export function createStoryFx(canvas: HTMLCanvasElement, opts: { motion: boolean }): StoryFx {
  const ctx = canvas.getContext("2d");
  const ps: P[] = [];
  let raf = 0, last = 0, leavesOn = false, leafTimer = 0, disposed = false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  };
  size();
  const ro = window.ResizeObserver ? new ResizeObserver(size) : null;
  ro?.observe(canvas);

  const leafColors = ["#5f8f3a", "#7fae4a", "#9cbf5a", "#c9a64a"];
  const spawnLeaf = () => {
    const w = canvas.clientWidth;
    ps.push({ x: w * (0.3 + Math.random() * 0.4), y: canvas.clientHeight * (0.18 + Math.random() * 0.15), vx: (Math.random() - 0.5) * 12, vy: 14 + Math.random() * 10,
      life: 0, max: 5 + Math.random() * 2, size: 5 + Math.random() * 3, color: leafColors[(Math.random() * leafColors.length) | 0], kind: "leaf", rot: Math.random() * 6, vr: (Math.random() - 0.5) * 1.5 });
  };

  const tick = (t: number) => {
    raf = 0;
    if (disposed || !ctx) return;
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    if (leavesOn) { leafTimer -= dt; if (leafTimer <= 0) { spawnLeaf(); leafTimer = 0.9 + Math.random() * 1.2; } }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) { ps.splice(i, 1); continue; }
      const k = p.life / p.max;
      if (p.kind === "spark") {
        p.vx *= 0.96; p.vy = p.vy * 0.96 - 12 * dt; // تطفو لفوق ببطء
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.3);
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        g.addColorStop(0, p.color); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill();
      } else {
        p.x += (p.vx + Math.sin(p.life * 2 + p.rot) * 10) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = Math.sin(Math.PI * k) * 0.9;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (ps.length || leavesOn) raf = requestAnimationFrame(tick); else last = 0;
  };
  const kick = () => { if (!raf && !disposed && opts.motion) raf = requestAnimationFrame(tick); };

  return {
    burst(x, y, colors, n = 26, o = {}) {
      if (!opts.motion) return;
      for (let i = 0; i < n; i++) {
        const a = o.down ? Math.PI / 2 + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2, s = 30 + Math.random() * 90;
        ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.down ? 0 : 25), life: 0, max: 1.2 + Math.random() * 1.3, size: 1.6 + Math.random() * 2.6,
          color: colors[(Math.random() * colors.length) | 0], kind: "spark", rot: 0, vr: 0 });
      }
      if (ps.length > 400) ps.splice(0, ps.length - 400);
      kick();
    },
    leaves(on) { leavesOn = on && opts.motion; if (leavesOn) { leafTimer = 0.2; kick(); } },
    dispose() { disposed = true; if (raf) cancelAnimationFrame(raf); ro?.disconnect(); },
  };
}

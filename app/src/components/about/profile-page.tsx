"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight, GraduationCap, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { BrandLogo, BRAND } from "@/components/brand-logo";
import { AboutBackdrop } from "@/components/about/backdrop";
import { useMotionAllowed } from "@/lib/tier";
import { useHome } from "@/components/home-back";

// قالب الصفحة الشخصية لفريق «المُنْتَهَى»: صورة تطفو وتميل مع المؤشر داخل حلقة ذهبية تدور، ونبذة، وقيم المنصة، وخاتمة خاصة بكل شخص
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const VALUES: { icon: typeof Sparkles; title: string; text: string; tone: string }[] = [
  { icon: Sparkles, title: "نتعلّم بحب", text: "قصص الأنبياء والقرآن بأشكال مضيئة وألعاب ونجوم، فيحب الطفل يرجع لها كل يوم.", tone: "from-[#8B6CFF] to-[#5B3FE0]" },
  { icon: ShieldCheck, title: "مكان آمن ومطمئن", text: "محتوى نحرص على مراجعته شرعيًا، بلا إعلانات ولا غرباء، تحت عين المعلمات والأهل.", tone: "from-[#2FB5A3] to-[#167A6E]" },
  { icon: HeartHandshake, title: "صدقة جارية بإذن الله", text: "كل آية يحفظها طفل، وكل قصة يتعلّم منها خيرًا، نرجو أجرها لكل من ساهم في المنصة.", tone: "from-[#FFB020] to-[#E07A00]" },
];

// صورة دائرية: لو الملف لسه مش موجود نعرض الحرف الأول بدلها
export function AvatarCircle({ src, name, className, position = "center" }: { src: string; name: string; className?: string; position?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={`grid place-items-center bg-[radial-gradient(circle_at_40%_30%,#5B3FE0,#1A0F45)] font-ruqaa text-7xl text-[#FFD57A] ${className ?? ""}`}>{name.slice(0, 1)}</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${base}${src}`} alt={name} onError={() => setFailed(true)} className={`bg-white object-cover ${className ?? ""}`} style={{ objectPosition: position }} />
  );
}

export function ProfilePage({ photo, photoPosition, name, line, skills, children, closing, floaters }: {
  photo: string; photoPosition?: string; name: string; line: string; skills: string[]; children: ReactNode; closing?: ReactNode; floaters?: Icon3DName[];
}) {
  const animate = useMotionAllowed();
  const home = useHome();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-14, 14]), { stiffness: 120, damping: 14 });
  const [hint, setHint] = useState(true);
  useEffect(() => { const t = window.setTimeout(() => setHint(false), 4000); return () => window.clearTimeout(t); }, []);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const orbit = floaters ?? ["sparkles", "star", "glowing-star"];

  return (
    <main dir="rtl" className="relative min-h-svh overflow-hidden bg-[#0B0620] text-white">
      <AboutBackdrop />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-10 px-4 pb-24 pt-6">
        <nav className="flex w-full items-center justify-between">
          <Link href="/about/" className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/20"><ArrowRight className="size-4" /> من نحن</Link>
          <Link href={home} aria-label="المُنْتَهَى — الرئيسية" className="flex items-center gap-2"><span className="font-ruqaa text-2xl">{BRAND.display}</span><BrandLogo size={40} glow /></Link>
        </nav>

        <div className="relative mt-4 grid place-items-center" style={{ perspective: 900 }} onPointerMove={onMove} onPointerLeave={() => { mx.set(0); my.set(0); }}>
          <motion.div aria-hidden className="absolute size-[300px] rounded-full sm:size-[380px]"
            style={{ background: "conic-gradient(from 0deg, #FFC24D, #FF6FB5, #9C8BFF, #2FD3C0, #FFC24D)" }}
            animate={animate ? { rotate: 360 } : undefined} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} />
          <div aria-hidden className="absolute size-[288px] rounded-full bg-[#140B35] sm:size-[366px]" />
          <motion.div aria-hidden className="absolute size-[260px] rounded-full bg-[#FFC24D]/30 blur-3xl sm:size-[330px]"
            animate={animate ? { scale: [1, 1.12, 1], opacity: [0.5, 0.85, 0.5] } : undefined} transition={{ duration: 4, repeat: Infinity }} />
          <motion.div className="relative size-[288px] overflow-hidden rounded-full sm:size-[366px]" style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
            animate={animate ? { y: [0, -12, 0] } : undefined} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
            <AvatarCircle src={photo} name={name} position={photoPosition} className="size-full" />
          </motion.div>
          {orbit.map((ic, i) => (
            <motion.div key={i} aria-hidden className="absolute size-[340px] sm:size-[420px]" animate={animate ? { rotate: 360 } : undefined}
              transition={{ duration: 10 + i * 4, repeat: Infinity, ease: "linear", delay: i }}>
              <Icon3D name={ic} size={30} className="absolute -top-2 left-1/2" />
            </motion.div>
          ))}
          {hint && animate && <p className="absolute -bottom-8 text-xs text-white/60">حرّك المؤشر على الصورة ✨</p>}
        </div>

        <section className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-3xl font-extrabold">{name}</h1>
          <p className="flex items-center gap-2 text-white/80"><GraduationCap className="size-5 shrink-0 text-[#FFC24D]" /> {line}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {skills.map((s, i) => (
              <motion.span key={s} initial={animate ? { opacity: 0, scale: 0.6 } : false} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 * i, type: "spring" }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-bold backdrop-blur" dir={/[a-z]/i.test(s) ? "ltr" : "rtl"}>{s}</motion.span>
            ))}
          </div>
        </section>

        <motion.section initial={animate ? { opacity: 0, y: 30 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="w-full rounded-[32px] border border-white/15 bg-white/[0.06] p-6 text-lg leading-9 shadow-[0_20px_80px_-20px_rgba(123,92,255,0.6)] backdrop-blur-md sm:p-8">
          {children}
        </motion.section>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.div key={v.title} initial={animate ? { opacity: 0, y: 30, rotateX: 25 } : false} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.12 * i, type: "spring", stiffness: 120 }} whileHover={animate ? { y: -8, rotate: i === 1 ? 0 : i === 0 ? -1.5 : 1.5 } : undefined}
              className={`rounded-[28px] bg-gradient-to-br ${v.tone} p-5 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6)]`}>
              <v.icon className="size-8" />
              <h3 className="mt-2 font-heading text-xl font-extrabold">{v.title}</h3>
              <p className="mt-1 leading-7 text-white/90">{v.text}</p>
            </motion.div>
          ))}
        </div>

        {closing}

        <Link href={home} className="rounded-full bg-gradient-to-l from-[#FFC24D] to-[#FF8FCB] px-8 py-3 font-heading text-lg font-extrabold text-[#2A1300] shadow-[0_10px_30px_-8px_rgba(255,194,77,0.8)] transition-transform hover:scale-105">
          يلا نبدأ الرحلة 🚀
        </Link>
      </div>
    </main>
  );
}

// سطر كبير ثلاثي الأبعاد يطفو (للخاتمة)
export function Float3DText({ children, sub, emoji }: { children: ReactNode; sub?: ReactNode; emoji?: ReactNode }) {
  const animate = useMotionAllowed();
  return (
    <section className="relative flex flex-col items-center gap-3 py-10" style={{ perspective: 800 }}>
      <motion.p className="select-none text-center font-heading text-[clamp(2.6rem,11vw,6rem)] font-black leading-tight"
        style={{ color: "#FFE08A", textShadow: "0 1px 0 #F5B935, 0 2px 0 #E9A621, 0 3px 0 #DB9512, 0 4px 0 #C98508, 0 5px 0 #B67604, 0 6px 0 #A06702, 0 7px 0 #8A5800, 0 18px 30px rgba(0,0,0,0.55), 0 0 40px rgba(255,194,77,0.55)" }}
        animate={animate ? { y: [0, -14, 0], rotateX: [12, 4, 12], rotateZ: [-2, 2, -2] } : undefined} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        {children}
      </motion.p>
      {emoji && <motion.p className="mt-2 text-6xl" animate={animate ? { y: [0, -6, 0] } : undefined} transition={{ duration: 2.4, repeat: Infinity }}>{emoji}</motion.p>}
      {sub && <p className="text-center text-white/80">{sub}</p>}
    </section>
  );
}

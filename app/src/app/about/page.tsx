"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { BrandLogo, BRAND } from "@/components/brand-logo";
import { AboutBackdrop } from "@/components/about/backdrop";
import { AvatarCircle } from "@/components/about/profile-page";
import { useHome } from "@/components/home-back";
import { useMotionAllowed } from "@/lib/tier";

// «من نحن»: صورة الفريق (أحمد وعبد الله بالخوذة) في الأول، وقصة المنصة، ثم دائرتان تفتح كل منهما صفحة صاحبها
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TEAM = [
  { href: "/about/ahmad/", name: "أحمد", role: "نظم المعلومات · Odoo · Oracle SCM", photo: "/about/ahmad.jpg", pos: "center" },
  { href: "/about/abdullah/", name: "عبد الله", role: "أمن سيبراني · برمجة · ذكاء اصطناعي", photo: "/about/abdullah.jpg", pos: "center 20%" },
];

export default function About() {
  const animate = useMotionAllowed();
  const home = useHome();
  return (
    <main dir="rtl" className="relative min-h-svh overflow-hidden bg-[#0B0620] text-white">
      <AboutBackdrop />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-10 px-4 pb-24 pt-6">
        <nav className="flex w-full items-center justify-between">
          <Link href={home} aria-label="رجوع للرئيسية" className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/20"><ArrowRight className="size-4" /> الرئيسية</Link>
          <Link href={home} aria-label="المُنْتَهَى — الرئيسية" className="flex items-center gap-2"><span className="font-ruqaa text-2xl">{BRAND.display}</span><BrandLogo size={40} glow /></Link>
        </nav>

        <motion.h1 initial={animate ? { opacity: 0, y: 20 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center font-heading text-4xl font-extrabold sm:text-5xl">
          من <span className="bg-gradient-to-l from-[#FFC24D] via-[#FF8FCB] to-[#9C8BFF] bg-clip-text text-transparent">نحن</span>
        </motion.h1>

        {/* صورة الفريق: إطار ذهبي متحرك يطفو */}
        <motion.figure className="relative w-full max-w-sm" initial={animate ? { opacity: 0, scale: 0.9, rotate: -3 } : false} animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}>
          <motion.div aria-hidden className="absolute -inset-1.5 rounded-[44px]" style={{ background: "conic-gradient(from 0deg, #FFC24D, #FF6FB5, #9C8BFF, #2FD3C0, #FFC24D)" }}
            animate={animate ? { rotate: [0, 2, -2, 0] } : undefined} transition={{ duration: 6, repeat: Infinity }} />
          <motion.div aria-hidden className="absolute -inset-6 rounded-[56px] bg-[#FFC24D]/20 blur-3xl" animate={animate ? { opacity: [0.4, 0.8, 0.4] } : undefined} transition={{ duration: 4, repeat: Infinity }} />
          <motion.div className="relative overflow-hidden rounded-[40px] bg-[#140B35]" animate={animate ? { y: [0, -10, 0] } : undefined} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${base}/about/team.jpg`} alt="أحمد وعبد الله" className="aspect-[3/4] w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
          </motion.div>
          <figcaption className="mt-4 text-center font-heading text-lg font-extrabold">أحمد وعبد الله — صحاب وشركاء الحلم 🤝</figcaption>
        </motion.figure>

        <motion.section initial={animate ? { opacity: 0, y: 30 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="w-full rounded-[32px] border border-white/15 bg-white/[0.06] p-6 text-lg leading-9 shadow-[0_20px_80px_-20px_rgba(123,92,255,0.6)] backdrop-blur-md sm:p-8">
          <p>إحنا <b>أحمد</b> و<b>عبد الله</b>، اتنين صحاب 💛</p>
          <p className="mt-3">شُفنا إن فيه احتياج كبير لنظام يدير المحاضرات اللي بتتكلم عن <b>السيرة النبوية</b> و<b>أسماء الله الحسنى</b> والمحتوى الديني. فجت لنا فكرة إننا نبدأ بمنصة «<span className="font-ruqaa text-[1.15em] text-[#FFC24D]">المنتهى</span>».</p>
          <p className="mt-3">وعملناها بشكل احترافي جدًا وسهل جدًا، يناسب المعلمات ويناسب الأطفال، وسهلة في التعامل والاستخدام من غير أي تعقيدات — عشان كل طفل يتعلّق بالسيرة والقرآن، وكل معلمة توصّل رسالتها بأبسط طريقة.</p>
        </motion.section>

        <section aria-label="الفريق" className="flex flex-wrap justify-center gap-10">
          {TEAM.map((p, i) => (
            <Link key={p.href} href={p.href} aria-label={`الصفحة الشخصية: ${p.name}`} className="group flex flex-col items-center gap-3">
              <motion.div className="relative grid place-items-center" whileHover={animate ? { scale: 1.06, rotate: i ? 3 : -3 } : undefined} whileTap={animate ? { scale: 0.95 } : undefined}
                animate={animate ? { y: [0, -8, 0] } : undefined} transition={{ y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" } }}>
                <motion.div aria-hidden className="absolute size-[172px] rounded-full" style={{ background: "conic-gradient(from 0deg, #FFC24D, #FF6FB5, #9C8BFF, #2FD3C0, #FFC24D)" }}
                  animate={animate ? { rotate: 360 } : undefined} transition={{ duration: 10 + i * 3, repeat: Infinity, ease: "linear" }} />
                <div aria-hidden className="absolute size-[164px] rounded-full bg-[#140B35]" />
                <div className="relative size-[156px] overflow-hidden rounded-full shadow-[0_0_40px_-6px_rgba(255,194,77,0.7)]">
                  <AvatarCircle src={p.photo} name={p.name} position={p.pos} className="size-full" />
                </div>
              </motion.div>
              <span className="font-heading text-2xl font-extrabold group-hover:text-[#FFC24D]">{p.name}</span>
              <span className="max-w-[12rem] text-center text-sm text-white/70">{p.role}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

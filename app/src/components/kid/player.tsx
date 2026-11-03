"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowRight, Loader2, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { api, driveAudio, driveImage, fmtDate, type Lecture, type Me } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useMotionAllowed } from "@/lib/tier";
import { Zaid } from "@/components/zaid";
import { Icon3D } from "@/components/icon3d";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 0.75];
const fmt = (s: number) => { if (!isFinite(s)) return "0:00"; const m = Math.floor(s / 60); const x = Math.floor(s % 60); return `${m}:${String(x).padStart(2, "0")}`; };

export function Player({ id }: { id: string }) {
  const { data, loading } = useApi<Lecture[]>("lectures");
  const me = useApi<Me>("me");
  const lecture = useMemo(() => data?.find((l) => l.lecture_id === id), [data, id]);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const marked = useRef(false);
  const animate = useMotionAllowed();
  const already = me.data?.attended.includes(id) ?? false;

  const images = lecture?.images ?? [];
  const total = dur || Number(lecture?.duration_sec) || 0;
  const imgIndex = images.length ? Math.min(images.length - 1, Math.floor((t / Math.max(total, 1)) * images.length)) : -1;

  // حفظ مكان الاستماع
  const posKey = `serah_pos_${id}`;
  useEffect(() => {
    const a = audio.current; if (!a || !lecture) return;
    try { const p = Number(localStorage.getItem(posKey)); if (p > 5) a.currentTime = p; } catch { /* */ }
  }, [lecture, posKey]);

  const celebrate = async () => {
    if (marked.current) return;
    marked.current = true;
    setDone(true);
    if (animate) {
      const end = Date.now() + 900;
      const colors = ["#FFC24D", "#8B6CFF", "#3FD08F", "#FF7AB6"];
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    if (!already) { try { await api("markAttendance", { lecture_id: id }); invalidate("me"); invalidate("leaderboard"); me.reload(); } catch { marked.current = false; } }
  };

  const onTime = () => {
    const a = audio.current; if (!a) return;
    setT(a.currentTime);
    if (Math.floor(a.currentTime) % 5 === 0) { try { localStorage.setItem(posKey, String(a.currentTime)); } catch { /* */ } }
    if (a.duration && a.currentTime / a.duration > 0.9) celebrate();
  };

  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) a.play().catch(() => setFailed(true)); else a.pause(); };
  const skip = (s: number) => { const a = audio.current; if (a) a.currentTime = Math.max(0, Math.min(a.duration || 1e9, a.currentTime + s)); };
  const cycleSpeed = () => { const n = (speed + 1) % SPEEDS.length; setSpeed(n); if (audio.current) audio.current.playbackRate = SPEEDS[n]; };

  if (loading && !data) return <div className="flex flex-col gap-4"><Skeleton className="aspect-[4/3] rounded-[32px]" /><Skeleton className="h-40 rounded-[32px]" /></div>;
  if (!lecture) return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] border bg-card p-6 text-center">
      <Zaid mood="thinking" size={120} />
      <p className="font-bold">المحاضرة دي مش موجودة</p>
      <Link href="/kid/lectures/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>كل المحاضرات</Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/kid/lectures/" className="flex w-fit items-center gap-1 font-bold text-muted-foreground"><ArrowRight className="size-5" /> المحاضرات</Link>

      <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] bg-hero shadow-soft">
        <AnimatePresence mode="popLayout">
          {imgIndex >= 0 ? (
            <motion.img key={images[imgIndex]} src={driveImage(images[imgIndex], 1200)} alt="" referrerPolicy="no-referrer"
              initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: animate ? 0.8 : 0 }}
              className="absolute inset-0 size-full object-cover" />
          ) : (
            <motion.div key="ph" className="absolute inset-0 grid place-items-center"><Zaid mood={playing ? "happy" : "helping"} size={180} /></motion.div>
          )}
        </AnimatePresence>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((im, i) => <span key={im} className={cn("h-1.5 rounded-full bg-white/60 transition-all", i === imgIndex ? "w-6 bg-white" : "w-1.5")} />)}
          </div>
        )}
      </div>

      <div className="rounded-[32px] border bg-card p-5 shadow-soft">
        <h1 className="text-center font-heading text-2xl font-extrabold leading-snug">{lecture.title}</h1>
        <p className="text-center text-sm text-muted-foreground">{fmtDate(lecture.date)}</p>

        <audio ref={audio} src={driveAudio(lecture.audio_file_id)} preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={onTime}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)}
          onEnded={celebrate} onError={() => setFailed(true)} />

        <div className="mt-4" dir="ltr">
          <input type="range" min={0} max={total || 1} step={1} value={Math.min(t, total || 1)} aria-label="موضع الاستماع"
            onChange={(e) => { if (audio.current) audio.current.currentTime = Number(e.target.value); }}
            className="h-2 w-full cursor-pointer accent-[var(--primary)]" />
          <div className="mt-1 flex justify-between text-sm font-bold text-muted-foreground"><span>{fmt(t)}</span><span>{fmt(total)}</span></div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4" dir="ltr">
          <button type="button" onClick={() => skip(-15)} aria-label="رجوع ١٥ ثانية" className="grid size-14 place-items-center rounded-full bg-secondary"><RotateCcw className="size-6" /></button>
          <motion.button type="button" onClick={toggle} whileTap={{ scale: 0.9 }} aria-label={playing ? "إيقاف" : "تشغيل"}
            className="grid size-20 place-items-center rounded-full bg-gold text-[#3A2400] btn-3d">
            {buffering ? <Loader2 className="size-8 animate-spin" /> : playing ? <Pause className="size-9 fill-current" /> : <Play className="size-9 translate-x-0.5 fill-current" />}
          </motion.button>
          <button type="button" onClick={() => skip(15)} aria-label="تقديم ١٥ ثانية" className="grid size-14 place-items-center rounded-full bg-secondary"><RotateCw className="size-6" /></button>
        </div>
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={cycleSpeed} className="rounded-full bg-secondary px-4 py-1.5 text-sm font-bold">السرعة ×{SPEEDS[speed]}</button>
        </div>
        {failed && <p role="alert" className="mt-3 text-center text-sm font-bold text-destructive">تعذّر تشغيل الصوت، تأكد من الإنترنت وحاول تاني</p>}
      </div>

      <AnimatePresence>
        {(done || already) && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex items-center gap-3 rounded-[28px] bg-gradient-to-l from-emerald-500 to-teal-600 p-4 text-white shadow-soft">
            <Icon3D name="party" size={56} float />
            <div><p className="font-heading text-xl font-extrabold">{done && !already ? "برافو! كسبت ١٠ نجوم" : "سمعت المحاضرة دي قبل كده"}</p><p className="text-white/85">كمّل رحلتك مع الأنبياء</p></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

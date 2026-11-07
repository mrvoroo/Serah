"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Headphones, Loader2, Radio } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Icon3D } from "@/components/icon3d";
import { KidBuddy } from "@/components/kid-buddy";
import { JitsiRoom } from "@/components/live/jitsi-room";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtSlot, nextSlot, type LiveRoom, type LiveState } from "@/lib/live";
import { g } from "@/lib/kid-text";

// المحاضرة المباشرة للطفل: ضغطة واحدة للدخول (باسمه من حسابه)، والحضور يتسجل وحده بنبضة كل دقيقة
export default function KidLive() {
  const { data, loading, reload } = useApi<LiveState>("liveState");
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const beat = useRef<ReturnType<typeof setInterval> | null>(null);

  // نتابع بدء المحاضرة كل ٣٠ ثانية لو الطفل فاتح الصفحة قبل الميعاد
  useEffect(() => { if (room) return; const t = setInterval(reload, 30000); return () => clearInterval(t); }, [room, reload]);
  useEffect(() => () => { if (beat.current) clearInterval(beat.current); }, []);

  const stopBeat = () => { if (beat.current) clearInterval(beat.current); beat.current = null; };
  const onJoined = () => {
    if (!room || beat.current) return;
    const send = () => api<{ ended?: boolean }>("liveBeat", { live_id: room.live_id }).then((r) => { if (r.ended) { stopBeat(); setRoom(null); setEnded(true); reload(); } }).catch(() => {});
    send(); beat.current = setInterval(send, 60000 + Math.floor(Math.random() * 15000)); // تفاوت بسيط حتى لا تصل نبضات الفصل كله في نفس الثانية
  };
  const join = async () => {
    if (!data?.live) return;
    setBusy(true); setEnded(false);
    try { setRoom(await api<LiveRoom>("liveJoin", { live_id: data.live.live_id })); } catch (e) { toast.error((e as Error).message); reload(); } finally { setBusy(false); }
  };
  const leave = () => { stopBeat(); setRoom(null); reload(); };

  if (loading && !data) return <Skeleton className="h-64 rounded-[28px]" />;
  const next = data ? nextSlot(data.slots) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold"><Icon3D name="mic" size={44} float /> المحاضرة المباشرة</h1>

      {room ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-[20px] bg-card p-3 shadow-soft">
            <span className="flex items-center gap-2 font-bold text-red-600"><span className="size-2.5 animate-pulse rounded-full bg-red-600" /> مباشر</span>
            <span className="min-w-0 flex-1 truncate font-heading font-extrabold">{room.title}</span>
            <button type="button" onClick={leave} aria-label="خروج من المحاضرة" className="rounded-xl px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10">خروج</button>
          </div>
          <p className="rounded-2xl bg-secondary/60 p-3 text-sm leading-7">🤫 المايك مقفول. لو عندك سؤال {g("اضغط", "اضغطي")} ✋ «رفع اليد»، ولما المعلمة تسمح لك تقدر تفتح المايك وتتكلم.</p>
          <JitsiRoom room={room} teacher={false} onJoined={onJoined} onLeft={() => { leave(); setEnded(true); }} />
        </section>
      ) : data?.live ? (
        <section className="relative overflow-hidden rounded-[32px] bg-hero p-6 text-center text-white shadow-soft">
          <p className="flex items-center justify-center gap-2 font-bold"><Radio className="size-5 animate-pulse" /> المحاضرة شغالة الآن!</p>
          <h2 className="mt-2 font-heading text-3xl font-extrabold">{data.live.title}</h2>
          {data.live.teacher && <p className="text-white/85">مع {data.live.teacher}</p>}
          <button type="button" onClick={join} disabled={busy}
            className="mx-auto mt-5 flex h-16 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-white text-xl font-extrabold text-primary shadow-soft transition active:scale-95 disabled:opacity-60">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <Headphones className="size-6" />} {g("ادخل", "ادخلي")} المحاضرة
          </button>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-2 rounded-[32px] bg-card p-6 text-center shadow-soft">
          <KidBuddy mood={ended ? "happy" : "thinking"} size={110} />
          {ended && <p className="font-heading text-xl font-extrabold">انتهت المحاضرة، جزاك الله خيرًا 🌟</p>}
          <p className="font-heading text-lg font-extrabold">{next ? `المحاضرة الجاية: ${fmtSlot(next.slot)}` : "مفيش محاضرة دلوقتي"}</p>
          {next && <p className="text-muted-foreground">{next.slot.title}</p>}
          <p className="text-sm text-muted-foreground">أول ما المعلمة تبدأ هيوصلك إشعار، {g("وادخل", "وادخلي")} من هنا.</p>
        </section>
      )}

      <Link href="/kid/lectures/" className="flex items-center gap-3 rounded-[24px] border bg-card p-4 font-bold shadow-soft">
        <Icon3D name="headphone" size={40} /> المحاضرات المسجلة <span className="ms-auto text-sm font-normal text-muted-foreground">{g("اسمع", "اسمعي")} اللي فاتك</span>
      </Link>
    </div>
  );
}

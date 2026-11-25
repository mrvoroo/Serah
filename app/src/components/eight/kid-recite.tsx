"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mic, Send, Square, Trash2 } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidate, useApi } from "@/hooks/use-api";
import { api, fmtDate } from "@/lib/api";
import { g } from "@/lib/kid-text";
import { JUZ_KID, RATING, ar, type Recitation } from "@/lib/eight";
import { cn } from "@/lib/utils";

// تسجيل التلاوة: الطفل يختار سورة من جزء عمّ ويسجّل (دقيقتان على الأكثر)، يسمع تسجيله ثم يرسله للمعلمة
const MAX_SEC = 120;
const MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
const pickMime = () => (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported ? MIMES.find((m) => MediaRecorder.isTypeSupported(m)) : undefined) ?? "";
const toBase64 = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function KidRecite() {
  const mine = useApi<Recitation[]>("myRecitations");
  const [surah, setSurah] = useState(112);
  const [rec, setRec] = useState<{ blob: Blob; url: string; sec: number; mime: string } | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "sending">("idle");
  const [sec, setSec] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const started = useRef(0);
  useEffect(() => () => { window.clearInterval(timer.current); mr.current?.stream.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => () => { if (rec) URL.revokeObjectURL(rec.url); }, [rec]);

  const start = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { toast.error("الجهاز ده ما بيدعمش التسجيل — جرّب متصفح كروم أو سفاري حديث"); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { toast.error(g("محتاجين إذن الميكروفون — اسمح للموقع بالميكروفون وجرّب تاني", "محتاجين إذن الميكروفون — اسمحي للموقع بالميكروفون وجرّبي تاني")); return; }
    const mime = pickMime(), chunks: BlobPart[] = [];
    const m = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000 }) : new MediaRecorder(stream);
    m.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    m.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      window.clearInterval(timer.current);
      const type = (m.mimeType || mime || "audio/webm").split(";")[0];
      const blob = new Blob(chunks, { type });
      const s = Math.max(1, Math.min(MAX_SEC, Math.round((Date.now() - started.current) / 1000)));
      setRec({ blob, url: URL.createObjectURL(blob), sec: s, mime: type });
      setState("idle");
    };
    mr.current = m; started.current = Date.now(); setSec(0); setRec(null);
    m.start(1000); setState("recording");
    timer.current = window.setInterval(() => {
      const s = Math.round((Date.now() - started.current) / 1000);
      setSec(s);
      if (s >= MAX_SEC && m.state === "recording") m.stop();
    }, 500);
  };
  const stop = () => { if (mr.current?.state === "recording") mr.current.stop(); };

  const send = async () => {
    if (!rec) return;
    if (rec.blob.size > 2.5 * 1024 * 1024) { toast.error(g("التسجيل كبير — سجّل تاني أقصر شوية", "التسجيل كبير — سجّلي تاني أقصر شوية")); return; }
    setState("sending");
    try {
      const r = await api<Recitation>("submitRecitation", { surah, mime: rec.mime, data: await toBase64(rec.blob), duration: rec.sec });
      toast.success(`${g("أرسلت", "أرسلتِ")} تلاوة سورة ${r.surah_name} للمعلمة 🎙️`);
      setRec(null); invalidate("myRecitations"); await mine.reload();
    } catch (e) { toast.error((e as Error).message); } finally { setState("idle"); }
  };
  const remove = async (id: string) => {
    if (!window.confirm(g("تحذف التسجيل ده؟", "تحذفي التسجيل ده؟"))) return;
    try { await api("deleteRecitation", { rec_id: id }); invalidate("myRecitations"); await mine.reload(); } catch (e) { toast.error((e as Error).message); }
  };
  const list = Array.isArray(mine.data) ? mine.data : [];

  return (
    <section aria-labelledby="kr-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="mic" size={56} float />
        <div>
          <h1 id="kr-title" className="font-heading text-2xl font-extrabold">{g("سجّل تلاوتك", "سجّلي تلاوتكِ")}</h1>
          <p className="text-sm text-muted-foreground">{g("اختار سورة واقرأها بهدوء، والمعلمة هتسمعك", "اختاري سورة واقرئيها بهدوء، والمعلمة هتسمعك")} وتكتب لك ملاحظة ⭐</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-[28px] border bg-card p-4 shadow-soft">
        <label className="flex flex-col gap-1.5 text-sm font-bold">السورة
          <select value={surah} disabled={state !== "idle"} onChange={(e) => setSurah(Number(e.target.value))} className="h-12 rounded-2xl border bg-background px-3 font-heading text-lg">
            {JUZ_KID.map((s) => <option key={s.n} value={s.n}>سورة {s.name} ({ar(s.ayahs)} آيات)</option>)}
          </select>
        </label>
        {state === "recording" ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div role="status" className="flex items-center gap-2 font-heading text-2xl font-extrabold text-destructive"><span className="size-3 animate-pulse rounded-full bg-destructive" /> {mmss(sec)} / {mmss(MAX_SEC)}</div>
            <Button variant="destructive" size="xl" onClick={stop}><Square /> إيقاف</Button>
          </div>
        ) : rec ? (
          <div className="flex flex-col gap-3">
            <audio controls src={rec.url} className="w-full" data-testid="preview" />
            <div className="flex flex-wrap gap-2">
              <Button variant="hero" size="lg2" disabled={state === "sending"} onClick={() => void send()}>{state === "sending" ? <Loader2 className="animate-spin" /> : <Send />} {g("ابعت للمعلمة", "ابعتي للمعلمة")}</Button>
              <Button variant="secondary" size="lg2" disabled={state === "sending"} onClick={() => void start()}><Mic /> {g("سجّل تاني", "سجّلي تاني")}</Button>
            </div>
          </div>
        ) : (
          <Button variant="gold" size="xl" onClick={() => void start()}><Mic /> {g("ابدأ التسجيل", "ابدئي التسجيل")}</Button>
        )}
        <p className="text-xs leading-6 text-muted-foreground">نبدأ بالاستعاذة والبسملة، ونقرأ ببطء وتدبّر. التسجيل يسمعه {g("انت", "انتِ")} ومعلمتك وولي أمرك بس.</p>
      </div>

      <h2 className="font-heading text-xl font-extrabold">تسجيلاتي</h2>
      {mine.loading && !mine.data ? <Skeleton className="h-24 rounded-[24px]" /> : list.length === 0 ? (
        <p className="rounded-[24px] border bg-card p-5 text-center text-sm text-muted-foreground">لسه ما {g("سجّلتش", "سجّلتيش")} — {g("جرّب", "جرّبي")} سورة صغيرة زي الإخلاص 🌱</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <li key={r.rec_id} data-testid="my-rec" className="flex flex-col gap-2 rounded-[24px] border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-lg font-extrabold">سورة {r.surah_name}</p>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", r.status === "reviewed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-secondary text-muted-foreground")}>
                  {r.status === "reviewed" ? "سمعتها المعلمة ✓" : "تنتظر المعلمة"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)} · {mmss(r.duration_sec)}</p>
              <AudioPlayer id={r.file_id} />
              {r.status === "reviewed" && (
                <div className="rounded-2xl bg-gold/10 p-3 text-sm leading-7">
                  <p className="font-bold">{"⭐".repeat(r.rating)} {r.rating === 1 ? g("أحسنت", "أحسنتِ") : RATING[r.rating]}</p>
                  {r.note && <p>المعلمة: {r.note}</p>}
                </div>
              )}
              {r.status === "pending" && <Button variant="ghost" size="lg" className="self-start text-destructive" onClick={() => void remove(r.rec_id)}><Trash2 /> حذف</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

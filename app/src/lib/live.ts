"use client";
import { api } from "@/lib/api";

// المحاضرات المباشرة (المرحلة 9): أنواع البيانات، والمواعيد الأسبوعية، وتسجيل صوت المعلمة مع الرفع أثناء المحاضرة
export type LiveInfo = { live_id: string; title: string; status: "live" | "ended"; started_at: string; ended_at: string; lecture_id: string; teacher: string; present?: number; partial?: number };
export type LiveSlot = { slot_id: string; title: string; week_min: number; minutes: number; tz?: string };
export type LiveState = { ready: boolean; domain: string; live: LiveInfo | null; slots: LiveSlot[]; recent?: LiveInfo[]; mine?: number };
export type LiveRoom = { live_id: string; domain: string; room: string; jwt: string; title: string; started_at: string; fresh?: boolean; mine?: boolean };
export type AttendStatus = "present" | "partial" | "absent" | "here";
export type LiveAttendRow = { user_id: string; name: string; avatar: string; seconds: number; status: AttendStatus; override: boolean };

export const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DEF_TZ = "Asia/Riyadh";
export const myTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || DEF_TZ; } catch { return DEF_TZ; } };

/* الموعد يُخزَّن بالتوقيت المحلي لمنطقة الأدمن (يوم + ساعة + المنطقة)، فلا يتحرك مع التوقيت الصيفي،
 * وكل جهاز يحسب اللحظة الفعلية ويعرضها بتوقيته. */
export const toWeekMin = (day: number, time: string) => { const [h, m] = time.split(":").map(Number); return day * 1440 + h * 60 + m; };
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function partsIn(ts: number, tz: string) {
  const o: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" })
    .formatToParts(new Date(ts)).forEach((p) => { o[p.type] = p.value; });
  return { y: +o.year, mo: +o.month - 1, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: WD[o.weekday] ?? 0 };
}
const offsetMin = (ts: number, tz: string) => { const p = partsIn(ts, tz); return Math.round((Date.UTC(p.y, p.mo, p.d, p.h, p.mi) - ts) / 60000); };
// لحظة «يوم/ساعة» بتوقيت منطقة معينة
function wallToInstant(y: number, mo: number, d: number, h: number, mi: number, tz: string) {
  const guess = Date.UTC(y, mo, d, h, mi);
  let t = guess - offsetMin(guess, tz) * 60000;
  t = guess - offsetMin(t, tz) * 60000;
  return t;
}
// أقرب موعد قادم (أو جارٍ الآن ضمن مدته)
export function nextSlot(slots: LiveSlot[], now = new Date()) {
  let best: { slot: LiveSlot; start: Date; running: boolean } | null = null;
  for (const s of slots) {
    const tz = s.tz || DEF_TZ, day = Math.floor(s.week_min / 1440), min = s.week_min % 1440;
    let today; try { today = partsIn(now.getTime(), tz); } catch { today = partsIn(now.getTime(), DEF_TZ); }
    for (let k = -1; k <= 7; k++) {
      if ((((today.wd + k) % 7) + 7) % 7 !== day) continue;
      const t = wallToInstant(today.y, today.mo, today.d + k, Math.floor(min / 60), min % 60, tz);
      if (t + s.minutes * 60000 <= now.getTime()) continue;
      const cand = { slot: s, start: new Date(t), running: t <= now.getTime() };
      if (!best || (cand.running && !best.running) || (cand.running === best.running && cand.start < best.start)) best = cand;
      break;
    }
  }
  return best;
}
export function fmtSlot(s: LiveSlot, now = new Date()) {
  const n = nextSlot([s], now);
  if (!n) return "";
  return `${DAYS[n.start.getDay()]} ${n.start.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}`;
}
export const fmtMinutes = (sec: number) => { const m = Math.round(sec / 60); return m < 1 ? "أقل من دقيقة" : `${m.toLocaleString("ar-EG")} دقيقة`; };
export const isAppleMobile = () => typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// تحميل مكتبة Jitsi من سيرفر المنصة نفسه
export type JitsiApi = { addListener: (e: string, fn: (x?: unknown) => void) => void; dispose: () => void; executeCommand: (c: string, ...a: unknown[]) => void };
type JitsiCtor = new (domain: string, opts: Record<string, unknown>) => JitsiApi;
let loading: Promise<JitsiCtor> | null = null;
export function loadJitsi(domain: string): Promise<JitsiCtor> {
  const w = window as unknown as { JitsiMeetExternalAPI?: JitsiCtor };
  if (w.JitsiMeetExternalAPI) return Promise.resolve(w.JitsiMeetExternalAPI);
  if (!loading) loading = new Promise<JitsiCtor>((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://${domain}/external_api.js`; s.async = true;
    s.onload = () => (w.JitsiMeetExternalAPI ? res(w.JitsiMeetExternalAPI) : rej(new Error("تعذّر تحميل المحاضرة")));
    s.onerror = () => rej(new Error("تعذّر الاتصال بسيرفر المحاضرات"));
    document.head.appendChild(s);
  }).catch((e) => { loading = null; throw e; });
  return loading;
}

/* تسجيل صوت المعلمة: يُرفع لدرايف أولًا بأول (أجزاء بمضاعفات ٢٥٦ ك.ب) ونحتفظ بالكل في الذاكرة (~١٥ ميجا للساعة)
 * فلو قطع النت نسأل درايف «وصلك لحد فين؟» ونكمل من هناك، ولو فشلت الجلسة نرفع الملف كاملًا في الآخر. */
const CHUNK = 256 * 1024;
const SAVE_KEY = "serah_live_upload";
type Saved = { live_id: string; url: string; sent: number; seconds: number };
export class LiveRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private parts: Blob[] = [];
  private sent = 0;
  private url = "";
  private broken = false;
  private chain: Promise<void> = Promise.resolve();
  private wake: { release: () => Promise<void> } | null = null;
  private fileId = "";
  private pausedMs = 0;
  private pausedAt = 0;
  mime = "";
  startedAt = 0;
  live_id = "";
  onSilent?: () => void;

  static supported() { return typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia; }

  async start(live_id: string, title: string) {
    this.live_id = live_id;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    try {
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      this.rec = new MediaRecorder(this.stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
      this.mime = (this.rec.mimeType || type || "audio/webm").split(";")[0];
    } catch (e) { this.stream.getTracks().forEach((t) => t.stop()); throw e; }
    // لو جهاز آخر (مثل غرفة المحاضرة على آيفون) أخذ المايك: ننبّه المعلمة
    this.stream.getAudioTracks().forEach((t) => { t.onmute = () => this.onSilent?.(); });
    try {
      const r = await api<{ uploadUrl: string }>("startUpload", { name: `${title}.${this.mime.includes("mp4") ? "m4a" : "webm"}`, mime: this.mime, kind: "audio", origin: window.location.origin });
      this.url = r.uploadUrl; this.save();
    } catch { this.broken = true; }
    this.rec.ondataavailable = (e) => { if (e.data.size) { this.parts.push(e.data); this.flush(false); } };
    this.rec.start(15000);
    this.startedAt = Date.now();
    await this.lockScreen();
    document.addEventListener("visibilitychange", this.rewake);
  }
  private async lockScreen() {
    try { this.wake = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen"); } catch { /* الشاشة قد تنطفئ */ }
  }
  private rewake = () => { if (document.visibilityState === "visible" && this.rec && this.rec.state !== "inactive") this.lockScreen(); };
  private save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ live_id: this.live_id, url: this.url, sent: this.sent, seconds: this.seconds } satisfies Saved)); } catch { /* */ } }
  get recording() { return this.rec?.state === "recording"; }
  get paused() { return this.rec?.state === "paused"; }
  get seconds() { return this.startedAt ? Math.round((Date.now() - this.startedAt - this.pausedMs - (this.pausedAt ? Date.now() - this.pausedAt : 0)) / 1000) : 0; }
  // كتم المايك في الغرفة = إيقاف التسجيل مؤقتًا (لا نسجل البيت)
  pause() { if (this.rec?.state === "recording") { this.rec.pause(); this.pausedAt = Date.now(); } }
  resume() { if (this.rec?.state === "paused") { this.rec.resume(); this.pausedMs += Date.now() - this.pausedAt; this.pausedAt = 0; } }

  // يرفع الجديد من sent؛ والأخير بالحجم الكامل. يعتمد على ردّ درايف (Range) لا على ما أرسلناه
  private flush(final: boolean) {
    this.chain = this.chain.then(async () => {
      if (this.broken || !this.url) return;
      for (let tries = 0; tries < 5; tries++) {
        const all = new Blob(this.parts, { type: this.mime }), avail = all.size - this.sent;
        const n = final ? avail : Math.floor(avail / CHUNK) * CHUNK;
        if (!final && n < 4 * CHUNK) return;
        const range = n ? `bytes ${this.sent}-${this.sent + n - 1}/${final ? all.size : "*"}` : `bytes */${all.size}`;
        try {
          const r = await fetch(this.url, { method: "PUT", headers: { "Content-Range": range }, body: all.slice(this.sent, this.sent + n) });
          if (r.ok) { if (final) this.fileId = (await r.json()).id; this.sent = all.size; this.save(); return; }
          if (r.status === 308) { const want = this.sent + n; this.sent = rangeEnd(r); this.save(); if (!final && this.sent >= want) return; continue; } // وصل أقل؟ نكمل الباقي
          throw new Error("status " + r.status);
        } catch {
          await new Promise((res) => setTimeout(res, 2000 * (tries + 1)));
          // نسأل درايف عن آخر بايت وصله قبل الإعادة
          try { const q = await fetch(this.url, { method: "PUT", headers: { "Content-Range": "bytes */*" } }); if (q.status === 308) this.sent = rangeEnd(q); } catch { /* */ }
        }
      }
      this.broken = true;
    });
  }

  // إيقاف التسجيل وإكمال الرفع؛ يرجع معرّف الملف (أو يعيد الرفع كاملًا من الذاكرة لو تعطلت الجلسة)
  async stop(onProgress?: (p: number) => void): Promise<{ fileId: string; seconds: number }> {
    const seconds = this.seconds;
    if (this.rec && this.rec.state !== "inactive") {
      await new Promise<void>((res) => { this.rec!.addEventListener("stop", () => res(), { once: true }); this.rec!.stop(); });
    }
    this.release();
    this.flush(true);
    await this.chain;
    if (!this.fileId && this.parts.length) {
      const { uploadFile } = await import("@/lib/upload");
      const file = new File(this.parts, `live.${this.mime.includes("mp4") ? "m4a" : "webm"}`, { type: this.mime });
      this.fileId = await uploadFile(file, "audio", onProgress ?? (() => {}));
    }
    try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
    return { fileId: this.fileId, seconds };
  }
  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    document.removeEventListener("visibilitychange", this.rewake);
    this.wake?.release().catch(() => {});
  }
}
const rangeEnd = (r: Response) => { const g = r.headers.get("Range"); return g ? Number(g.split("-")[1]) + 1 : 0; };

// التسجيل الجاري يعيش خارج الصفحة: لو المعلمة فتحت صفحة ثانية في المنصة يكمل ولا يضيع
let current: { room: LiveRoom; rec: LiveRecorder | null } | null = null;
export const liveSession = { get: () => current, set: (v: typeof current) => { current = v; } };

// بعد إعادة تحميل الصفحة أثناء محاضرة: نُكمل ملف الجزء الذي رُفع قبلها (بدل أن يضيع)
export async function recoverUpload(): Promise<{ live_id: string; fileId: string; seconds: number } | null> {
  let s: Saved | null = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { /* */ }
  if (!s?.url || current?.rec) return null;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
  try {
    const q = await fetch(s.url, { method: "PUT", headers: { "Content-Range": "bytes */*" } });
    const sent = q.status === 308 ? rangeEnd(q) : 0;
    if (!sent) return null;
    const r = await fetch(s.url, { method: "PUT", headers: { "Content-Range": `bytes */${sent}` } });
    return r.ok ? { live_id: s.live_id, fileId: (await r.json()).id, seconds: s.seconds } : null;
  } catch { return null; }
}

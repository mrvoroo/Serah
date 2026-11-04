"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileAudio, Loader2, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import { putChunks } from "@/lib/upload";
import { ProphetSelect, useProphetOptions } from "@/components/teacher/lecture-editor";
import { invalidate } from "@/hooks/use-api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Icon3D } from "@/components/icon3d";
import { cn } from "@/lib/utils";

const audioDuration = (f: File) => new Promise<number>((res) => {
  const a = document.createElement("audio"); const u = URL.createObjectURL(f);
  a.preload = "metadata"; a.onloadedmetadata = () => { res(Math.round(a.duration) || 0); URL.revokeObjectURL(u); }; a.onerror = () => res(0); a.src = u;
});

export default function UploadPage() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [pct, setPct] = useState(-1);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [prophet, setProphet] = useState("");
  const prophets = useProphetOptions();
  // اختيار النبي يقترح العنوان لو لسه فاضي
  const pickProphet = (v: string) => {
    setProphet(v);
    const name = prophets.find((p) => p.value === v)?.label.replace(/\s*ﷺ\s*$/, "");
    if (name && !title.trim()) setTitle(v === "muhammad" ? "من سيرة سيدنا محمد ﷺ" : `قصة سيدنا ${name}`);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!file || !title.trim()) return;
    setState("busy"); setErr(""); setPct(0);
    try {
      const duration_sec = await audioDuration(file);
      const { uploadUrl } = await api<{ uploadUrl: string }>("startUpload", { name: file.name, mime: file.type || "audio/ogg", kind: "audio" });
      const id = await putChunks(uploadUrl, file, setPct);
      const l = await api<{ lecture_id: string }>("createLecture", { title: title.trim(), audio_file_id: id, duration_sec });
      if (prophet) await api("updateLecture", { lecture_id: l.lecture_id, prophet_id: prophet });
      setPct(100); setState("done"); invalidate("lectures"); invalidate("dashboard");
    } catch (e2) { setErr("تعذّر الرفع: " + (e2 as Error).message); setState("idle"); }
  };

  if (state === "done") return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[28px] border bg-card p-6 text-center shadow-soft">
      <Icon3D name="party" size={80} float />
      <h1 className="font-heading text-2xl font-extrabold">تم الرفع بنجاح</h1>
      <p className="text-muted-foreground">المحاضرة الآن مسودة، راجعيها ثم انشريها للأطفال</p>
      <div className="flex gap-2">
        <Link href="/teacher/lectures/" className={buttonVariants({ variant: "hero", size: "lg2" })}>مراجعة ونشر</Link>
        <Button variant="secondary" size="lg2" onClick={() => { setFile(null); setTitle(""); setProphet(""); setPct(-1); setState("idle"); }}>رفع آخر</Button>
      </div>
    </div>
  );

  return (
    <form onSubmit={send} className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="mic" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">رفع تسجيل محاضرة</h1><p className="text-sm text-muted-foreground">للملفات الكبيرة (أكبر من ٢٠ ميجا) أو من الكمبيوتر</p></div></div>
      <div className="flex flex-col gap-2 rounded-[24px] border bg-card p-5 shadow-soft">
        <Label htmlFor="lt">اسم المحاضرة</Label>
        <Input id="lt" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-12 rounded-xl text-base" placeholder="مثلًا: قصة سيدنا نوح" />
        <Label htmlFor="lp">المحاضرة عن أي نبي؟</Label>
        <ProphetSelect id="lp" value={prophet} onChange={pickProphet} />
        <input ref={input} type="file" accept="audio/*,.ogg,.opus,.m4a,.mp3" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          className={cn("mt-2 flex flex-col items-center gap-2 rounded-[20px] border-2 border-dashed p-8 transition-colors", drag ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50")}>
          {file ? <FileAudio className="size-10 text-primary" /> : <UploadCloud className="size-10 text-muted-foreground" />}
          <span className="font-bold">{file ? file.name : "اختاري ملف التسجيل أو اسحبيه هنا"}</span>
          {file && <span className="text-sm text-muted-foreground">{(file.size / 1048576).toFixed(1)} ميجا</span>}
        </button>
        {pct >= 0 && <div className="mt-2"><Progress value={pct} /><p className="mt-1 text-center text-sm font-bold">{pct}%</p></div>}
        {err && <p role="alert" className="text-center text-sm font-bold text-destructive">{err}</p>}
        <Button type="submit" variant="hero" size="xl" disabled={state === "busy" || !file || !title.trim()} className="mt-2">
          {state === "busy" ? <><Loader2 className="animate-spin" /> جارٍ الرفع...</> : <>رفع <CheckCircle2 /></>}
        </Button>
      </div>
    </form>
  );
}

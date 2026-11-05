"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { api, driveImage, type Question } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { ProphetSelect } from "@/components/teacher/lecture-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Draft = { key: string; text: string; options: string[]; correct: number; image_file_id: string };
export type QuizDraft = { quiz_id?: string; title: string; prophet_id: string; questions: Question[] };
const LETTERS = ["أ", "ب", "ج", "د"];
let seq = 0;
const blank = (): Draft => ({ key: `n${++seq}`, text: "", options: ["", "", "", ""], correct: -1, image_file_id: "" });
const fromQuestion = (q: Question): Draft => ({ key: q.question_id, text: q.text, options: [...q.options, "", "", "", ""].slice(0, 4), correct: q.correct ?? -1, image_file_id: q.image_file_id });

// إنشاء اختبار أو تعديله: عنوان، ونبي، وأسئلة اختيار من متعدد (2–4 اختيارات) مع صورة اختيارية
export function QuizEditor({ draft, onClose, onSaved }: { draft: QuizDraft | null; onClose: () => void; onSaved: () => void }) {
  // الإغلاق بالخطأ (Escape أو خارج النافذة) لا يضيّع اختبارًا مكتوبًا بدون تأكيد
  const dirty = useRef(false);
  const close = () => { if (dirty.current && !window.confirm("تجاهل ما كتبتِه في الاختبار؟")) return; dirty.current = false; onClose(); };
  const markDirty = useCallback(() => { dirty.current = true; }, []);
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[28px] sm:max-w-2xl">
        {draft && <Inner key={draft.quiz_id ?? "new"} draft={draft} onClose={() => { dirty.current = false; onClose(); }} onSaved={onSaved} onDirty={markDirty} />}
      </DialogContent>
    </Dialog>
  );
}

function Inner({ draft, onClose, onSaved, onDirty }: { draft: QuizDraft; onClose: () => void; onSaved: () => void; onDirty: () => void }) {
  const [title, setTitle] = useState(draft.title);
  const [prophet, setProphet] = useState(draft.prophet_id);
  const [qs, setQs] = useState<Draft[]>(() => (draft.questions.length ? draft.questions.map(fromQuestion) : [blank()]));
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } onDirty(); }, [title, prophet, qs, onDirty]);
  const patch = (i: number, p: Partial<Draft>) => setQs((l) => l.map((q, k) => (k === i ? { ...q, ...p } : q)));
  // الصورة ترتبط بالسؤال نفسه (لا برقمه) حتى لو تحرك السؤال أو حُذف أثناء الرفع
  const patchKey = (key: string, p: Partial<Draft>) => setQs((l) => l.map((q) => (q.key === key ? { ...q, ...p } : q)));
  const move = (i: number, to: number) => setQs((l) => { const n = l.slice(); const [x] = n.splice(i, 1); n.splice(to, 0, x); return n; });
  const upload = async (i: number, f?: File) => {
    if (!f) return;
    setBusy(`img${i}`); setPct(0);
    const key = qs[i].key;
    try { patchKey(key, { image_file_id: await uploadFile(f, "image", setPct) }); } catch (e) { toast.error((e as Error).message || "تعذر رفع الصورة"); } finally { setBusy(null); }
  };
  const save = async () => {
    setBusy("save");
    try {
      await api("saveQuiz", { quiz_id: draft.quiz_id, title, prophet_id: prophet,
        questions: qs.map((q) => ({ text: q.text, options: q.options, correct: q.correct, image_file_id: q.image_file_id })) });
      toast.success(draft.quiz_id ? "تم حفظ الاختبار" : "تم إنشاء الاختبار — ينتظر المراجعة والنشر");
      onSaved(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{draft.quiz_id ? "تعديل الاختبار" : "اختبار جديد"}</DialogTitle>
        <DialogDescription>اختاري الإجابة الصحيحة بالضغط على الدائرة بجانبها. اكتبي «سيدنا … عليه السلام» و«ﷺ» مع أسماء الأنبياء، واكتبي الآيات بنصها كاملة، ولا تستخدمي صورًا فيها وجوه للأنبياء أو الصحابة. يظهر الاختبار للأطفال بعد مراجعة الأدمن ونشره.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="qz-title">عنوان الاختبار</Label><Input id="qz-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="مثلًا: قصة سيدنا نوح عليه السلام" className="h-12 rounded-xl text-base" /></div>
          <div className="grid gap-1.5"><Label htmlFor="qz-prophet">عن أي نبي؟</Label><ProphetSelect id="qz-prophet" value={prophet} onChange={setProphet} /></div>
        </div>

        <ol className="grid gap-3">
          {qs.map((q, i) => (
            <li key={q.key} data-testid="quiz-question" className="grid gap-2 rounded-[22px] border bg-secondary/30 p-3">
              <div className="flex items-center gap-1">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-hero text-sm font-extrabold text-white">{(i + 1).toLocaleString("ar-EG")}</span>
                <span className="flex-1 font-bold">السؤال {(i + 1).toLocaleString("ar-EG")}</span>
                <Button variant="ghost" size="icon-lg" aria-label={`تقديم السؤال ${i + 1}`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
                <Button variant="ghost" size="icon-lg" aria-label={`تأخير السؤال ${i + 1}`} disabled={i === qs.length - 1} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
                <Button variant="ghost" size="icon-lg" className="text-destructive" aria-label={`حذف السؤال ${i + 1}`} disabled={qs.length === 1} onClick={() => setQs((l) => l.filter((_, k) => k !== i))}><Trash2 /></Button>
              </div>
              <Textarea aria-label={`نص السؤال ${i + 1}`} value={q.text} onChange={(e) => patch(i, { text: e.target.value })} maxLength={300} rows={2} placeholder="اكتبي السؤال" className="min-h-12 rounded-xl text-base" />
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <div key={k} className={cn("flex items-center gap-1 rounded-xl border bg-background ps-1", q.correct === k && "border-emerald-500 ring-2 ring-emerald-500/30")}>
                    <button type="button" aria-label={`الإجابة الصحيحة للسؤال ${i + 1}: الاختيار ${LETTERS[k]}`} aria-pressed={q.correct === k}
                      disabled={!o.trim()} title={o.trim() ? undefined : "اكتبي الاختيار أولًا"} onClick={() => patch(i, { correct: k })} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground disabled:opacity-40">
                      {q.correct === k ? <CheckCircle2 className="size-6 text-emerald-600" /> : <Circle className="size-6" />}
                    </button>
                    <Input aria-label={`السؤال ${i + 1} الاختيار ${LETTERS[k]}`} value={o} maxLength={120} placeholder={`الاختيار ${LETTERS[k]}${k > 1 ? " (اختياري)" : ""}`}
                      onChange={(e) => patch(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} className="h-10 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {q.image_file_id ? (
                  <span className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={driveImage(q.image_file_id, 200)} alt={`صورة السؤال ${i + 1}`} className="h-16 w-24 rounded-xl object-cover" />
                    <button type="button" aria-label={`إزالة صورة السؤال ${i + 1}`} onClick={() => patch(i, { image_file_id: "" })} className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-white"><X className="size-3.5" /></button>
                  </span>
                ) : (
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary">
                    {busy === `img${i}` ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} صورة (اختياري)
                    <input type="file" accept="image/*" className="sr-only" aria-label={`صورة للسؤال ${i + 1}`} disabled={!!busy} onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                )}
                {busy === `img${i}` && <Progress value={pct} className="flex-1" />}
              </div>
            </li>
          ))}
        </ol>
        <Button variant="secondary" size="lg2" disabled={qs.length >= 30} onClick={() => setQs((l) => [...l, blank()])}><Plus /> إضافة سؤال</Button>
      </div>
      <DialogFooter>
        <Button variant="hero" size="lg2" disabled={!title.trim() || !!busy} onClick={save}>{busy === "save" && <Loader2 className="animate-spin" />} حفظ الاختبار</Button>
      </DialogFooter>
    </>
  );
}

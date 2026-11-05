"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Trash2, Undo2, Users } from "lucide-react";
import { api, fmtDate, session, type Assignment, type AssignmentStatus, type SubStatus } from "@/lib/api";
import { teacherTitle } from "@/lib/utils";
import { invalidate, useApi } from "@/hooks/use-api";
import { ProphetSelect, useProphetOptions } from "@/components/teacher/lecture-editor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon3d";
import { KidAvatar } from "@/components/kid/kid-avatar";

const n = (v: number) => v.toLocaleString("ar-EG");
type Form = { assignment_id?: string; title: string; details: string; due: string; prophet_id: string; helpers: string[]; owner: boolean };
const SUB_LABEL: Record<SubStatus, string> = { "": "لم يبدأ", done: "أنجز — ينتظر الاعتماد", approved: "معتمد ⭐", returned: "مطلوب إعادته" };

export default function TeacherHomework() {
  const { data, loading, error, reload } = useApi<Assignment[]>("assignments");
  const [form, setForm] = useState<Form | null>(null);
  const [statusFor, setStatusFor] = useState<Assignment | null>(null);
  const [delFor, setDelFor] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const prophets = useProphetOptions();
  const prophetName = (id?: string) => prophets.find((p) => p.value === id)?.label;
  const refresh = () => { invalidate("assignments"); reload(); };
  const me = session.user();
  const isAdmin = ["admin", "superadmin"].includes(me?.role ?? "");
  // معلمات الفصل لمشاركة الواجب معهن
  const teachers = useApi<{ user_id: string; name: string; role: string }[]>("classTeachers");

  const save = async () => {
    if (!form) return;
    setBusy(true);
    try { const { owner, ...body } = form; await api("saveAssignment", owner ? body : { ...body, helpers: undefined }); toast.success(form.assignment_id ? "تم حفظ الواجب" : "تم نشر الواجب للأطفال"); setForm(null); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!delFor) return;
    setBusy(true);
    try { await api("deleteAssignment", { assignment_id: delFor.assignment_id }); toast.success("تم حذف الواجب"); setDelFor(null); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="memo" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">الواجبات</h1><p className="text-sm text-muted-foreground">الطفل يضع «أنجزت»، وعند اعتمادك يأخذ ١٥ نجمة. في واجبات الحفظ استمعي للطفل قبل الاعتماد</p></div></div>
        <Button variant="hero" size="lg2" onClick={() => setForm({ title: "", details: "", due: "", prophet_id: "", helpers: [], owner: true })}><Plus /> واجب جديد</Button>
      </div>
      {error && !data && <p className="rounded-[24px] border bg-card p-6 text-center text-destructive">{error} <Button variant="link" onClick={reload}>إعادة المحاولة</Button></p>}
      {loading && !data ? [0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-[24px]" />) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {(data ?? []).map((a, i) => (
            <BlurFade key={a.assignment_id} delay={0.03 * Math.min(i, 10)}>
              <li data-testid="homework-card" className="flex flex-col gap-3 rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-extrabold leading-snug">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.due ? `التسليم ${fmtDate(a.due)}` : "بدون موعد"}{prophetName(a.prophet_id) && ` · ${prophetName(a.prophet_id)}`}</p>
                    {a.created_by_name && a.created_by !== me?.user_id && <p className="text-xs text-muted-foreground">من {teacherTitle(a.created_by_name, "teacher")}{a.can_manage ? " — مشترك معكِ" : ""}</p>}
                    {a.details && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm">{a.details}</p>}
                  </div>
                  {!!a.done && <Badge className="rounded-full bg-gold text-[#3A2400]">{n(a.done)} ينتظر</Badge>}
                </div>
                {a.can_manage === false ? (
                  <p className="rounded-2xl bg-secondary/50 p-3 text-sm text-muted-foreground">واجب معلمة أخرى — تقدر صاحبته تشاركه معكِ لتتابعيه</p>
                ) : <div className="flex gap-2">
                  <Button variant="secondary" size="lg2" className="flex-1" aria-label={`متابعة ${a.title}`} onClick={() => setStatusFor(a)}><Users /> المتابعة · {n(a.approved ?? 0)} من {n(a.kids ?? 0)}</Button>
                  <Button variant="secondary" size="icon-xl" aria-label={`تعديل ${a.title}`} onClick={() => setForm({ assignment_id: a.assignment_id, title: a.title, details: a.details, due: a.due, prophet_id: a.prophet_id, helpers: a.helpers ?? [], owner: !a.created_by || a.created_by === me?.user_id || isAdmin })}><Pencil /></Button>
                  {(!a.created_by || a.created_by === me?.user_id || isAdmin) && <Button variant="ghost" size="icon-xl" className="text-destructive" aria-label={`حذف ${a.title}`} onClick={() => setDelFor(a)}><Trash2 /></Button>}
                </div>}
              </li>
            </BlurFade>
          ))}
          {data?.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد واجبات بعد</p>}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.assignment_id ? "تعديل الواجب" : "واجب جديد"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="hw-title">العنوان</Label><Input id="hw-title" value={form.title} maxLength={120} placeholder="مثلًا: احفظ سورة الفاتحة" onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-12 rounded-xl text-base" /></div>
              <div className="grid gap-1.5"><Label htmlFor="hw-details">التفاصيل</Label><p className="text-xs text-muted-foreground">لو في الواجب آية أو حديث أو معلومة عن نبي، اكتبي المصدر (السورة ورقم الآية، أو راوي الحديث)</p><Textarea id="hw-details" rows={3} maxLength={1500} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="hw-due">موعد التسليم</Label><Input id="hw-due" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className="h-12 rounded-xl" /></div>
                <div className="grid gap-1.5"><Label htmlFor="hw-prophet">عن أي نبي؟</Label><ProphetSelect id="hw-prophet" value={form.prophet_id} onChange={(v) => setForm({ ...form, prophet_id: v })} /></div>
              </div>
              {form.owner && !!teachers.data?.length && (
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1 text-sm font-bold">مشاركة الواجب مع (تتابعه وتعتمده معكِ)</legend>
                  <div className="flex flex-wrap gap-2">
                    {teachers.data.map((tc) => {
                      const on = form.helpers.includes(tc.user_id);
                      return (
                        <button key={tc.user_id} type="button" role="checkbox" aria-checked={on}
                          onClick={() => setForm({ ...form, helpers: on ? form.helpers.filter((x) => x !== tc.user_id) : [...form.helpers, tc.user_id] })}
                          className={`h-10 rounded-full px-4 text-sm font-bold transition ${on ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary/60"}`}>
                          {on ? "✓ " : ""}{teacherTitle(tc.name, tc.role)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          )}
          <DialogFooter><Button variant="hero" size="lg2" disabled={!form?.title.trim() || busy} onClick={save}>{busy && <Loader2 className="animate-spin" />} حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <StatusDialog assignment={statusFor} onClose={() => setStatusFor(null)} onChanged={refresh} />

      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف «{delFor?.title}»؟</DialogTitle><DialogDescription>يختفي الواجب من عند الأطفال، والنجوم المعتمدة تبقى لهم</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" disabled={busy} onClick={del}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// متابعة الواجب: حالة كل طفل، والاعتماد أو طلب الإعادة
function StatusDialog({ assignment, onClose, onChanged }: { assignment: Assignment | null; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApi<AssignmentStatus>("assignmentStatus", { assignment_id: assignment?.assignment_id }, { enabled: !!assignment });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const review = async (user_id: string, approve: boolean) => {
    setBusy(user_id);
    try {
      await api("reviewAssignment", { assignment_id: assignment?.assignment_id, user_id, approve });
      toast.success(approve ? "تم الاعتماد — أخذ ١٥ نجمة" : "طُلب منه إعادة الواجب");
      invalidate("assignmentStatus"); reload(); onChanged();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[28px] sm:max-w-lg">
        <DialogHeader><DialogTitle>متابعة «{assignment?.title}»</DialogTitle><DialogDescription>زر الاعتماد يظهر لمن ضغط «أنجزت»</DialogDescription></DialogHeader>
        {error && <p className="text-destructive">{error}</p>}
        {loading && !data ? <Skeleton className="h-40 rounded-2xl" /> : (
          <ul className="grid gap-2">
            {data?.kids.map((k) => (
              <li key={k.user_id} data-testid="homework-kid" className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
                <KidAvatar value={k.avatar} size={36} />
                <span className="min-w-0 flex-1"><b>{k.name}</b><span className="block text-xs text-muted-foreground">{SUB_LABEL[k.status]}</span></span>
                {confirmFor === k.user_id ? (
                  <span className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-destructive/10 p-2 text-sm font-bold">
                    سيُسحب من الطفل ١٥ نجمة، ويأخذها مرة أخرى عند إعادة الواجب
                    <Button variant="destructive" size="sm" onClick={() => { setConfirmFor(null); review(k.user_id, false); }}>تأكيد الإعادة</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmFor(null)}>إلغاء</Button>
                  </span>
                ) : busy === k.user_id ? <Loader2 className="animate-spin" /> : (
                  <>
                    {/* الاعتماد لمن ضغط «أنجزت» فقط */}
                    {k.status === "done" && <Button variant="hero" size="lg2" aria-label={`اعتماد ${k.name}`} onClick={() => review(k.user_id, true)}><Check /> اعتماد</Button>}
                    {(k.status === "done" || k.status === "approved") && <Button variant="secondary" size="lg2" aria-label={`إعادة ${k.name}`} onClick={() => (k.status === "approved" ? setConfirmFor(k.user_id) : review(k.user_id, false))}><Undo2 /> إعادة</Button>}
                  </>
                )}
              </li>
            ))}
            {data?.kids.length === 0 && <p className="text-center text-muted-foreground">لا يوجد أطفال في الفصل</p>}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

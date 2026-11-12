"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { Icon3D } from "@/components/icon3d";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClassRow } from "@/components/teacher/class-picker";

// الفصول (الأدمن والمطوّر): إنشاء فصل بكود دخول، وتعيين معلمته، والدخول على طلابه لإضافتهم
type Staff = { user_id: string; name: string; role: string; class_id: string; class_name: string; active: boolean };
type Form = { class_id?: string; name: string; join_code: string; teacher_id: string };
const ar = (n: number) => n.toLocaleString("ar-EG");

export default function ClassesPage() {
  const me = useRequireRole(["admin", "superadmin"]);
  const { data, loading, reload } = useApi<ClassRow[]>("classes", {}, { enabled: !!me });
  const staff = useApi<Staff[]>("staff", {}, { enabled: !!me });
  const [form, setForm] = useState<Form | null>(null);
  const [delFor, setDelFor] = useState<ClassRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const teachers = (Array.isArray(staff.data) ? staff.data : []).filter((u) => u.active && (u.role === "teacher" || (me?.role === "superadmin" && u.role === "admin") || u.user_id === me?.user_id));

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); invalidate("classes"); invalidate("staff"); await Promise.all([reload(), staff.reload()]); return true; }
    catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(null); }
  };
  const save = async () => {
    if (!form) return;
    const body = { name: form.name, ...(form.join_code.trim() ? { join_code: form.join_code } : {}), teacher_id: form.teacher_id };
    const ok = await run("form", () => form.class_id ? api("updateClass", { class_id: form.class_id, ...body }) : api("createClass", body), form.class_id ? "تم حفظ الفصل" : "تم إنشاء الفصل");
    if (ok) setForm(null);
  };
  const list = Array.isArray(data) ? data : [];
  const moving = form?.teacher_id && teachers.find((t) => t.user_id === form.teacher_id && t.class_id && t.class_id !== form.class_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="books" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">الفصول</h1><p className="text-sm text-muted-foreground">{ar(list.length)} فصل · كل فصل له كود دخول للأطفال ومعلمة</p></div></div>
        <Button variant="hero" size="lg2" onClick={() => setForm({ name: "", join_code: "", teacher_id: "" })}><Plus /> فصل جديد</Button>
      </div>

      {loading && !data ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-[24px]" />)}</div> : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => (
            <BlurFade key={c.class_id} delay={0.03 * Math.min(i, 10)}>
              <li data-testid="class-card" className="flex h-full flex-col gap-3 rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-xl font-extrabold">{c.name}</h2>
                    <p className="text-sm text-muted-foreground">{c.teacher ? `المعلمة: ${c.teacher}` : "بدون معلمة بعد"}</p>
                  </div>
                  <button type="button" onClick={() => { const manual = () => toast.error(`انسخي الكود يدويًا: ${c.join_code}`); if (navigator.clipboard) navigator.clipboard.writeText(c.join_code).then(() => toast.success("تم نسخ كود الفصل"), manual); else manual(); }} aria-label={`نسخ كود ${c.name}`}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-secondary px-3 py-2 font-heading text-sm font-bold tracking-widest" dir="ltr"><Copy className="size-4" /> {c.join_code}</button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-secondary px-3 py-1">{ar(c.kids)} طفل</span>
                  <span className="rounded-full bg-secondary px-3 py-1">{ar(c.published)} محاضرة منشورة</span>
                  {c.teachers.length > 1 && <span className="rounded-full bg-secondary px-3 py-1">{ar(c.teachers.length)} معلمات</span>}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/teacher/students/?class=${encodeURIComponent(c.class_id)}`} className={cn(buttonVariants({ variant: "hero", size: "lg2" }), "flex-1")}><Users /> الطلاب</Link>
                  <Button variant="secondary" size="icon-xl" aria-label={`تعديل ${c.name}`} onClick={() => setForm({ class_id: c.class_id, name: c.name, join_code: c.join_code, teacher_id: c.teacher_id })}><Pencil /></Button>
                  <Button variant="ghost" size="icon-xl" className="text-destructive" aria-label={`حذف ${c.name}`} disabled={c.kids > 0 || c.lectures > 0 || c.teachers.length > 0} onClick={() => setDelFor(c)}><Trash2 /></Button>
                </div>
              </li>
            </BlurFade>
          ))}
          {list.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد فصول بعد</p>}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && !busy && setForm(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader><DialogTitle>{form?.class_id ? "تعديل الفصل" : "فصل جديد"}</DialogTitle><DialogDescription>الأطفال يدخلون بكود الفصل، والمعلمة تضيف طلاب فصلها</DialogDescription></DialogHeader>
          {form && (
            <form id="class-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (form.name.trim() && !busy) save(); }}>
              <div className="grid gap-1.5"><Label htmlFor="cl-name">اسم الفصل</Label><Input id="cl-name" value={form.name} maxLength={40} placeholder="مثال: فصل البراعم" onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl text-base" /></div>
              <div className="grid gap-1.5">
                <Label htmlFor="cl-code">كود الدخول {form.class_id ? "" : "(اتركيه فارغًا ونولّده تلقائيًا)"}</Label>
                <Input id="cl-code" value={form.join_code} dir="ltr" maxLength={12} onChange={(e) => setForm({ ...form, join_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className="h-12 rounded-xl text-center font-heading text-xl tracking-[0.3em]" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cl-teacher">معلمة الفصل</Label>
                <select id="cl-teacher" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="h-12 rounded-xl border bg-background px-3 text-base">
                  <option value="">— بدون معلمة —</option>
                  {teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.name}{t.class_name ? ` (${t.class_name})` : ""}</option>)}
                </select>
                {moving && <p className="text-xs text-amber-700 dark:text-amber-400">ستنتقل {moving.name} من «{moving.class_name}» إلى هذا الفصل</p>}
              </div>
            </form>
          )}
          <DialogFooter><Button type="submit" form="class-form" variant="hero" size="lg2" disabled={!form?.name.trim() || !!busy}>{busy === "form" && <Loader2 className="animate-spin" />} حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف «{delFor?.name}»؟</DialogTitle><DialogDescription>يُحذف الفصل الفاضي فقط (بدون طلاب ولا معلمات ولا محاضرات)</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" disabled={!!busy} onClick={async () => { if (delFor && await run("del", () => api("deleteClass", { class_id: delFor.class_id }), "تم حذف الفصل")) setDelFor(null); }}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

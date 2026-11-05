"use client";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api, session, type Role } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { ROLE_LABEL } from "@/lib/view-as";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon3d";
import { cn, teacherTitle } from "@/lib/utils";

type Staff = { user_id: string; role: Role; name: string; class_id: string; class_name: string; active: boolean; last_login_at: string; telegram: boolean };
type ClassRow = { class_id: string; name: string };
type Form = { user_id?: string; name: string; pin: string; role: Role; class_id: string };

const pinOnly = (v: string) => v.replace(/[^\d٠-٩]/g, "").slice(0, 12);
const fmt = (iso: string) => { if (!iso) return "لم تدخل بعد"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); };

// المعلمات: الأدمن تضيف وتعدّل وتعطّل وتحذف معلمات فصلها، والمطوّر يدير كل المعلمات والأدمن والأدوار
export default function TeamPage() {
  const me = useRequireRole(["admin", "superadmin"]);
  const isSuper = session.user()?.role === "superadmin";
  const { data, loading, reload } = useApi<Staff[]>("staff", {}, { enabled: !!me });
  const classes = useApi<ClassRow[]>("classes", {}, { enabled: !!me && isSuper });
  const [form, setForm] = useState<Form | null>(null);
  const [delFor, setDelFor] = useState<Staff | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const myId = session.user()?.user_id;
  // الأدمن تدير المعلمات فقط؛ الأدمن الأخرى وحسابها نفسه للعرض
  const canManage = (u: Staff) => u.user_id !== myId && (isSuper || u.role === "teacher");

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); invalidate("staff"); invalidate("users"); await reload(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(null); }
  };
  const save = async () => {
    if (!form) return;
    const body = form.user_id
      ? { user_id: form.user_id, name: form.name, pin: form.pin, ...(isSuper ? { role: form.role, class_id: form.class_id } : {}) }
      : { name: form.name, pin: form.pin, role: form.role, class_id: form.class_id };
    if (await run("form", () => api(form.user_id ? "updateTeacher" : "addTeacher", body), form.user_id ? "تم حفظ التعديل" : "تمت إضافة المعلمة")) setForm(null);
  };
  const pinOk = form && (form.user_id ? form.pin === "" || form.pin.length >= 6 : form.pin.length >= 6);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="students" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">المعلمات</h1><p className="text-sm text-muted-foreground">{data?.length ?? 0} حساب{isSuper ? " في كل الفصول" : " في الفصل"}</p></div></div>
        <Button variant="hero" size="lg2" onClick={() => setForm({ name: "", pin: "", role: "teacher", class_id: classes.data?.[0]?.class_id ?? "" })}><Plus /> إضافة معلمة</Button>
      </div>

      {loading && !data ? <div className="grid gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-[24px]" />)}</div> : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data?.map((u) => (
            <li key={u.user_id} data-testid="staff-row" className={cn("flex flex-col gap-3 rounded-[24px] border bg-card p-4 shadow-soft", !u.active && "opacity-60")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-lg font-extrabold">{teacherTitle(u.name, u.role)} <span className="ms-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{ROLE_LABEL[u.role]}</span></p>
                  <p className="truncate text-xs text-muted-foreground">{isSuper && `${u.class_name || "—"} · `}آخر دخول: {fmt(u.last_login_at)}</p>
                </div>
                {u.telegram && <span title="مربوطة بتيليجرام" className="flex items-center gap-1 rounded-full bg-[#229ED9]/15 px-2 py-1 text-xs font-bold text-[#229ED9]"><Send className="size-3.5" /> تيليجرام</span>}
              </div>
              {canManage(u) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="lg2" aria-label={`تعديل ${u.name}`} onClick={() => setForm({ user_id: u.user_id, name: u.name, pin: "", role: u.role, class_id: u.class_id })}><Pencil /> تعديل</Button>
                  <Button variant="ghost" size="icon-xl" className="text-destructive" aria-label={`حذف ${u.name}`} onClick={() => setDelFor(u)}><Trash2 /></Button>
                  <Label className="ms-auto flex items-center gap-2 text-sm font-bold">
                    {u.active ? "مفعّل" : "معطّل"}
                    <Switch checked={u.active} disabled={!!busy} aria-label={`تفعيل ${u.name}`}
                      onCheckedChange={(v) => run(u.user_id, () => api("updateTeacher", { user_id: u.user_id, active: v }), v ? "تم تفعيل الحساب" : "تم إيقاف الحساب")} />
                  </Label>
                </div>
              )}
            </li>
          ))}
          {data?.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد معلمات بعد</p>}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.user_id ? `تعديل ${form.name}` : "إضافة معلمة"}</DialogTitle>
            <DialogDescription>تدخل المعلمة من «دخول المعلمات» باسمها ورمزها (٦ أرقام على الأقل)</DialogDescription>
          </DialogHeader>
          {form && (
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-1.5"><Label htmlFor="tm-name">الاسم كما تكتبه عند الدخول</Label><Input id="tm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={40} placeholder="مثال: د. سارة" className="h-12 rounded-xl text-base" /></div>
              <div className="grid gap-1.5">
                <Label htmlFor="tm-pin">{form.user_id ? "رمز جديد (اتركيه فارغًا للإبقاء على الحالي)" : "الرمز السري"}</Label>
                <Input id="tm-pin" value={form.pin} onChange={(e) => setForm({ ...form, pin: pinOnly(e.target.value) })} inputMode="numeric" dir="ltr" className="h-12 rounded-xl text-center font-heading text-xl tracking-widest" />
              </div>
              {isSuper && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="tm-role">الدور</Label>
                    <select id="tm-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="h-12 rounded-xl border bg-background px-3">
                      <option value="teacher">معلمة</option><option value="admin">معلمة أدمن</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="tm-class">الفصل</Label>
                    <select id="tm-class" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="h-12 rounded-xl border bg-background px-3">
                      {(classes.data ?? []).map((c) => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <DialogFooter><Button type="submit" variant="hero" size="lg2" disabled={!form.name.trim() || !pinOk || !!busy}>{busy === "form" ? <Loader2 className="animate-spin" /> : <KeyRound />} حفظ</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف حساب {delFor?.name}؟</DialogTitle><DialogDescription>لن تتمكن من الدخول بعد الآن، ومحاضراتها تبقى في الفصل. لإيقاف مؤقت استخدمي زر التفعيل بدل الحذف.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" disabled={!!busy} onClick={() => delFor && run(delFor.user_id, () => api("deleteTeacher", { user_id: delFor.user_id }), "تم حذف الحساب").then((ok) => ok && setDelFor(null))}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, KeyRound, Loader2, Search } from "lucide-react";
import { api, type Role } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { ROLE_LABEL, startViewAs } from "@/lib/view-as";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon3d";
import { cn } from "@/lib/utils";
import type { AdminUser } from "../page";

const FILTERS: [string, Role | ""][] = [["الكل", ""], ["الأطفال", "student"], ["المعلمات", "teacher"], ["الأدمن", "admin"], ["المطوّر", "superadmin"]];
const fmt = (iso: string) => { if (!iso) return "لم يدخل بعد"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); };

export default function AdminUsers() {
  const { data, loading, reload } = useApi<AdminUser[]>("users");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<AdminUser | null>(null);
  const [pin, setPin] = useState("");

  const list = useMemo(() => (data ?? []).filter((u) => (!role || u.role === role) && (!q.trim() || u.name.includes(q.trim()) || u.class_name.includes(q.trim()))), [data, q, role]);
  const refresh = () => { invalidate("users"); invalidate("students"); reload(); };
  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try { await fn(); toast.success(ok); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const viewAs = async (u: AdminUser) => { setBusy(u.user_id + "view"); try { await startViewAs(u.user_id); } catch (e) { toast.error((e as Error).message); setBusy(null); } };
  const pinLen = pinFor?.role === "student" ? 4 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="students" size={48} /><div><h1 className="font-heading text-2xl font-extrabold">المستخدمون</h1><p className="text-sm text-muted-foreground">{data?.length ?? 0} حساب في كل الفصول</p></div></div>

      <div className="flex flex-col gap-3 rounded-[24px] border bg-card p-3 shadow-soft sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الفصل" aria-label="بحث" className="h-11 rounded-2xl ps-9" />
        </div>
        <div role="group" aria-label="تصفية حسب الدور" className="flex flex-wrap gap-1">
          {FILTERS.map(([label, r]) => (
            <button key={label} type="button" aria-pressed={role === r} onClick={() => setRole(r)}
              className={cn("h-10 rounded-full px-4 text-sm font-bold transition-colors", role === r ? "bg-hero text-white" : "bg-secondary text-secondary-foreground")}>{label}</button>
          ))}
        </div>
      </div>

      {loading && !data ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-[24px]" />)}</div> : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((u) => {
            const locked = u.role === "superadmin";
            return (
              <li key={u.user_id} data-testid="user-row" className={cn("flex flex-col gap-3 rounded-[24px] border bg-card p-3 shadow-soft", !u.active && "opacity-60")}>
                <div className="flex items-center gap-3">
                  <KidAvatar value={u.avatar || "🌟"} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{u.name} <span className="ms-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ROLE_LABEL[u.role]}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{u.class_name || "كل الفصول"} · آخر دخول: {fmt(u.last_login_at)}</p>
                  </div>
                </div>
                {!locked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="hero" size="lg2" disabled={!u.active || !!busy} onClick={() => viewAs(u)} aria-label={`عرض كـ ${u.name}`}>
                      {busy === u.user_id + "view" ? <Loader2 className="animate-spin" /> : <Eye />} عرض كـ
                    </Button>
                    <Button variant="secondary" size="lg2" disabled={!!busy} onClick={() => { setPin(""); setPinFor(u); }} aria-label={`رمز جديد لـ ${u.name}`}><KeyRound /> رمز جديد</Button>
                    {(u.role === "teacher" || u.role === "admin") && (
                      <Button variant="secondary" size="lg2" disabled={!!busy} aria-label={`تغيير دور ${u.name}`}
                        onClick={() => run(u.user_id, () => api("setRole", { user_id: u.user_id, role: u.role === "admin" ? "teacher" : "admin" }), "تم تغيير الدور")}>
                        {busy === u.user_id ? <Loader2 className="animate-spin" /> : null}{u.role === "admin" ? "اجعلها معلمة" : "اجعلها أدمن"}
                      </Button>
                    )}
                    <Label className="ms-auto flex items-center gap-2 text-sm font-bold">
                      {u.active ? "مفعّل" : "معطّل"}
                      <Switch checked={u.active} disabled={!!busy} aria-label={`تفعيل ${u.name}`}
                        onCheckedChange={(v) => run(u.user_id, () => api("setUserActive", { user_id: u.user_id, active: v }), v ? "تم التفعيل" : "تم التعطيل")} />
                    </Label>
                  </div>
                )}
              </li>
            );
          })}
          {data && list.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد نتائج</p>}
        </ul>
      )}

      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader><DialogTitle>رمز جديد لـ {pinFor?.name}</DialogTitle><DialogDescription>{pinLen === 4 ? "4 أرقام" : "6 أرقام على الأقل"}، ويُفك قفل الحساب لو كان مقفولًا</DialogDescription></DialogHeader>
          <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/[^\d٠-٩]/g, "").slice(0, pinLen === 4 ? 4 : 12))} inputMode="numeric" dir="ltr" aria-label="الرمز الجديد" className="h-12 rounded-2xl text-center text-xl tracking-widest" />
          <DialogFooter>
            <Button variant="hero" size="lg2" disabled={pin.length < pinLen || !!busy}
              onClick={() => pinFor && run(pinFor.user_id, () => api("setUserPin", { user_id: pinFor.user_id, pin }), "تم تغيير الرمز").then(() => setPinFor(null))}>
              {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} حفظ الرمز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

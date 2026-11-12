"use client";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api, type Kid } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { AVATARS, KidAvatar } from "@/components/kid/kid-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon3d";
import { cn } from "@/lib/utils";
import { ClassSelect, useClassScope } from "@/components/teacher/class-picker";

const pin4 = (v: string) => v.replace(/[^\d٠-٩]/g, "").slice(0, 4);

export default function StudentsPage() {
  // الأدمن والمطوّر: يختارون الفصل، والمعلمة على فصلها
  const scope = useClassScope();
  const cp = scope.class_id ? { class_id: scope.class_id } : {};
  const { data, loading, reload } = useApi<(Kid & { created_at?: string })[]>("students", cp, { enabled: scope.ready });
  const [add, setAdd] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState<string>(`3d:${AVATARS[0]}`);
  // البنت تخاطبها المنصة بصيغة المؤنث
  const [gender, setGender] = useState<"m" | "f">("m");
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now()); // «جديد» = أُضيف خلال ٣ أيام
  const [pinFor, setPinFor] = useState<Kid | null>(null);
  const [delFor, setDelFor] = useState<Kid | null>(null);
  const [editFor, setEditFor] = useState<Kid | null>(null);

  const refresh = () => { invalidate("students"); invalidate("dashboard"); reload(); };
  const run = async (fn: () => Promise<unknown>, ok: string, done: () => void) => {
    setBusy(true);
    try { await fn(); toast.success(ok); done(); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="cap" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">الطلاب</h1><p className="text-sm text-muted-foreground">{data?.length ?? 0} طفل في {scope.current ? `«${scope.current.name}»` : "الفصل"}</p></div></div>
        <ClassSelect scope={scope} />
        <Button variant="hero" size="lg2" onClick={() => { setName(""); setPin(""); setGender("m"); setAdd(true); }}><Plus /> إضافة طفل</Button>
      </div>

      {loading && !data ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-[24px]" />)}</div> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((k, i) => (
            <BlurFade key={k.user_id} delay={0.03 * Math.min(i, 10)}>
              <li className="flex items-center gap-3 rounded-[24px] border bg-card p-3 shadow-soft">
                <KidAvatar value={k.avatar} size={44} />
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate font-bold">{k.name}{k.created_at && openedAt - new Date(k.created_at).getTime() < 3 * 864e5 && <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[10px] text-[#7A4D00] dark:text-gold">جديد</span>}</p><p className="text-sm text-muted-foreground">{k.gender === "f" ? "بنت" : "ولد"} · {k.points ?? 0} نجمة</p></div>
                <Button variant="secondary" size="icon-xl" aria-label={`تعديل ${k.name}`} onClick={() => { setName(k.name); setAvatar(k.avatar || `3d:${AVATARS[0]}`); setGender(k.gender === "f" ? "f" : "m"); setEditFor(k); }}><Pencil /></Button>
                <Button variant="secondary" size="icon-xl" aria-label={`تغيير رمز ${k.name}`} onClick={() => { setPin(""); setPinFor(k); }}><KeyRound /></Button>
                <Button variant="ghost" size="icon-xl" aria-label={`حذف ${k.name}`} className="text-destructive" onClick={() => setDelFor(k)}><Trash2 /></Button>
              </li>
            </BlurFade>
          ))}
          {data?.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لم تُضيفي أي طفل بعد</p>}
        </ul>
      )}

      <Dialog open={add} onOpenChange={setAdd}>
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader><DialogTitle>إضافة طفل</DialogTitle><DialogDescription>الطفل يدخل بكود الفصل ثم يختار شكله ويكتب رمزه</DialogDescription></DialogHeader>
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); run(() => api("addStudent", { name, pin, avatar, gender, ...cp }), "تمت إضافة الطفل", () => setAdd(false)); }}>
            <Label htmlFor="sn">الاسم</Label>
            <Input id="sn" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="h-12 rounded-xl text-base" />
            <Label htmlFor="sp">الرمز السري (٤ أرقام)</Label>
            <Input id="sp" value={pin} onChange={(e) => setPin(pin4(e.target.value))} inputMode="numeric" required className="h-12 rounded-xl text-center font-heading text-2xl tracking-[0.5em]" />
            <Label>ولد أم بنت؟</Label>
            <div role="radiogroup" aria-label="ولد أم بنت" className="grid grid-cols-2 gap-2">
              {([["m", "ولد 👦"], ["f", "بنت 👧"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={gender === v} onClick={() => setGender(v)}
                  className={cn("h-12 rounded-2xl bg-secondary/60 font-bold transition", gender === v && "bg-primary/20 ring-2 ring-primary")}>{l}</button>
              ))}
            </div>
            <Label>الشكل</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button key={a} type="button" aria-label={a} aria-pressed={avatar === `3d:${a}`} onClick={() => setAvatar(`3d:${a}`)}
                  className={cn("grid aspect-square place-items-center rounded-2xl bg-secondary/60 transition", avatar === `3d:${a}` && "bg-primary/20 ring-2 ring-primary")}>
                  <KidAvatar value={`3d:${a}`} size={34} />
                </button>
              ))}
            </div>
            <DialogFooter><Button type="submit" variant="hero" size="lg2" disabled={busy || !name.trim() || pin.length < 4}>{busy ? <Loader2 className="animate-spin" /> : "حفظ"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader><DialogTitle>تعديل {editFor?.name}</DialogTitle></DialogHeader>
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (editFor) run(() => api("updateStudent", { user_id: editFor.user_id, name, avatar, gender, ...cp }), "تم حفظ التعديل", () => setEditFor(null)); }}>
            <Label htmlFor="en">الاسم</Label>
            <Input id="en" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="h-12 rounded-xl text-base" />
            <Label>ولد أم بنت؟</Label>
            <div role="radiogroup" aria-label="ولد أم بنت" className="grid grid-cols-2 gap-2">
              {([["m", "ولد 👦"], ["f", "بنت 👧"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={gender === v} onClick={() => setGender(v)}
                  className={cn("h-12 rounded-2xl bg-secondary/60 font-bold transition", gender === v && "bg-primary/20 ring-2 ring-primary")}>{l}</button>
              ))}
            </div>
            <Label>الشكل</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button key={a} type="button" aria-label={a} aria-pressed={avatar === `3d:${a}`} onClick={() => setAvatar(`3d:${a}`)}
                  className={cn("grid aspect-square place-items-center rounded-2xl bg-secondary/60 transition", avatar === `3d:${a}` && "bg-primary/20 ring-2 ring-primary")}>
                  <KidAvatar value={`3d:${a}`} size={34} />
                </button>
              ))}
            </div>
            <DialogFooter><Button type="submit" variant="hero" size="lg2" disabled={busy || !name.trim()}>{busy ? <Loader2 className="animate-spin" /> : "حفظ"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>رمز جديد لـ {pinFor?.name}</DialogTitle></DialogHeader>
          <Input aria-label="الرمز الجديد" value={pin} onChange={(e) => setPin(pin4(e.target.value))} inputMode="numeric" className="h-12 rounded-xl text-center font-heading text-2xl tracking-[0.5em]" />
          <DialogFooter><Button variant="hero" size="lg2" disabled={busy || pin.length < 4} onClick={() => pinFor && run(() => api("setStudentPin", { user_id: pinFor.user_id, pin, ...cp }), "تم تغيير الرمز", () => setPinFor(null))}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف {delFor?.name}؟</DialogTitle><DialogDescription>لن يظهر الطفل في الفصل بعد الآن، ويمكن إعادته من الشيت</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" disabled={busy} onClick={() => delFor && run(() => api("removeStudent", { user_id: delFor.user_id, ...cp }), "تم الحذف", () => setDelFor(null))}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

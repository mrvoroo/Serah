"use client";
import { useEffect, useState } from "react";
import { BellRing, Loader2, Share } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { g, isGirl } from "@/lib/kid-text";
import { loadPrefs, savePrefs, type NotifyPrefs } from "@/lib/prayer";
import { disablePush, enablePush, pushState, syncPush, type PushState } from "@/lib/push";

const ITEMS: { id: keyof NotifyPrefs; label: string; hint: string }[] = [
  { id: "prayer", label: "مواعيد الصلاة", hint: "تنبيه عند دخول وقت كل صلاة" },
  { id: "dhikr", label: "اذكر الله", hint: "٣ أذكار في أوقات مختلفة من اليوم" },
  { id: "duha", label: "صلاة الضحى", hint: "تذكير كل يوم في وقت الضحى" },
  { id: "friday", label: "يوم الجمعة", hint: "سورة الكهف والصلاة على النبي ﷺ وساعة الإجابة" },
  { id: "tasks", label: "الاختبارات والواجبات", hint: "لما المعلمة تنشر اختبارًا أو واجبًا جديدًا" },
];

// بطاقة إشعارات الجوال: التفعيل وأنواع التذكير
export function NotifyCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [prefs, setPrefs] = useState<NotifyPrefs>(() => (typeof window === "undefined" ? loadPrefsSafe() : loadPrefs()));
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setState); }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const s = await enablePush(isGirl());
      setState(s);
      if (s === "on") toast.success("تم تفعيل الإشعارات 🔔");
      else if (s === "denied") toast.error("الإشعارات مرفوضة من إعدادات الجهاز");
    } catch (e) { toast.error((e as Error).message || "تعذّر تفعيل الإشعارات"); } finally { setBusy(false); }
  };
  const turnOff = async () => { setBusy(true); try { await disablePush(); setState("off"); toast.success("تم إيقاف الإشعارات"); } finally { setBusy(false); } };
  const change = (id: keyof NotifyPrefs, v: boolean) => {
    const next = { ...prefs, [id]: v }; setPrefs(next); savePrefs(next); syncPush(isGirl(), true);
  };

  return (
    <section aria-labelledby="notify-title" className="rounded-[28px] border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-gold/20"><BellRing className="size-6 text-gold-foreground" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="notify-title" className="font-heading text-lg font-extrabold">إشعارات الجوال</h2>
          <p className="text-sm text-muted-foreground">تذكير بالصلاة وذكر الله والمهام الجديدة</p>
        </div>
        {state === "on" && <button type="button" onClick={turnOff} disabled={busy} className="rounded-xl px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10">إيقاف</button>}
      </div>

      {state === "ios-install" && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-secondary/60 p-3 text-sm leading-7">
          <Share className="mt-1 size-5 shrink-0" />
          <span>على الآيفون: {g("اضغط", "اضغطي")} زر المشاركة في سفاري ثم «إضافة إلى الشاشة الرئيسية»، و{g("افتح", "افتحي")} المنصة من أيقونتها، وبعدها {g("فعّل", "فعّلي")} الإشعارات من هنا.</span>
        </p>
      )}
      {state === "unsupported" && <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm">هذا المتصفح لا يدعم الإشعارات. جرّب كروم أو سفاري الحديث.</p>}
      {state === "denied" && <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm leading-7">الإشعارات مقفولة من إعدادات الجهاز. افتح إعدادات المتصفح ← الإشعارات، واسمح لموقع المنتهى، ثم ارجع هنا.</p>}
      {state === "off" && (
        <button type="button" onClick={turnOn} disabled={busy}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-hero font-bold text-white shadow-soft disabled:opacity-60">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <BellRing className="size-5" />} {g("فعّل", "فعّلي")} الإشعارات
        </button>
      )}

      {(state === "on" || state === "off") && (
        <ul className="mt-4 grid gap-2">
          {ITEMS.map((it) => (
            <li key={it.id}>
              <Label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-secondary/40 p-3">
                <span className="min-w-0 flex-1"><span className="block font-bold">{it.label}</span><span className="block text-xs font-normal text-muted-foreground">{it.hint}</span></span>
                <Switch checked={prefs[it.id]} onCheckedChange={(v) => change(it.id, v)} aria-label={it.label} />
              </Label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function loadPrefsSafe(): NotifyPrefs { return { prayer: true, dhikr: true, duha: true, friday: true, tasks: true }; }

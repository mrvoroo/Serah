"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { api, session, type User } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon3D } from "@/components/icon3d";

export default function SettingsPage() {
  const cc = useApi<{ code: string }>("classCode");
  const [code, setCode] = useState("");
  const [oldPin, setOld] = useState("");
  const [newPin, setNew] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [tgUrl, setTgUrl] = useState("");
  useEffect(() => { if (cc.data) setCode(cc.data.code ?? ""); }, [cc.data]);

  const saveCode = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy("code");
    try { const r = await api<{ code: string }>("setClassCode", { code }); setCode(r.code); toast.success("تم حفظ كود الفصل"); } catch (e2) { toast.error((e2 as Error).message); } finally { setBusy(null); }
  };
  // رابط لمرة واحدة (15 دقيقة): يفتح البوت والمعلمة تضغط Start فقط
  const linkTelegram = async () => {
    setBusy("tg");
    try { const r = await api<{ url: string }>("tgLinkToken"); setTgUrl(r.url); } catch (e2) { toast.error((e2 as Error).message); } finally { setBusy(null); }
  };
  const savePin = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy("pin");
    try { const r = await api<{ token: string; user: User }>("changeMyPin", { oldPin, newPin }); if (r?.token) session.save(r); toast.success("تم تغيير رمزك"); setOld(""); setNew(""); } catch (e2) { toast.error((e2 as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="gear" size={48} float /><h1 className="font-heading text-2xl font-extrabold">الإعدادات</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveCode} className="flex flex-col gap-3 rounded-[24px] border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2"><Icon3D name="key" size={32} float /><h2 className="font-heading text-lg font-extrabold">كود الفصل</h2></div>
          <p className="text-sm text-muted-foreground">الأطفال يكتبونه أول مرة للدخول</p>
          <div className="flex gap-2">
            <Input aria-label="كود الفصل" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 rounded-xl text-center font-heading text-2xl tracking-[0.3em]" dir="ltr" />
            <Button type="button" variant="secondary" size="icon-xl" aria-label="نسخ" onClick={() => { navigator.clipboard?.writeText(code); toast.success("تم النسخ"); }}><Copy /></Button>
          </div>
          <Button type="submit" variant="hero" size="lg2" disabled={busy === "code" || !code.trim()}>{busy === "code" ? <Loader2 className="animate-spin" /> : "حفظ الكود"}</Button>
        </form>
        <form onSubmit={savePin} className="flex flex-col gap-3 rounded-[24px] border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2"><Icon3D name="key" size={32} float /><h2 className="font-heading text-lg font-extrabold">رمزي السري</h2></div>
          <Label htmlFor="op">الرمز الحالي</Label>
          <Input id="op" type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" className="h-12 rounded-xl" required />
          <Label htmlFor="np">الرمز الجديد (٦ أرقام على الأقل)</Label>
          <Input id="np" type="password" inputMode="numeric" value={newPin} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" className="h-12 rounded-xl" required minLength={6} pattern="[0-9٠-٩]{6,}" title="٦ أرقام على الأقل" />
          <Button type="submit" variant="hero" size="lg2" disabled={busy === "pin"}>{busy === "pin" ? <Loader2 className="animate-spin" /> : "تغيير الرمز"}</Button>
        </form>
        <section className="flex flex-col gap-3 rounded-[24px] border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-2"><Icon3D name="speech" size={32} float /><h2 className="font-heading text-lg font-extrabold">بوت تيليجرام</h2></div>
          <p className="text-sm leading-7 text-muted-foreground">اربطي حسابكِ بالبوت لترفعي المحاضرات من تيليجرام بالأزرار: ابعتي التسجيل، اختاري النبي، وابعتي الصور.</p>
          {tgUrl ? (
            <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-5 font-bold text-white">
              <ExternalLink className="size-5" /> افتحي تيليجرام واضغطي Start
            </a>
          ) : (
            <Button variant="hero" size="lg2" disabled={busy === "tg"} onClick={linkTelegram}>{busy === "tg" ? <Loader2 className="animate-spin" /> : <Send />} ربط تيليجرام</Button>
          )}
          {tgUrl && <p className="text-xs text-muted-foreground">الرابط صالح لمدة ١٥ دقيقة ولمرة واحدة.</p>}
        </section>
      </div>
    </div>
  );
}

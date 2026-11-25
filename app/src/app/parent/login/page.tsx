"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogIn, UserPlus } from "lucide-react";
import { api, clearLogoutReason, logoutReason, session, type User } from "@/lib/api";
import type { Mood } from "@/components/zaid";
import { Zaid } from "@/components/zaid";
import { Father, Mother } from "@/components/family";
import { Ambient } from "@/components/ambient";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlurFade } from "@/components/ui/blur-fade";
import { useHydrated } from "@/hooks/use-hydrated";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

// دخول أولياء الأمور: الأب والأم وزيد معًا، ومشاعرهم تتغير مع الكتابة والتحقق (مثل شاشات المعلمات والأطفال).
// حساب جديد بكود من معلمة الفصل (لمرة واحدة)، والدخول بعدها بالاسم والرمز
type Tab = "login" | "new";

export default function ParentLogin() {
  const router = useRouter();
  const ready = useHydrated();
  const reason = useSyncExternalStore(() => () => {}, logoutReason, () => "");
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [gender, setGender] = useState<"m" | "f">("f");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mood, setMood] = useState<Mood>("helping");

  const done = (d: { token: string; user: User }) => { session.save(d); clearLogoutReason(); setMood("happy"); router.replace("/parent/"); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(""); setMood("thinking");
    try {
      if (tab === "login") {
        const d = await api<{ token: string; user: User }>("login", { name: name.trim(), pin });
        if (d.user.role !== "parent") {
          // معلمة دخلت من هنا: نوديها لوحتها
          if (d.user.role === "student") throw new Error("هذه الصفحة لأولياء الأمور");
          session.save(d); clearLogoutReason(); router.replace(d.user.role === "superadmin" ? "/admin/" : "/teacher/"); return;
        }
        done(d);
      } else {
        done(await api<{ token: string; user: User }>("parentRegister", { code, name: name.trim(), pin, gender }));
      }
    } catch (e2) { setErr((e2 as Error).message); setMood("surprised"); }
    finally { setBusy(false); }
  };
  const fresh = tab === "new";

  return (
    <div className="relative flex min-h-svh flex-col">
      <Ambient />
      <div className="flex items-center justify-between p-4">
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>دخول الأطفال</Link>
        <ThemeToggle />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 pb-10">
        <BlurFade>
          <div data-testid="family" className="flex items-end justify-center -space-x-4 rtl:space-x-reverse">
            <Father mood={mood} size={112} />
            <Zaid mood={mood === "helping" ? "happy" : mood} size={92} />
            <Mother mood={mood} size={112} />
          </div>
        </BlurFade>
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="المُنْتَهَى — الرئيسية"><BrandLogo size={56} glow className="mb-2" /></Link>
          <h1 className="font-heading text-3xl font-extrabold">أهلًا بأولياء الأمور</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">تابعوا رحلة أطفالكم في «<span className="font-ruqaa text-[1.25em] text-foreground">المنتهى</span>»، ولكم صلاتكم وأذكاركم وقرآنكم</p>
        </div>
        <div role="tablist" aria-label="نوع الدخول" className="flex w-full gap-1 rounded-2xl bg-secondary p-1">
          {([["login", "دخول", LogIn], ["new", "حساب جديد بكود", UserPlus]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setErr(""); setMood("helping"); }}
              className={cn("flex h-11 flex-1 items-center justify-center gap-1 rounded-xl font-bold transition", tab === id ? "bg-hero text-white shadow-soft" : "text-secondary-foreground")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-[28px] border bg-card/90 p-5 shadow-soft backdrop-blur-md">
          {fresh && (
            <>
              <Label htmlFor="pc">كود ولي الأمر (من معلمة الفصل)</Label>
              <Input id="pc" disabled={!ready} value={code} dir="ltr" maxLength={11} autoComplete="one-time-code" placeholder="ABCD-EFGH"
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setMood("thinking"); }} className="h-12 rounded-xl text-center font-heading text-xl tracking-[0.3em]" required />
              <div role="radiogroup" aria-label="أنا" className="grid grid-cols-2 gap-2">
                {([["f", "أنا الأم"], ["m", "أنا الأب"]] as const).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={gender === v} onClick={() => setGender(v)}
                    className={cn("h-11 rounded-xl border font-bold transition", gender === v ? "border-primary bg-primary/10 text-primary" : "bg-background")}>{l}</button>
                ))}
              </div>
            </>
          )}
          <Label htmlFor="pn">{fresh ? "اسم الدخول (مميّز، مثال: أم زيد محمد)" : "الاسم"}</Label>
          <Input id="pn" disabled={!ready} value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setMood("happy"); }} onFocus={() => !busy && setMood("happy")} autoComplete="username" className="h-12 rounded-xl text-base" required />
          <Label htmlFor="pp">الرمز السري {fresh && "(٦ أرقام من اختيارك)"}</Label>
          <Input id="pp" disabled={!ready} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value); setMood("thinking"); }} onFocus={() => !busy && setMood("thinking")} autoComplete={fresh ? "new-password" : "current-password"} className="h-12 rounded-xl text-base" required />
          <Button type="submit" variant="hero" size="xl" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : fresh ? <>إنشاء الحساب <KeyRound /></> : <>دخول <LogIn /></>}</Button>
          <p role="alert" className="min-h-5 text-center text-sm font-bold text-destructive">{err || reason}</p>
        </form>
        <p className="text-center text-xs leading-6 text-muted-foreground">الكود يُطلب من معلمة الفصل، ويصلح لمرة واحدة. لربط طفل آخر اطلبوا كوده بعد الدخول.</p>
        <Link href="/privacy/" className="text-sm font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">الخصوصية</Link>
      </main>
    </div>
  );
}

"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { api, clearLogoutReason, logoutReason, session, type User } from "@/lib/api";
import type { Mood } from "@/components/zaid";
import { Murshida } from "@/components/murshida";
import { Ambient } from "@/components/ambient";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlurFade } from "@/components/ui/blur-fade";
import { useHydrated } from "@/hooks/use-hydrated";
import { BrandLogo } from "@/components/brand-logo";

export default function TeacherLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // لو خرجت بسبب إيقاف الحساب أو انتهاء الجلسة نوضح السبب
  const reason = useSyncExternalStore(() => () => {}, logoutReason, () => "");
  const ready = useHydrated();
  // المرشدة ترحّب، وتُسرّ وهي تكتب اسمها، وتتأمل مع الرمز وأثناء التحقق، وتندهش بهدوء من أي خطأ، وتُسرّ عند الدخول
  const [mood, setMood] = useState<Mood>("helping");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(""); setMood("thinking");
    try {
      const d = await api<{ token: string; user: User }>("login", { name: name.trim(), pin });
      if (d.user.role === "student") throw new Error("هذه الصفحة للمعلمات فقط");
      session.save(d); clearLogoutReason(); setMood("happy");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next === "upload" ? "/teacher/upload/" : d.user.role === "superadmin" ? "/admin/" : "/teacher/");
    } catch (e2) {
      const msg = (e2 as Error).message;
      setErr(msg); setMood("surprised");
    }
    finally { setBusy(false); }
  };
  return (
    <div className="relative flex min-h-svh flex-col">
      <Ambient />
      <div className="flex items-center justify-between p-4">
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>دخول الأطفال</Link>
        <ThemeToggle />
      </div>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 pb-10">
        <BlurFade><Murshida mood={mood} size={140} /></BlurFade>
        <div className="flex flex-col items-center text-center">
          <BrandLogo size={64} glow className="mb-3" />
          <h1 className="font-heading text-3xl font-extrabold">أهلًا وسهلًا بكِ</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">يسعدنا تشريفكِ منصةَ «المُنْتَهَى»، تفضّلي بتسجيل الدخول</p>
        </div>
        <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-[28px] border bg-card/90 p-5 shadow-soft backdrop-blur-md">
          <Label htmlFor="tn">الاسم</Label>
          <Input id="tn" disabled={!ready} value={name} onChange={(e) => { setName(e.target.value); setMood("happy"); }} onFocus={() => !busy && setMood("happy")} autoComplete="username" className="h-12 rounded-xl text-base" required />
          <Label htmlFor="tp">الرمز السري</Label>
          <Input id="tp" disabled={!ready} type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setMood("thinking"); }} onFocus={() => !busy && setMood("thinking")} autoComplete="current-password" className="h-12 rounded-xl text-base" required />
          <Button type="submit" variant="hero" size="xl" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <>دخول <LogIn /></>}</Button>
          <p role="alert" className="min-h-5 text-center text-sm font-bold text-destructive">{err || reason}</p>
        </form>
      </main>
    </div>
  );
}

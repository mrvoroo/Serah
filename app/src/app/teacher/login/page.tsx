"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { api, session, type User } from "@/lib/api";
import { Zaid } from "@/components/zaid";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlurFade } from "@/components/ui/blur-fade";

export default function TeacherLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const d = await api<{ token: string; user: User }>("login", { name: name.trim(), pin });
      if (d.user.role === "student") throw new Error("هذه الصفحة للمعلمات فقط");
      session.save(d);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next === "upload" ? "/teacher/upload/" : d.user.role === "superadmin" ? "/admin/" : "/teacher/");
    } catch (e2) { setErr((e2 as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex items-center justify-between p-4">
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>دخول الأطفال</Link>
        <ThemeToggle />
      </div>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 pb-10">
        <BlurFade><Zaid mood="helping" size={140} /></BlurFade>
        <h1 className="text-center font-heading text-3xl font-extrabold">دخول المعلمة</h1>
        <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-[28px] border bg-card p-5 shadow-soft">
          <Label htmlFor="tn">الاسم</Label>
          <Input id="tn" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" className="h-12 rounded-xl text-base" required />
          <Label htmlFor="tp">الرمز السري</Label>
          <Input id="tp" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" className="h-12 rounded-xl text-base" required />
          <Button type="submit" variant="hero" size="xl" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <>دخول <LogIn /></>}</Button>
          <p role="alert" className="min-h-5 text-center text-sm font-bold text-destructive">{err}</p>
        </form>
      </main>
    </div>
  );
}

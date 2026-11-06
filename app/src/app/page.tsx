"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { api, session, type Kid, type User } from "@/lib/api";
import { Zaid, type Mood } from "@/components/zaid";
import { ThemeToggle } from "@/components/theme-toggle";
import { Ambient } from "@/components/ambient";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { homeOf } from "@/components/kid/kid-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { BrandLogo } from "@/components/brand-logo";

type ClassInfo = { class_id: string; name: string; kids: Kid[] };

export default function Welcome() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "kid" | "pin">("code");
  const [code, setCode] = useState("");
  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [kid, setKid] = useState<Kid | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mood, setMood] = useState<Mood>("helping");
  const ready = useHydrated();
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = session.user();
    if (u && session.token()) router.replace(homeOf(u.role));
  }, [router]);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setErr("");
    try { const c = await api<ClassInfo>("classInfo", { code }); setCls(c); setStep("kid"); setMood("happy"); }
    catch (e2) { setErr((e2 as Error).message); setMood("surprised"); }
    finally { setBusy(false); }
  };

  const login = async (value: string) => {
    if (!kid || value.length < 4) return;
    setBusy(true); setErr("");
    try {
      const d = await api<{ token: string; user: User }>("login", { user_id: kid.user_id, pin: value });
      session.save(d); setMood("happy"); router.replace("/kid/");
    } catch (e2) { setErr((e2 as Error).message); setPin(""); setMood("surprised");
      // الخانة تتعطل أثناء التحقق فتفقد التركيز؛ نرجعه حتى يكتب الطفل مرة ثانية مباشرة
      setTimeout(() => pinRef.current?.focus(), 50); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative flex min-h-svh flex-col">
      <Ambient />
      <div className="flex items-center justify-between p-4">
        <Link href="/teacher/login/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>دخول المعلمة</Link>
        <ThemeToggle />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 pb-10">
        <Zaid mood={mood} size={170} />
        <div className="flex flex-col items-center gap-2">
          <BrandLogo size={88} glow />
          <h1 className="text-center font-ruqaa text-6xl leading-tight" aria-label="المُنْتَهَى">المنتهى</h1>
          <p className="font-brand-en text-sm font-bold tracking-[0.35em] text-gold" aria-hidden>MUNTAHA</p>
          <p className="text-sm font-bold text-muted-foreground">رحلة مع الأنبياء والقرآن الكريم</p>
        </div>
        <div className="w-full rounded-[32px] border bg-card/90 p-5 shadow-soft backdrop-blur-md">
          <AnimatePresence mode="wait">
            {step === "code" && (
              <motion.form key="code" onSubmit={submitCode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col gap-3">
                <Label htmlFor="code" className="justify-center font-heading text-xl font-extrabold">اكتب كود الفصل</Label>
                <Input id="code" inputMode="numeric" autoComplete="off" disabled={!ready} value={code} onChange={(e) => { setCode(e.target.value); setMood("happy"); }} placeholder="مثلًا 7391" className={cn("h-16 rounded-2xl text-center font-heading text-3xl placeholder:text-xl placeholder:tracking-normal", code && "tracking-[0.4em]")} />
                <Button type="submit" variant="gold" size="xl" disabled={busy || !code.trim()}>
                  {busy ? <Loader2 className="animate-spin" /> : <>يلا نبدأ الرحلة <ArrowLeft /></>}
                </Button>
              </motion.form>
            )}
            {step === "kid" && cls && (
              <motion.div key="kid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col gap-3">
                <p className="text-center font-heading text-xl font-extrabold">مين أنت؟</p>
                {cls.kids.length === 0 ? (
                  <p className="text-center text-muted-foreground">لم تُضف المعلمة أي طفل بعد</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {cls.kids.map((k, i) => (
                      <motion.button key={k.user_id} type="button" onClick={() => { setKid(k); setStep("pin"); setMood("thinking"); }}
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.92 }}
                        className="flex flex-col items-center gap-1 rounded-3xl bg-secondary p-3 font-bold">
                        <KidAvatar value={k.avatar} size={52} />
                        <span className="text-sm">{k.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="lg2" onClick={() => { setStep("code"); setMood("helping"); }}><ArrowRight /> رجوع</Button>
              </motion.div>
            )}
            {step === "pin" && kid && (
              <motion.div key="pin" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col items-center gap-3">
                <KidAvatar value={kid.avatar} size={64} />
                <p className="font-heading text-xl font-extrabold">أهلًا يا {kid.name}! اكتب رمزك</p>
                <div dir="ltr">
                  <InputOTP ref={pinRef} maxLength={4} value={pin} onChange={(v) => { setPin(v); setMood("thinking"); if (v.length === 4) login(v); }} inputMode="numeric" autoFocus disabled={busy}>
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} className="size-16 rounded-2xl border text-3xl font-heading" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {busy && <Loader2 className="animate-spin text-primary" aria-label="جارٍ الدخول" />}
                <Button variant="ghost" size="lg2" onClick={() => { setStep("kid"); setPin(""); setErr(""); }}><ArrowRight /> اختيار طفل آخر</Button>
              </motion.div>
            )}
          </AnimatePresence>
          <p role="alert" className={cn("mt-2 min-h-6 text-center text-sm font-bold text-destructive", !err && "invisible")}>{err || "."}</p>
        </div>
        {busy && step === "code" && <Skeleton className="h-2 w-24 rounded-full" />}
        <Link href="/about/" className="text-sm font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">من نحن ✨</Link>
      </main>
    </div>
  );
}

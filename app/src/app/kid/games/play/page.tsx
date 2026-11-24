"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { ArrowRight, Loader2, RotateCcw, Star } from "lucide-react";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { Icon3D } from "@/components/icon3d";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RT } from "@/components/religious-text";
import { MatchBoard, OrderBoard, WhoBoard } from "@/components/games/boards";
import { isGirl, g } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";
import type { ProphetRow } from "@/lib/prophets";
import { LEVEL_NEED, MIN_SEC, PASS, akhlaqPairs, akhlaqWhy, asmaPairs, symbolRef, gameMeta, matchPairs, orderSet, visibleProphets, whoRounds, type GameId } from "@/lib/games";
import { cn } from "@/lib/utils";

// شاشة اللعب: نبدأ المستوى عند الخادم (يتحقق أنه مفتوح)، ونرسل النتيجة بعد الحد الأدنى للوقت
const ar = (n: number) => n.toLocaleString("ar-EG");
type Phase = "starting" | "playing" | "sending" | "result" | "error";

function Play() {
  const sp = useSearchParams();
  const game = (sp.get("g") ?? "") as GameId, level = Math.min(3, Math.max(1, Number(sp.get("l")) || 1));
  const meta = gameMeta(game);
  const animate = useMotionAllowed();
  const journey = useApi<ProphetRow[]>("journey", {}, { enabled: !!meta?.prophets });
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ score: number; passed: boolean; stars: number } | null>(null);
  const started = useRef(0);
  const vps = useMemo(() => visibleProphets(Array.isArray(journey.data) ? journey.data : undefined), [journey.data]);
  const ready = !meta?.prophets || !!journey.data || !!journey.error;

  useEffect(() => {
    if (!meta || !ready) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("starting"); setRes(null);
    api("gameStart", { game, level }).then(() => { if (alive) { started.current = Date.now(); setPhase("playing"); } })
      .catch((e) => { if (alive) { setErr((e as Error).message); setPhase("error"); } });
    return () => { alive = false; };
  }, [game, level, round, meta, ready]);

  // محتوى المستوى يتولد مرة لكل جولة
  const board = useMemo(() => {
    if (!meta || !ready) return null;
    const girl = isGirl();
    if (game === "asma") return { kind: "match" as const, pairs: asmaPairs(level), l: "الاسم", r: "معناه" };
    if (game === "akhlaq") return { kind: "match" as const, pairs: akhlaqPairs(level, girl), l: "الاسم", r: "خُلُقي" };
    if (game === "match") return { kind: "match" as const, pairs: matchPairs(level, vps), l: "النبي", r: "من قصّته في القرآن" };
    if (game === "order") return { kind: "order" as const, items: orderSet(level, vps) };
    return { kind: "who" as const, rounds: whoRounds(level, vps) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, level, round, ready, vps]);

  const finish = (score: number) => {
    setPhase("sending");
    const wait = Math.max(0, MIN_SEC[level - 1] * 1000 - (Date.now() - started.current) + 400);
    setTimeout(async () => {
      try {
        const r = await api<{ passed: boolean; stars: number }>("gameDone", { game, level, score });
        setRes({ score, ...r }); setPhase("result"); invalidate("games"); invalidate("me");
        if (r.passed && animate) confetti({ particleCount: 110, spread: 80, origin: { y: 0.65 }, colors: ["#FFD25A", "#FFB020", "#10b981", "#ffffff"], disableForReducedMotion: true });
      } catch (e) { setErr((e as Error).message); setPhase("error"); }
    }, wait);
  };

  if (!meta) return <p className="rounded-[28px] border bg-card p-6 text-center">اللعبة غير موجودة</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/kid/games/" className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-bold"><ArrowRight className="size-4" /> الألعاب</Link>
        <span className="rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-[#7A4D00] dark:text-gold">المستوى {ar(level)}</span>
      </div>
      <header className="flex items-center gap-3">
        <Icon3D name={meta.icon} size={48} float />
        <div><h1 className="font-heading text-2xl font-extrabold">{meta.title}</h1><p className="text-sm text-muted-foreground">{meta.desc}</p></div>
      </header>

      {phase === "error" ? (
        <div className="flex flex-col items-center gap-3 rounded-[28px] border bg-card p-6 text-center">
          <Icon3D name="thinking" size={60} />
          <p className="font-bold">{err}</p>
          <Link href="/kid/games/" className={buttonVariants({ variant: "hero", size: "lg2" })}>رجوع للألعاب</Link>
        </div>
      ) : phase === "starting" || !board ? <Skeleton className="h-72 rounded-[28px]" /> : phase === "result" && res ? (
        <div data-testid="game-result" className={cn("flex flex-col items-center gap-3 rounded-[28px] p-6 text-center shadow-soft", res.passed ? "bg-emerald-500/10" : "bg-card")}>
          <Icon3D name={res.passed ? "trophy" : "sparkles"} size={72} float />
          <p className="font-heading text-2xl font-extrabold">{res.passed ? `${g("أحسنت", "أحسنتِ")}! ${ar(res.score)}٪` : `${ar(res.score)}٪ — ${g("حاول", "حاولي")} تاني`}</p>
          {res.stars > 0 && <p className="flex items-center gap-1 text-lg font-bold text-amber-600 dark:text-gold"><Star className="size-5 fill-current" /> +{ar(res.stars)} نجمة</p>}
          {res.passed && res.stars === 0 && <p className="text-sm text-muted-foreground">{g("خدت", "خدتِ")} نجوم المستوى ده قبل كده</p>}
          {!res.passed && <p className="text-sm text-muted-foreground">النجاح من {ar(PASS)}٪</p>}
          {res.passed && level < 3 && meta.prophets && vps.length < LEVEL_NEED[level] && <p className="text-sm text-muted-foreground">المستوى {ar(level + 1)} يفتح لما {g("تقابل", "تقابلي")} {ar(LEVEL_NEED[level])} أنبياء في رحلتك ✨</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {res.passed && level < 3 && (!meta.prophets || vps.length >= LEVEL_NEED[level]) && <Link href={`/kid/games/play/?g=${game}&l=${level + 1}`} className={buttonVariants({ variant: "hero", size: "lg2" })}>المستوى {ar(level + 1)}</Link>}
            <Button variant="secondary" size="lg2" onClick={() => setRound((r) => r + 1)}><RotateCcw /> {g("العب تاني", "العبي تاني")}</Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          {phase === "sending" && <div role="status" className="absolute inset-0 z-10 grid place-items-center rounded-[28px] bg-background/70 backdrop-blur-sm"><span className="flex items-center gap-2 font-bold"><Loader2 className="animate-spin" /> لحظة…</span></div>}
          {game === "asma" && <p className="mb-3 text-center text-lg leading-9"><RT text="﴿وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا﴾" /> <span className="text-xs text-muted-foreground">(الأعراف: ١٨٠)</span></p>}
          {meta.prophets && <p className="mb-3 text-center text-sm font-bold text-muted-foreground">الأنبياء عليهم الصلاة والسلام</p>}
          {board.kind !== "match" && (board.kind === "order" ? board.items.length : board.rounds.length) < 2 ? (
            <p className="rounded-[28px] border bg-card p-6 text-center font-bold">{g("قابل", "قابلي")} أنبياء أكثر في رحلتك وارجع للعبة دي ✨</p>
          ) : board.kind === "match" ? <MatchBoard key={round} pairs={board.pairs} leftLabel={board.l} rightLabel={board.r} onDone={finish} noteOf={game === "akhlaq" ? akhlaqWhy : game === "match" ? symbolRef : undefined} />
            : board.kind === "order" ? <OrderBoard key={round} items={board.items} onDone={finish} />
            : <WhoBoard key={round} rounds={board.rounds} onDone={finish} />}
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return <Suspense fallback={<Skeleton className="h-72 rounded-[32px]" />}><Play /></Suspense>;
}

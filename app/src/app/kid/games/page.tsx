"use client";
import Link from "next/link";
import { Check, Lock, Star } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Icon3D } from "@/components/icon3d";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { g } from "@/lib/kid-text";
import { GAMES, LEVEL_NEED } from "@/lib/games";
import { cn } from "@/lib/utils";

// الألعاب: كلها مفتوحة، والطفل يختار ما يحب. داخل كل لعبة ٣ مستويات، والمستوى يفتح بعد اللي قبله.
// ألعاب الأنبياء تكبر مع رحلته: المستوى يحتاج عددًا من الأنبياء الظاهرين (٣ ثم ٥ ثم ٧)
export type GamesInfo = { prophets: number; need: number[]; stars: number; progress: { game: string; level: number; best: number }[] };
const ar = (n: number) => n.toLocaleString("ar-EG");

export default function GamesPage() {
  const { data, loading } = useApi<GamesInfo>("games");
  const done = (game: string, level: number) => !!data?.progress.some((p) => p.game === game && p.level === level);
  const stars = data?.stars ?? 2;
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="game" size={56} float />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">الألعاب</h1>
          <p className="text-sm text-muted-foreground">{g("كل مستوى تكمّله أول مرة تكسب", "كل مستوى تكمّليه أول مرة تكسبي")} {ar(stars)} نجمة ⭐</p>
        </div>
      </header>
      {loading && !data ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-[28px]" />)}</div> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((gm, i) => {
            // أول مستوى يقفله عدد الأنبياء الظاهرين (لا التقدّم): نشرح للطفل متى يفتح
            const needLv = gm.prophets ? [1, 2, 3].find((lv) => (data?.prophets ?? 0) < LEVEL_NEED[lv - 1]) : undefined;
            return (
              <BlurFade key={gm.id} delay={0.05 * i}>
                <li data-testid="game-card" className={cn("flex flex-col gap-3 rounded-[28px] bg-gradient-to-br p-4 text-white shadow-soft", gm.tone)}>
                  <div className="flex items-center gap-3">
                    <Icon3D name={gm.icon} size={52} />
                    <div className="min-w-0"><h2 className="font-heading text-xl font-extrabold">{gm.title}</h2><p className="text-sm text-white/85">{gm.desc}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((lv) => {
                      const ok = done(gm.id, lv), prevOk = lv === 1 || done(gm.id, lv - 1);
                      const enough = !gm.prophets || (data?.prophets ?? 0) >= LEVEL_NEED[lv - 1];
                      const open = prevOk && enough;
                      return open ? (
                        <Link key={lv} href={`/kid/games/play/?g=${gm.id}&l=${lv}`} aria-label={`${gm.title} — المستوى ${ar(lv)}`}
                          className="flex h-14 flex-col items-center justify-center rounded-2xl bg-white/20 font-bold backdrop-blur transition active:scale-95">
                          <span className="flex items-center gap-1 text-sm">{ok ? <Check className="size-4" /> : <Star className="size-4" />} المستوى {ar(lv)}</span>
                        </Link>
                      ) : (
                        <span key={lv} aria-label={`المستوى ${ar(lv)} مقفول${gm.prophets && (data?.prophets ?? 0) < LEVEL_NEED[lv - 1] ? ` — يفتح مع ${ar(LEVEL_NEED[lv - 1])} أنبياء` : ""}`} className="flex h-14 flex-col items-center justify-center rounded-2xl bg-black/20 text-sm font-bold text-white/70">
                          <Lock className="size-4" /> المستوى {ar(lv)}
                        </span>
                      );
                    })}
                  </div>
                  {needLv && <p className="text-xs text-white/85">{needLv === 1 ? "تفتح" : `المستوى ${ar(needLv)} يفتح`} لما {g("تقابل", "تقابلي")} {ar(LEVEL_NEED[needLv - 1])} أنبياء في رحلتك ✨</p>}
                </li>
              </BlurFade>
            );
          })}
        </ul>
      )}
    </div>
  );
}

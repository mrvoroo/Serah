"use client";
import { motion } from "motion/react";
import { session, type Leaderboard } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Skeleton } from "@/components/ui/skeleton";
import { BorderBeam } from "@/components/ui/border-beam";
import { Icon3D } from "@/components/icon3d";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";
import { g } from "@/lib/kid-text";

const PODIUM = [
  { place: 2, h: "h-24", medal: "medal2" as const, tone: "from-slate-300 to-slate-400" },
  { place: 1, h: "h-32", medal: "medal1" as const, tone: "from-[#FFD266] to-[#FFA51F]" },
  { place: 3, h: "h-20", medal: "medal3" as const, tone: "from-[#F0A46B] to-[#C46A2C]" },
];

export default function StarsPage() {
  const { data, loading } = useApi<Leaderboard>("leaderboard");
  const meId = session.user()?.user_id;
  const animate = useMotionAllowed();
  const top = data?.top ?? [];

  return (
    <div className="flex flex-col gap-4">
      <BlurFade>
        <div className="flex items-center gap-3">
          <Icon3D name="trophy" size={56} float />
          <div><h1 className="font-heading text-3xl font-extrabold">لوحة النجوم</h1><p className="text-muted-foreground">مين جمع نجوم أكتر؟</p></div>
        </div>
      </BlurFade>

      {loading && !data ? <Skeleton className="h-64 rounded-[32px]" /> : top.length === 0 ? (
        <p className="rounded-[28px] border bg-card p-6 text-center text-muted-foreground">{g("لسه مفيش نجوم، اسمع أول محاضرة!", "لسه مفيش نجوم، اسمعي أول محاضرة!")}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 items-end gap-2 rounded-[32px] border bg-card p-4 pt-6 shadow-soft">
            {PODIUM.map((p, i) => {
              const k = top[p.place - 1];
              if (!k) return <div key={p.place} />;
              return (
                <motion.div key={p.place} className="flex flex-col items-center gap-1" initial={animate ? { opacity: 0, y: 30 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i, type: "spring", stiffness: 200, damping: 18 }}>
                  {p.place === 1 && <Icon3D name="crown" size={34} float />}
                  <KidAvatar value={k.avatar} size={p.place === 1 ? 60 : 48} />
                  <p className="max-w-full truncate text-sm font-bold">{k.name}</p>
                  <div className={cn("relative flex w-full flex-col items-center justify-start gap-1 overflow-hidden rounded-t-2xl bg-gradient-to-b pt-2 text-[#3A2400]", p.h, p.tone)}>
                    <Icon3D name={p.medal} size={30} />
                    <span className="font-heading text-lg font-extrabold">{k.points}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <ul className="flex flex-col gap-2">
            {top.slice(3).map((k, i) => {
              const mine = k.user_id === meId;
              return (
                <BlurFade key={k.user_id} delay={0.04 * i} inView>
                  <li className={cn("relative flex items-center gap-3 overflow-hidden rounded-[24px] border bg-card p-3", mine && "border-primary")}>
                    {mine && <BorderBeam size={60} duration={6} colorFrom="#FFC24D" colorTo="#8B6CFF" />}
                    <span className="grid size-9 place-items-center rounded-full bg-secondary font-heading font-extrabold">{i + 4}</span>
                    <KidAvatar value={k.avatar} size={40} />
                    <span className="flex-1 font-bold">{k.name}{mine && " (أنت)"}</span>
                    <span className="flex items-center gap-1 font-heading text-lg font-extrabold"><NumberTicker value={k.points} /> <Icon3D name="star" size={22} /></span>
                  </li>
                </BlurFade>
              );
            })}
          </ul>
          {data && data.me > 0 && (
            <p className="text-center font-bold text-muted-foreground">ترتيبك: <span className="text-gold font-heading text-xl">{data.me}</span></p>
          )}
        </>
      )}
    </div>
  );
}

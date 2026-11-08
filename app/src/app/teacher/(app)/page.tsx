"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bar, BarChart, Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { session, fmtDate, type Dashboard } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { Murshida } from "@/components/murshida";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { teacherTitle } from "@/lib/utils";
import { LiveBanner, useLiveReady } from "@/components/live/live-banner";

const QUICK: { href: string; label: string; icon: Icon3DName; hint: string }[] = [
  { href: "/teacher/live/", label: "محاضرة مباشرة", icon: "mic", hint: "ابدئي بضغطة واحدة" },
  { href: "/teacher/upload/", label: "رفع تسجيل", icon: "headphone", hint: "محاضرة جديدة" },
  { href: "/teacher/lectures/", label: "مراجعة ونشر", icon: "check", hint: "المسودات" },
  { href: "/teacher/students/", label: "إضافة طفل", icon: "cap", hint: "الطلاب" },
  { href: "/teacher/suggestions/", label: "الاقتراحات", icon: "speech", hint: "صندوق الأفكار" },
];

const barCfg = { count: { label: "حضور", color: "var(--primary)" } } satisfies ChartConfig;
const areaCfg = { count: { label: "استماع", color: "var(--primary)" } } satisfies ChartConfig;

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border bg-card p-4 shadow-soft ${className}`}>
      <h2 className="mb-3 font-heading text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export default function TeacherHome() {
  const { data, loading, error, reload } = useApi<Dashboard>("dashboard");
  const live = useLiveReady();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  const user = session.user();

  const stats: { label: string; value: number; icon: Icon3DName; suffix?: string }[] = [
    { label: "الأطفال", value: data?.kids ?? 0, icon: "cap" },
    { label: "المحاضرات المنشورة", value: data?.published ?? 0, icon: "headphone" },
    { label: "بانتظار المراجعة", value: data?.drafts ?? 0, icon: "hourglass" },
    { label: "مجموع النجوم", value: data?.totalPoints ?? 0, icon: "glowing-star" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <BlurFade>
        <div className="relative flex items-center gap-3 overflow-hidden rounded-[28px] bg-hero p-5 text-white shadow-soft">
          {/* بيانات لسه بتتحمل → ترحّب، مسودات تنتظر المراجعة → تتأمل، كله منشور → مسرورة */}
          <Murshida mood={!data ? "helping" : data.drafts ? "thinking" : "happy"} size={96} />
          <div className="min-w-0 flex-1">
            <p className="text-white/80">السلام عليكم ورحمة الله وبركاته</p>
            <h1 className="font-heading text-2xl font-extrabold lg:text-3xl">مرحبًا بكِ، {teacherTitle(user?.name, user?.role)}</h1>
            <p className="mt-1 text-white/85">{data?.drafts ? `لديكِ ${data.drafts.toLocaleString("ar-EG")} محاضرة بانتظار مراجعتكِ الكريمة قبل النشر` : "الحمد لله، جميع المحاضرات منشورة"}</p>
          </div>
        </div>
      </BlurFade>

      <LiveBanner teacher />
      {/* الوصول السريع أولًا */}
      <section aria-label="الوصول السريع" className={live ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" : "grid grid-cols-2 gap-3 lg:grid-cols-4"}>
        {QUICK.filter((q) => live || q.href !== "/teacher/live/").map((q, i) => (
          <BlurFade key={q.href} delay={0.05 + i * 0.04}>
            <Link href={q.href} className="block h-full rounded-[24px] focus-visible:outline-2">
              <MagicCard className="h-full rounded-[24px]" gradientColor={dark ? "#2A1D66" : "#E9E2FF"} gradientFrom="#8B6CFF" gradientTo="#FFC24D">
                <div className="flex h-full flex-col items-center gap-2 p-4 text-center">
                  <Icon3D name={q.icon} size={52} float delay={i * 0.25} />
                  <span className="font-heading text-base font-extrabold">{q.label}</span>
                  <span className="text-xs text-muted-foreground">{q.hint}</span>
                </div>
              </MagicCard>
            </Link>
          </BlurFade>
        ))}
      </section>

      {error && !data && <div className="rounded-[24px] border bg-card p-4 text-center">{error} <button onClick={reload} className="font-bold text-primary">إعادة المحاولة</button></div>}

      <section aria-label="الإحصائيات" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <BlurFade key={s.label} delay={0.2 + i * 0.04}>
            <div className="flex items-center gap-3 rounded-[24px] border bg-card p-4 shadow-soft">
              <Icon3D name={s.icon} size={42} float delay={0.15 + i * 0.3} />
              <div className="min-w-0">
                {loading && !data ? <Skeleton className="h-8 w-12" /> : <NumberTicker value={s.value} className="font-heading text-2xl font-extrabold" />}
                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </BlurFade>
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="نسبة الحضور" className="flex flex-col items-center">
          {loading && !data ? <Skeleton className="size-36 rounded-full" /> : (
            <AnimatedCircularProgressBar value={data?.attendanceRate ?? 0} gaugePrimaryColor="var(--primary)" gaugeSecondaryColor="var(--secondary)" className="size-36 font-heading text-2xl" />
          )}
          <p className="mt-2 text-center text-sm text-muted-foreground">من المحاضرات المنشورة سمعها الأطفال</p>
        </Panel>
        <Panel title="الحضور في آخر المحاضرات" className="lg:col-span-2">
          {loading && !data ? <Skeleton className="h-52" /> : data?.perLecture?.length ? (
            <ChartContainer config={barCfg} className="h-52 w-full">
              <BarChart data={data.perLecture} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="title" tickLine={false} axisLine={false} tickMargin={8} interval={0} tickFormatter={(v: string) => v.slice(0, 8)} reversed />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} orientation="right" />
                <ChartTooltip cursor={{ fill: "var(--secondary)", opacity: 0.5 }} content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ChartContainer>
          ) : <p className="py-10 text-center text-muted-foreground">لا توجد محاضرات منشورة بعد</p>}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="نشاط الاستماع (١٤ يومًا)" className="lg:col-span-2">
          {loading && !data ? <Skeleton className="h-48" /> : (
            <ChartContainer config={areaCfg} className="h-48 w-full">
              <AreaChart data={data?.days ?? []} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs><linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} /><stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} reversed />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} orientation="right" />
                <ChartTooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
                <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} fill="url(#fillCount)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ChartContainer>
          )}
        </Panel>
        <Panel title="أبطال النجوم">
          {loading && !data ? <Skeleton className="h-48" /> : (
            <ul className="flex flex-col gap-2">
              {data?.top?.map((k, i) => (
                <li key={k.user_id} className="flex items-center gap-2 rounded-2xl bg-secondary/50 p-2">
                  <span className="grid size-7 place-items-center rounded-full bg-background text-sm font-extrabold">{i + 1}</span>
                  <KidAvatar value={k.avatar} size={30} />
                  <span className="flex-1 truncate font-bold">{k.name}</span>
                  <span className="font-heading font-extrabold">{k.points}</span>
                </li>
              ))}
              {!data?.top?.length && <p className="text-center text-muted-foreground">لا يوجد أطفال بعد</p>}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="آخر النشاط">
        {loading && !data ? <Skeleton className="h-24" /> : data?.recent?.length ? (
          <ul className="divide-y">
            {data.recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <KidAvatar value={r.avatar} size={32} />
                <p className="flex-1 text-sm"><b>{r.name}</b> سمع «{r.lecture}»</p>
                <span className="text-xs text-muted-foreground">{fmtDate(r.at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-center text-muted-foreground">لا يوجد نشاط بعد</p>}
      </Panel>
    </div>
  );
}

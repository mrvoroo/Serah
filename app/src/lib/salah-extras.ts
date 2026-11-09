import salah from "@/content/salah.json";
import type { PrayerId } from "@/lib/prayer";

// محتوى الصلاة الذي تضيفه الأدمن من لوحة المعلمات: روابط فيديوهات لأماكن ثابتة، وأذكار إضافية
// نصوص salah.json الأصلية (المراجَعة من الشيخ) ثابتة ولا تُعدَّل من هنا
export type ExtraZikr = { zikr_id: string; text: string; count: number; ref: string; virtue: string; grade: string; after: PrayerId[]; visible: boolean };
export type SalahExtras = { videos: Record<string, string>; azkar: ExtraZikr[] };

type Step = { id: string; title: string; video?: string };
type Video = { id: string; title: string; youtubeId: string };
const S = salah as unknown as { howTo: Step[]; videos: Video[] };

// كل أماكن الفيديو: فيديوهات القسم العام ثم خطوات كيفية الصلاة
export const VIDEO_SLOTS: { key: string; title: string; group: "videos" | "howTo"; builtIn: string }[] = [
  ...S.videos.map((v) => ({ key: `vid:${v.id}`, title: v.title, group: "videos" as const, builtIn: v.youtubeId || "" })),
  ...S.howTo.map((s) => ({ key: `how:${s.id}`, title: s.title, group: "howTo" as const, builtIn: s.video || "" })),
];

export const ytId = (v?: string) => {
  const s = String(v || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(s);
  return m ? m[1] : "";
};

// الفيديو المعروض في مكان: رابط الأدمن أولًا، وإلا الموجود في salah.json
export const videoFor = (key: string, builtIn: string | undefined, extras?: SalahExtras) => extras?.videos?.[key] || ytId(builtIn);

// تمييز العدد: مرة، مرتين، ٣–١٠ مرات، ١١ فأكثر مرة (٣٣ مرة، ١٠٠ مرة)
const ar = (n: number) => n.toLocaleString("ar-EG");
export const times = (n: number) => (n === 1 ? "مرة" : n === 2 ? "مرتين" : n <= 10 ? `${ar(n)} مرات` : `${ar(n)} مرة`);

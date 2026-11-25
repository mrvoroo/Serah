import duasData from "@/content/daily-duas.json";
import hadithData from "@/content/hadith-kids.json";
import juzData from "@/content/juz-amma.json";
import seasonsData from "@/content/seasons.json";
import { session } from "@/lib/api";

// محتوى الأفكار الثمانية (نصوص مراجَعة من JSON فقط) وأنواعها المشتركة بين صفحات الطفل والمعلمة وولي الأمر
export type Dua = { id: string; title: string; icon: string; text: string; virtue?: string; hadith?: string; ref: string; grade: string; kidNote: string };
export type Hadith = { id: string; title: string; text: string; narrator: string; ref: string; grade: string; explain: string; apply: string };
export type Surah = { n: number; name: string; ayahs: number };
export type Season = { id: "ramadan" | "dhulhijja" | "other"; name: string; icon: string; verse: string; ref: string; templates: { title: string; unit: string; goal: number }[] };
export type ReleaseKind = "dua" | "hadith";
export type ItemRelease = { zikr_id: string; note: string; file_id: string; file_kind: "" | "image" | "audio" | "file"; file_name: string; released_at: string };
export type Achievement = { key: string; kind: "hadith" | "surah"; title: string; stars: number; at: string };

const D = duasData as unknown as { meta: { kidOrder: string[] }; duas: Dua[] };
const H = hadithData as unknown as { meta: { kidOrder: string[] }; hadiths: Hadith[] };
export const DUAS: Dua[] = D.duas;
export const HADITHS: Hadith[] = H.hadiths;
export const DUA_ORDER = D.meta.kidOrder;
export const HADITH_ORDER = H.meta.kidOrder;
export const duaById = (id: string) => DUAS.find((d) => d.id === id);
export const hadithById = (id: string) => HADITHS.find((h) => h.id === id);
export const JUZ: Surah[] = (juzData as unknown as { surahs: Surah[] }).surahs;
// الأطفال يحفظون من الناس صعودًا
export const JUZ_KID = [...JUZ].reverse();
export const surahName = (n: number) => JUZ.find((s) => s.n === n)?.name ?? "";
export const SEASONS: Season[] = (seasonsData as unknown as { seasons: Season[] }).seasons;

export const ar = (n: number) => n.toLocaleString("ar-EG");
export const isoToday = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// مراحل شجرة السورة في الحديقة
export type Stage = 0 | 1 | 2 | 3 | 4;
export const stageOf = (reviews: number, confirmed: boolean): Stage => (confirmed ? 4 : reviews >= 7 ? 3 : reviews >= 3 ? 2 : reviews >= 1 ? 1 : 0);
export const STAGE_NAME = ["بذرة", "نبتة", "شجيرة", "شجرة", "شجرة مثمرة"];

// الأعمال الصالحة (نفس معرّفات DEEDS في الخلفية)
export const DEEDS: { id: string; label: string; icon: string }[] = [
  { id: "birr", label: "بر الوالدين", icon: "💗" }, { id: "help", label: "مساعدة في البيت", icon: "🧹" },
  { id: "sadaqa", label: "صدقة", icon: "🪙" }, { id: "rahim", label: "صلة الرحم", icon: "👨‍👩‍👧" },
  { id: "road", label: "إماطة الأذى عن الطريق", icon: "🪨" }, { id: "truth", label: "الصدق في الكلام", icon: "🗣️" },
  { id: "feed", label: "إطعام الطعام", icon: "🍞" }, { id: "animal", label: "الرحمة بالحيوان", icon: "🐈" },
  { id: "room", label: "ترتيب الغرفة", icon: "🛏️" }, { id: "neighbor", label: "الإحسان إلى الجار", icon: "🏡" },
  { id: "smile", label: "الابتسامة في وجوه الناس", icon: "😊" }, { id: "share", label: "مشاركة الألعاب", icon: "🧸" },
];
export const deedOf = (id: string) => DEEDS.find((d) => d.id === id);
export type Deed = { deed_id: string; deed: string; note: string; day: number; stars: number; at: string; by: string; by_gender: "m" | "f"; mine: boolean };
export const dayIso = (n: number) => { const s = String(n); return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`; };
export const dayNum = (iso: string) => Number(iso.replace(/-/g, ""));

// علامات «قلته اليوم» للأدعية على الجهاز لكل حساب ويوم
const marksKey = (day: string) => `serah_du:${session.user()?.user_id ?? "x"}:${day}`;
export function loadMarks(day: string): string[] { try { return JSON.parse(localStorage.getItem(marksKey(day)) || "[]"); } catch { return []; } }
export function saveMarks(day: string, ids: string[]) {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("serah_du:") && k !== marksKey(day)).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(marksKey(day), JSON.stringify(ids));
  } catch { /* لا شيء */ }
}

export type Recitation = { rec_id: string; user_id: string; name: string; avatar: string; surah: number; surah_name: string; file_id: string; duration_sec: number; status: "pending" | "reviewed"; rating: number; note: string; reviewed_at: string; created_at: string };
export type Challenge = { ch_id: string; title: string; season: Season["id"]; unit: string; goal: number; starts: string; ends: string; active: boolean; open: boolean; total: number; kids: number; mine_total: number; mine_today: number };
export type GardenItem = { surah: number; reviews: number; last_day: number; confirmed: boolean };
export type Garden = { items: GardenItem[]; juz: boolean };
export type Cert = { id: string; kind: "surah" | "juz" | "stage"; title: string; at: string };
export type Certs = { kid: { name: string; gender: "m" | "f"; class_name: string }; teacher: string; items: Cert[] };
export const RATING = ["", "أحسنت", "ممتاز", "ما شاء الله"];

import data from "@/content/morning-evening.json";
import { timesFor, type Place } from "@/lib/prayer";
import { session } from "@/lib/api";

// أذكار الصباح والمساء (محتوى مراجَع من الشيخ: content/morning-evening.json)
export type Period = "am" | "pm";
export type MEZikr = {
  id: string; title: string; text: string; count: number; when: "both" | "morning" | "evening";
  variants?: { morning?: string; evening?: string }; short?: boolean;
  virtue?: string; reward?: string; hadith?: string; ref?: string; grade?: string; gradeNote?: string; kidNote?: string; sleepNote?: string;
};
export type Release = { zikr_id: string; note: string; file_id: string; file_kind: "" | "image" | "audio" | "file"; file_name: string; released_at: string };

const D = data as unknown as { meta: { source?: string; note?: string; kidOrder?: string[] }; azkar: MEZikr[] };
export const AZKAR: MEZikr[] = D.azkar;
export const AZKAR_META = D.meta;
export const KID_ORDER: string[] = D.meta.kidOrder ?? AZKAR.map((z) => z.id);
export const zikrById = (id: string) => AZKAR.find((z) => z.id === id);

// الفترة الحالية: الصباح من الفجر إلى العصر، والمساء من العصر إلى الفجر التالي
export function currentPeriod(place: Place, now = new Date()): Period {
  try {
    const t = timesFor(now, place);
    return now >= t.fajr && now < t.asr ? "am" : "pm";
  } catch { const h = now.getHours(); return h >= 4 && h < 15 ? "am" : "pm"; }
}

export const fitsPeriod = (z: MEZikr, p: Period) => z.when === "both" || (p === "am" ? z.when === "morning" : z.when === "evening");
// نص الذكر بصيغة الفترة («أصبحنا» صباحًا و«أمسينا» مساءً)
export const textFor = (z: MEZikr, p: Period) => (p === "am" ? z.variants?.morning : z.variants?.evening) || z.text;
// العنوان بصيغة الفترة أيضًا («أمسينا…» مساءً) للأذكار التي لها صيغتان
export const titleFor = (z: MEZikr, p: Period) => (p === "pm" && z.variants?.evening ? z.title.replace(/أصبحنا/g, "أمسينا").replace(/أصبح/g, "أمسى") : z.title);
// بعد الظهر في فترة الصباح: الأفضل بعد الفجر إلى طلوع الشمس، ومن فاتته يقولها الآن
export function lateMorning(place: Place, now = new Date()) { try { const t = timesFor(now, place); return now >= t.dhuhr && now < t.asr; } catch { return false; } }
export const listFor = (p: Period, short: boolean) => AZKAR.filter((z) => fitsPeriod(z, p) && (!short || z.short));
export const PERIOD_NAME: Record<Period, string> = { am: "أذكار الصباح", pm: "أذكار المساء" };

// عدّاد اليوم محفوظ على الجهاز (يكمل من حيث وقف لو أغلق الصفحة)، ويبدأ من جديد مع كل فترة جديدة
// اليوم المنطقي للفترة: المساء بعد منتصف الليل (قبل الخامسة) يتبع اليوم السابق — نفس اليوم يُرسل للخادم للنجوم
export const logicalDay = (p: Period, now = new Date()) => { const d = new Date(now); if (p === "pm" && d.getHours() < 5) d.setDate(d.getDate() - 1); return d; };
// العدّاد لكل حساب (حتى لا يرى أخ أو أخت على نفس الجهاز أذكار الآخر مكتملة)
const dayKey = (p: Period, now = new Date()) => {
  const d = logicalDay(p, now), u = session.user()?.user_id ?? "x";
  return `serah_me:${u}:${p}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
export function loadCounts(p: Period): Record<string, number> { try { return JSON.parse(localStorage.getItem(dayKey(p)) || "{}"); } catch { return {}; } }
export function saveCounts(p: Period, c: Record<string, number>) {
  try {
    const keep = [dayKey("am"), dayKey("pm")];
    Object.keys(localStorage).filter((k) => k.startsWith("serah_me:") && !keep.includes(k)).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(dayKey(p), JSON.stringify(c));
  } catch { /* لا شيء */ }
}
export const todayIso = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

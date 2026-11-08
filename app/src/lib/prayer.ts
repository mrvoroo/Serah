import { CalculationMethod, Coordinates, PrayerTimes, type CalculationParameters } from "adhan";
import salah from "@/content/salah.json";

// مواقيت الصلاة تُحسب على الجهاز (مكتبة adhan) — تقريبية، والمعتمد أذان المسجد المحلي
export const PRAYER_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerId = (typeof PRAYER_IDS)[number];
export const PRAYER_NAMES: Record<PrayerId, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };

export type Place = { name: string; lat: number; lng: number; auto?: boolean };
// مدينة افتراضية حسب المنطقة الزمنية للجهاز، وطريقة الحساب المعتمدة في كل بلد
const ZONES: Record<string, Place & { method: string }> = {
  "Asia/Riyadh": { name: "الرياض", lat: 24.7136, lng: 46.6753, method: "UmmAlQura" },
  "Africa/Cairo": { name: "القاهرة", lat: 30.0444, lng: 31.2357, method: "Egyptian" },
  "Asia/Dubai": { name: "دبي", lat: 25.2048, lng: 55.2708, method: "Dubai" },
  "Asia/Kuwait": { name: "الكويت", lat: 29.3759, lng: 47.9774, method: "Kuwait" },
  "Asia/Qatar": { name: "الدوحة", lat: 25.2854, lng: 51.531, method: "Qatar" },
  "Asia/Bahrain": { name: "المنامة", lat: 26.2285, lng: 50.586, method: "UmmAlQura" },
  "Asia/Muscat": { name: "مسقط", lat: 23.588, lng: 58.3829, method: "UmmAlQura" },
  "Asia/Amman": { name: "عمّان", lat: 31.9454, lng: 35.9284, method: "MuslimWorldLeague" },
};
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } };
const zone = () => ZONES[tz()] ?? ZONES["Asia/Riyadh"];
export const defaultPlace = (): Place => { const z = zone(); return { name: z.name, lat: z.lat, lng: z.lng }; };

function params(): CalculationParameters {
  const m = zone().method as keyof typeof CalculationMethod;
  return (CalculationMethod[m] ?? CalculationMethod.UmmAlQura)();
}

const PLACE_KEY = "serah_prayer_place";
export function loadPlace(): Place {
  try { const p = JSON.parse(localStorage.getItem(PLACE_KEY) || "null"); if (p && isFinite(p.lat) && isFinite(p.lng)) return p; } catch { /* افتراضي */ }
  return defaultPlace();
}
export function savePlace(p: Place | null) { try { if (p) localStorage.setItem(PLACE_KEY, JSON.stringify(p)); else localStorage.removeItem(PLACE_KEY); } catch { /* لا شيء */ } }

export type DayTimes = Record<PrayerId | "sunrise", Date>;
export function timesFor(date: Date, place: Place): DayTimes {
  const t = new PrayerTimes(new Coordinates(place.lat, place.lng), date, params());
  return { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

// تواريخ محلية بصيغة yyyy-mm-dd (لا toISOString لأنه بتوقيت جرينتش)
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// الأسبوع يبدأ السبت
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 1) % 7));
export const fmtTime = (d: Date) => d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
export const fmtDay = (d: Date, o: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) => d.toLocaleDateString("ar-EG", o);
export const fmtHijri = (d: Date) => { try { return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

/* ===== جدول الإشعارات (١٤ يومًا) يُرسل للخادم الذي يرسلها في وقتها ===== */
export type NotifyPrefs = { prayer: boolean; dhikr: boolean; duha: boolean; friday: boolean; tasks: boolean };
export const DEFAULT_PREFS: NotifyPrefs = { prayer: true, dhikr: true, duha: true, friday: true, tasks: true };
const PREFS_KEY = "serah_notify_prefs";
export function loadPrefs(): NotifyPrefs { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { return DEFAULT_PREFS; } }
export function savePrefs(p: NotifyPrefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* لا شيء */ } }

type PlanEntry = [number, string, number];
export const PRE_PRAYER_SEC = 10 * 60;
const R = salah.reminders as { dhikr: unknown[]; duha: unknown[]; friday: { title: string; body: string; boys?: boolean }[] };
const fridayIdx = (re: RegExp, fallback: number) => { const i = R.friday.findIndex((f) => re.test(f.title + f.body)); return i >= 0 ? i : fallback; };

// مولّد عشوائي ثابت لكل يوم (حتى لا تتغير مواعيد الذكر كل مرة يُعاد فيها الحساب)
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

export function buildPlan(place: Place, prefs: NotifyPrefs, girl: boolean, from = new Date(), days = 14): PlanEntry[] {
  const out: PlanEntry[] = [];
  const sec = (d: Date) => Math.floor(d.getTime() / 1000);
  const at = (day: Date, h: number, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i), t = timesFor(day, place), r = rng(Number(iso(day).replace(/-/g, "")));
    // لكل صلاة تنبيهان: قبلها بـ١٠ دقائق «اقترب وقت الصلاة»، وعند الأذان «حان وقت الصلاة»
    if (prefs.prayer) PRAYER_IDS.forEach((p) => { out.push([sec(t[p]) - PRE_PRAYER_SEC, `pre:${p}`, i * 2]); out.push([sec(t[p]), `p:${p}`, i * 2 + 1]); });
    if (prefs.dhikr) {
      // ٣ تذكيرات في أوقات عشوائية بين ٩ صباحًا و٨ مساءً، بعيدًا عن وقت الصلاة بـ٢٠ دقيقة
      let n = 0, tries = 0;
      while (n < 3 && tries++ < 40) {
        const d = at(day, 9, Math.floor(r() * 11 * 60));
        if (PRAYER_IDS.some((p) => Math.abs(d.getTime() - t[p].getTime()) < 20 * 60e3)) continue;
        out.push([sec(d), "dhikr", Math.floor(r() * R.dhikr.length)]); n++;
      }
    }
    // الضحى: منتصف ما بين الشروق والظهر
    if (prefs.duha) out.push([sec(new Date((t.sunrise.getTime() + t.dhuhr.getTime()) / 2)), "duha", i % Math.max(1, R.duha.length)]);
    if (prefs.friday && day.getDay() === 5) {
      out.push([sec(at(day, 8, 30)), "fri", fridayIdx(/الكهف/, 1)]);
      out.push([sec(new Date(t.dhuhr.getTime() - 75 * 60e3)), "fri", girl ? fridayIdx(/الصلاة على النبي/, 2) : fridayIdx(/الغسل|بكّر/, 4)]);
      out.push([sec(new Date(t.maghrib.getTime() - 45 * 60e3)), "fri", fridayIdx(/ساعة/, 3)]);
    }
  }
  const now = sec(new Date());
  return out.filter((e) => e[0] > now).sort((a, b) => a[0] - b[0]);
}

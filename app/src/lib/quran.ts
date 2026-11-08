// القرآن: النص العثماني من api.alquran.cloud، والتلاوة آية آية من EveryAyah (يدعم التشغيل الجزئي فيعمل على آيفون)
// يُحفظ النص في المتصفح بعد أول فتح حتى لا يُطلب مرة ثانية

export type SurahInfo = { number: number; name: string; ayahs: number };
// page: رقم الصفحة في مصحف المدينة (٦٠٤ صفحات) لتقسيم السور الطويلة
export type Ayah = { n: number; text: string; page: number };

// الشيخ: مجلد المصحف المعلّم (الشيخ يقرأ والأطفال يرددون) ومجلد التلاوة المرتّلة (لوضع «دورك تقرأ»)
export const RECITERS = [
  // المصحف المعلّم (طفل يردد وراء الشيخ) موجود بصوت المنشاوي فقط؛ تسجيل الحصري المعلّم بدون أطفال، فالحصري على «دورك يا بطل» بس
  { id: "minshawy", short: "الشيخ المنشاوي", name: "الشيخ محمد صدّيق المنشاوي", teacher: "Minshawy_Teacher_128kbps", murattal: "Minshawy_Murattal_128kbps", muallim: true },
  { id: "husary", short: "الشيخ الحصري", name: "الشيخ محمود خليل الحصري", teacher: "Husary_Muallim_128kbps", murattal: "Husary_128kbps", muallim: false },
] as const;
export type ReciterId = (typeof RECITERS)[number]["id"];
export type QuranMode = "teacher" | "turn";

const API = "https://api.alquran.cloud/v1";
const pad = (n: number) => String(n).padStart(3, "0");
export const ayahAudio = (folder: string, surah: number, ayah: number) => `https://everyayah.com/data/${folder}/${pad(surah)}${pad(ayah)}.mp3`;

function cached<T>(key: string): T | null { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; } }
function store(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* المساحة ممتلئة: نكمل بدون حفظ */ } }

export async function surahList(): Promise<SurahInfo[]> {
  const hit = cached<SurahInfo[]>("serah_q_list");
  if (hit?.length === 114) return hit;
  const r = await fetch(`${API}/surah`);
  if (!r.ok) throw new Error("تعذّر تحميل قائمة السور، تأكد من الإنترنت");
  const j = await r.json();
  const list: SurahInfo[] = j.data.map((s: { number: number; name: string; numberOfAyahs: number }) => ({ number: s.number, name: s.name, ayahs: s.numberOfAyahs }));
  store("serah_q_list", list);
  return list;
}

// البسملة تأتي في أول نص الآية الأولى (عدا الفاتحة والتوبة)، لكنها ليست في ملف صوت الآية: نعرضها ونشغّلها منفصلة
export const hasBasmala = (surah: number) => surah !== 1 && surah !== 9;
// المقارنة على الحروف بدون تشكيل: البسملة تُكتب «بِسْمِ» غالبًا و«بِّسْمِ» بشدّة في أول التين والقدر
const bare = (t: string) => t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "");
export function stripBasmala(text: string) {
  const w = text.split(" ");
  return w.length > 4 && bare(w[0]) === "بسم" && bare(w[3]) === "ٱلرحيم" ? w.slice(4).join(" ") : text;
}

export async function surahText(n: number): Promise<Ayah[]> {
  // النسخة ٢ من الحفظ فيها رقم الصفحة
  const hit = cached<Ayah[]>(`serah_q2_${n}`);
  if (hit?.length) return hit;
  const r = await fetch(`${API}/surah/${n}/quran-uthmani`);
  if (!r.ok) throw new Error("تعذّر تحميل السورة، تأكد من الإنترنت");
  const j = await r.json();
  // المصدر يضع أحيانًا علامة مخفية (BOM) في أول النص — نزيلها قبل أي معالجة
  const ayahs: Ayah[] = j.data.ayahs.map((a: { numberInSurah: number; text: string; page?: number }) => {
    const text = a.text.replace(/\uFEFF/g, "").trim();
    return { n: a.numberInSurah, page: a.page ?? 0, text: a.numberInSurah === 1 && hasBasmala(n) ? stripBasmala(text) : text };
  });
  try { localStorage.removeItem(`serah_q_${n}`); } catch { /* النسخة القديمة بدون صفحات */ }
  store(`serah_q2_${n}`, ayahs);
  return ayahs;
}

// آخر موضع وصل له الطفل (السورة والآية والصفحة المفتوحة) وإعداداته
export type QuranPrefs = { surah: number; ayah: number; page: number; reciter: ReciterId; mode: QuranMode; repeat: 1 | 2 | 3; pause: 0.8 | 1.2 | 1.6 };
export const DEFAULT_PREFS: QuranPrefs = { surah: 1, ayah: 1, page: 0, reciter: "minshawy", mode: "teacher", repeat: 1, pause: 1.2 };
// الوضع الفعلي: الشيخ اللي ماعندوش مصحف معلّم يشتغل على «دورك»
export const fixMode = (p: QuranPrefs): QuranPrefs => (RECITERS.find((r) => r.id === p.reciter)?.muallim === false && p.mode === "teacher" ? { ...p, mode: "turn" } : p);
export const loadPrefs = (): QuranPrefs => fixMode({ ...DEFAULT_PREFS, ...(cached<Partial<QuranPrefs>>("serah_q_prefs") ?? {}) });
export const savePrefs = (p: QuranPrefs) => store("serah_q_prefs", p);

export const arNum = (n: number) => n.toLocaleString("ar-EG");

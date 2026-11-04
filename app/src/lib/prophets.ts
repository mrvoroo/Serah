import { STATIONS, type Station } from "@/components/journey/stations";

// بيانات رحلة الأنبياء من جدول Prophets في الخلفية، مع STATIONS كبيانات احتياطية لو الجدول فاضي أو الاتصال فشل

export type ProphetRow = { prophet_id: string; name: string; title: string; tag: string; text: string; symbol: string; symbol_name: string };
export type ProphetAdminRow = ProphetRow & { visible: boolean; items: number; pending: number };
export type ContentKind = "text" | "audio" | "image" | "youtube";
export type ContentItem = { item_id: string; kind: ContentKind; title: string; body: string; file_id: string; url: string; visible: boolean; approved: boolean };

// أشكال المجسم 3D المتاحة لاختيار الأدمن (نفس أسماء world.js)
export const SYMBOL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "بدون رمز (زخرفة)" },
  { value: "ark", label: "السفينة والموج" },
  { value: "kaaba", label: "الكعبة" },
  { value: "staff", label: "العصا والبحر المنشق" },
  { value: "yusuf_dream", label: "الشمس والقمر والكواكب" },
  { value: "whale", label: "الحوت الأزرق" },
  { value: "mushaf", label: "المصحف المغلق" },
  { value: "book", label: "المصحف المفتوح" },
  { value: "dome", label: "المسجد النبوي" },
  { value: "sword", label: "السيف" },
  { value: "crescent", label: "الهلال والنجمة" },
];

const FIXED = new Set(["start", "sira", "quran"]);
export const isProphet = (s: Station) => !FIXED.has(s.id);
const plainName = (name: string) => name.replace(/\s*ﷺ\s*$/, "").trim();
const num = (n: number) => n.toLocaleString("ar-EG");

// الأنبياء الافتراضيون بصيغة الجدول (للاستيراد مرة واحدة من شاشة الأدمن)
export const SEED_PROPHETS: ProphetRow[] = STATIONS.filter(isProphet).map((s) => ({
  prophet_id: s.id,
  name: s.id === "muhammad" ? "محمد ﷺ" : s.label.replace(/^سيدنا /, ""),
  title: s.title, tag: s.tag, text: s.text, symbol: s.symbol ?? "", symbol_name: s.symbolName ?? "",
}));

// محطات الرحلة: البداية + الأنبياء من الجدول بترتيبهم + السيرة والقرآن
export function toStations(rows: ProphetRow[] | undefined): Station[] {
  if (!rows?.length) return STATIONS;
  const prophets = rows.map((r, i): Station => {
    const name = plainName(r.name), muhammad = r.prophet_id === "muhammad";
    return {
      id: r.prophet_id,
      label: `سيدنا ${name}`,
      // ﷺ كحرف واحد يتكدس كنقاط، فنكتبها سطرًا صغيرًا تحت الاسم
      sub: muhammad ? "صلى الله عليه وسلم" : undefined,
      title: r.title || (muhammad ? "سيدنا محمد ﷺ" : `سيدنا ${name} عليه السلام`),
      tag: r.symbol_name ? `المحطة ${num(i + 1)} · ${r.symbol_name}` : `المحطة ${num(i + 1)}`,
      text: r.text,
      symbol: (r.symbol || undefined) as Station["symbol"],
      symbolName: r.symbol_name || undefined,
    };
  });
  return [STATIONS[0], ...prophets, ...STATIONS.filter((s) => s.id === "sira" || s.id === "quran")];
}

// بصمة المحطات: لو تغيّرت البيانات القادمة من الخلفية عن الاحتياطية نعيد بناء المجسم
export const stationsKey = (list: Station[]) => list.map((s) => [s.id, s.label, s.symbol ?? "", s.title, s.text].join("|")).join("~");

// اسم النبي كما يظهر في القائمة: «نوح»، «محمد ﷺ»
export const menuName = (s: Station) => (s.id === "muhammad" ? "محمد ﷺ" : s.label.replace(/^سيدنا /, ""));

// نفس قاعدة الخلفية: معرّف الفيديو من رابط watch / youtu.be / shorts / embed / live أو المعرّف نفسه
export function youtubeId(u: string) {
  const s = u.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

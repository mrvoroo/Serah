// تمييز الآيات وأسماء السور داخل أي نص:
// - الآية: كل ما بين ﴿ ﴾ (هكذا تُكتب الآيات في محتوى المنصة المراجَع) ← خط المصحف بالتشكيل.
// - اسم السورة ← خط الرقعة، لكن فقط في سياق يدل أنه سورة (لا نلوّن «سيدنا نوح» أو «يوسف» العادية):
//   بعد «سورة / سورتي»، أو قبل رقم آية «البقرة: ٣٠» «الأنعام (٨٤)»، أو داخل قائمة «سور كثيرة، منها: البقرة، والأعراف…».
export type Seg = { t: "text" | "ayah" | "surah"; v: string };

export const SURAHS = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد",
  "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء",
  "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم",
  "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق",
  "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ",
  "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر",
  "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس",
  // صيغ أخرى شائعة في الكتابة
  "الاسراء", "الانبياء", "الانشراح", "الزلزال", "براءة", "بني إسرائيل", "الدهر", "تبارك", "فصّلت", "المزّمّل", "المدّثّر", "الحاقّة",
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAME_RE = new RegExp(`(${[...new Set(SURAHS)].sort((a, b) => b.length - a.length).map(esc).join("|")})`, "g");
// حدود الكلمة (بدون lookbehind حتى يعمل على سفاري القديم)
const EDGE = /[\s،؛:()«»"'.,!؟?\-—–·/[\]]/;
const isEdge = (c: string | undefined) => c === undefined || EDGE.test(c);
const DIGIT = "[٠-٩0-9]";
// «البقرة: ٣٠» «الأنعام (٨٤)» «إبراهيم (سورة باسمه)» «الشمس ١١-١٥،» (رقم بلا نقطتين فقط لو بعده فاصلة أو قوس أو نهاية، حتى لا تُلوَّن «نوح ٩٥٠ سنة»)
const AFTER_REF = new RegExp(`^\\s*(?:[:：]\\s*${DIGIT}|\\(\\s*${DIGIT}|\\(\\s*سورة|،?\\s*الآي(?:ة|ات)\\s*${DIGIT}|\\s${DIGIT}+(?:\\s*[-–]\\s*${DIGIT}+)?\\s*(?:[،,؛;).]|$))`);
const BEFORE_SURA = /(?:سورة|سورتي|سورتا|سور)\s*$/;
const LIST_RE = /سور(?:\s+كثيرة)?،?\s*(?:منها|مثل)\s*:/g;

function surahRanges(text: string) {
  const ranges: [number, number][] = [];
  // قائمة «سور … منها: …» حتى نهاية الجملة
  for (const m of text.matchAll(LIST_RE)) {
    const start = (m.index ?? 0) + m[0].length;
    const end = text.slice(start).search(/[.؟!\n]/);
    ranges.push([start, end < 0 ? text.length : start + end]);
  }
  const out: [number, number][] = [];
  for (const m of text.matchAll(NAME_RE)) {
    const s = m.index ?? 0;
    const e = s + m[1].length;
    // يسمح بواو العطف أو باء الجر قبل الاسم («والأعراف»، «وص») ولا يلوّنها
    const prev = text[s - 1];
    const prefixed = (prev === "و" || prev === "ب") && isEdge(text[s - 2]);
    if (!(isEdge(prev) || prefixed) || !isEdge(text[e])) continue;
    const before = text.slice(Math.max(0, s - (prefixed ? 1 : 0) - 8), s - (prefixed ? 1 : 0));
    const inList = ranges.some(([a, b]) => s >= a && e <= b);
    if (inList || BEFORE_SURA.test(before) || AFTER_REF.test(text.slice(e, e + 24))) out.push([s, e]);
  }
  return out;
}

export function religiousSegments(text: string): Seg[] {
  const segs: Seg[] = [];
  const pushText = (chunk: string) => {
    if (!chunk) return;
    let last = 0;
    for (const [a, b] of surahRanges(chunk)) {
      if (a > last) segs.push({ t: "text", v: chunk.slice(last, a) });
      segs.push({ t: "surah", v: chunk.slice(a, b) });
      last = b;
    }
    if (last < chunk.length) segs.push({ t: "text", v: chunk.slice(last) });
  };
  let last = 0;
  for (const m of text.matchAll(/﴿[^﴾]*﴾/g)) {
    const i = m.index ?? 0;
    pushText(text.slice(last, i));
    segs.push({ t: "ayah", v: m[0] });
    last = i + m[0].length;
  }
  pushText(text.slice(last));
  return segs;
}

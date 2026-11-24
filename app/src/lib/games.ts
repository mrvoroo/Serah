import asma from "@/content/asma-husna.json";
import akhlaq from "@/content/asma-akhlaq.json";
import clues from "@/content/prophet-clues.json";
import type { Icon3DName } from "@/components/icon3d";
import type { ProphetRow } from "@/lib/prophets";
import { SEED_PROPHETS } from "@/lib/prophets";

// الألعاب: كلها مفتوحة، وداخل كل لعبة ٣ مستويات بالترتيب (الخادم يتحقق ويعطي نجمتين لأول نجاح في كل مستوى).
// ألعاب الأنبياء تستعمل فقط الأنبياء الظاهرين في رحلة الطفل (يظهرون مع المحاضرات)
export type GameId = "asma" | "akhlaq" | "match" | "order" | "who";
export type GameMeta = { id: GameId; title: string; desc: string; icon: Icon3DName; tone: string; prophets: boolean };
export const GAMES: GameMeta[] = [
  { id: "asma", title: "وصّل الاسم بمعناه", desc: "نتعلّم أسماء ربنا ومعانيها", icon: "sparkles", tone: "from-[#3A2A8F] to-[#120A30]", prophets: false },
  { id: "akhlaq", title: "اسمٌ وخُلُق", desc: "نعمل بمعاني أسماء ربنا في أخلاقنا", icon: "gem", tone: "from-[#1FA37F] to-[#0E6B52]", prophets: false },
  { id: "match", title: "طابِق النبي برمزه", desc: "كل نبي ورمزه في الرحلة", icon: "key", tone: "from-[#7B5CFF] to-[#4B2FD1]", prophets: true },
  { id: "order", title: "رتّب الأنبياء", desc: "مين جه الأول؟", icon: "hourglass", tone: "from-[#F59E0B] to-[#C2410C]", prophets: true },
  { id: "who", title: "مين هو؟", desc: "تلميحات عن نبي… تعرفه؟", icon: "thinking", tone: "from-[#EC4899] to-[#7C3AED]", prophets: true },
];
export const gameMeta = (id: string) => GAMES.find((g) => g.id === id);
export const LEVEL_NEED = [3, 5, 7]; // أنبياء ظاهرون لازمون لكل مستوى
export const MIN_SEC = [8, 12, 16]; // نفس حد الخادم
export const PASS = 60;
const PAIRS = [4, 6, 8];
const WHO_ROUNDS = [3, 4, 5], WHO_OPTIONS = [3, 4, 4];

// مولد عشوائي (Fisher–Yates)
export function shuffle<T>(a: T[]): T[] { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const take = <T,>(a: T[], n: number) => shuffle(a).slice(0, n);

export type Pair = { id: string; left: string; right: string };
type AsmaName = { n: number; plain: string; meaning: string };
type AkhlaqItem = { n: number; plain: string; trait: { boy: string; girl: string }; why: string };
type Clue = { id: string; clues: string[] };
const NAMES = (asma as unknown as { names: AsmaName[] }).names;
const AKH = (akhlaq as unknown as { items: AkhlaqItem[] }).items;
const CLUES = (clues as unknown as { items: Clue[] }).items;

// أسماء معانيها متقاربة لا تجتمع في جولة واحدة (مراجعة الشيخ: حتى لا يُخطَّأ الطفل في معنى يصدق على الاسمين)
const ASMA_FAMILIES = [
  ["الحافظ", "الحفيظ"], ["الخالق", "الخلاق", "البارئ", "المصور"], ["الله", "الإله", "الرب"], ["الأحد", "الواحد", "الوتر", "الصمد"],
  ["الرحمن", "الرحيم", "الرؤوف", "الودود", "الرفيق", "اللطيف"], ["الغفور", "الغفار", "العفو", "التواب"], ["العليم", "الخبير", "العالم", "اللطيف"],
  ["القادر", "القدير", "المقتدر", "القوي", "المتين"], ["الكريم", "الأكرم", "الجواد", "الوهاب", "المعطي", "المنان", "البر", "المحسن"],
  ["العلي", "الأعلى", "المتعالي", "الكبير", "العظيم", "المتكبر"], ["الملك", "المليك", "المالك"], ["الشاكر", "الشكور"],
  ["القاهر", "القهار", "الجبار", "العزيز"], ["الرقيب", "الشهيد", "المهيمن", "الحسيب", "المحيط"], ["المولى", "الولي", "النصير", "الوكيل"],
  ["الرزاق", "المقيت"], ["الحق", "المبين"], ["الحكيم", "الحكم"], ["القدوس", "السبوح", "السلام"], ["القريب", "المجيب"], ["الحميد", "المجيد"],
  ["الحي", "القيوم"], ["الغني", "الواسع"],
];
const AKHLAQ_FAMILIES = [["الرحيم", "الرؤوف", "الرفيق", "الودود"], ["العفو", "الغفور", "الحليم"], ["الكريم", "الجواد", "المحسن", "البر"], ["الطيب", "الرفيق", "الجميل"]];
// اختيار n عناصر عشوائيًا بلا اسمين من «أسرة» واحدة
function pickDistinct<T>(pool: T[], n: number, name: (x: T) => string, families: string[][]): T[] {
  const out: T[] = [];
  for (const x of shuffle(pool)) {
    if (out.length >= n) break;
    const fam = families.filter((f) => f.includes(name(x)));
    if (out.some((y) => fam.some((f) => f.includes(name(y))))) continue;
    out.push(x);
  }
  return out;
}
// المستوى الأول من أسماء مشهورة يعرفها الطفل (اختيار الشيخ)، والباقي من الكل
const POPULAR = ["الله", "الرحمن", "الرحيم", "الملك", "السلام", "الخالق", "الرزاق", "السميع", "البصير", "العليم", "الحكيم", "الكريم", "الغفور", "الودود", "الحي", "القيوم", "الأحد", "الصمد", "القوي", "العزيز", "الحليم", "الشكور", "اللطيف", "الوهاب", "الفتاح", "القريب", "المجيب", "الشافي", "الرفيق", "الحفيظ"];
export function asmaPairs(level: number): Pair[] {
  const pool = level === 1 ? NAMES.filter((x) => POPULAR.includes(x.plain)) : NAMES;
  return pickDistinct(pool, PAIRS[level - 1], (x) => x.plain, ASMA_FAMILIES).map((x) => ({ id: String(x.n), left: x.plain, right: x.meaning }));
}
export function akhlaqPairs(level: number, girl: boolean): Pair[] {
  return pickDistinct(AKH, PAIRS[level - 1], (x) => x.plain, AKHLAQ_FAMILIES).map((x) => ({ id: String(x.n), left: x.plain, right: girl ? x.trait.girl : x.trait.boy }));
}
export const akhlaqWhy = (n: string) => AKH.find((x) => String(x.n) === n)?.why ?? "";

// الأنبياء الظاهرون بالترتيب (لو الجدول فاضي: كل الأنبياء كما تعرضهم الرحلة الاحتياطية)
export function visibleProphets(rows: ProphetRow[] | undefined) {
  const list = rows?.length ? rows : SEED_PROPHETS;
  // short: على الأزرار («سيدنا نوح»، و«سيدنا محمد ﷺ» دائمًا بالصلاة عليه)، honored: مع السلام أو الصلاة كاملة
  return list.map((r) => {
    const name = r.name.replace(/\s*(ﷺ|عليه السلام|عليهما السلام)\s*$/, "").replace(/^سيدنا\s+/, "").trim(), m = r.prophet_id === "muhammad";
    return { id: r.prophet_id, name, short: m ? "سيدنا " + name + " ﷺ" : "سيدنا " + name, honored: m ? "سيدنا " + name + " ﷺ" : name + " عليه السلام" };
  });
}
export type VP = ReturnType<typeof visibleProphets>[number];

// رموز لعبة المطابقة: قائمة مستقلة راجعها الشيخ (من قصة كل نبي في القرآن أو السنة الصحيحة، ومختصة به حتى لا يُخطَّأ الطفل وهو محق).
// رسوم مجسم الرحلة الزخرفية تبقى كما هي ولا يُختبر فيها الطفل.
// خارج اللعبة: ذو الكفل وإلياس واليسع (لا رمز ثابت مختص). إسحاق «بشارة سارة» باعتماد المالك
export const GAME_SYMBOLS: Record<string, { label: string; ref: string }> = {
  adam: { label: "الشجرة", ref: "﴿وَلَا تَقْرَبَا هَٰذِهِ الشَّجَرَةَ﴾ — البقرة ٣٥" },
  idris: { label: "المكان العلي", ref: "﴿وَرَفَعْنَاهُ مَكَانًا عَلِيًّا﴾ — مريم ٥٧" },
  noah: { label: "السفينة", ref: "﴿فَأَنجَيْنَاهُ وَأَصْحَابَ السَّفِينَةِ﴾ — العنكبوت ١٥" },
  hud: { label: "الريح", ref: "﴿بِرِيحٍ صَرْصَرٍ عَاتِيَةٍ﴾ — الحاقة ٦" },
  salih: { label: "الناقة", ref: "﴿نَاقَةَ اللَّهِ وَسُقْيَاهَا﴾ — الشمس ١٣" },
  ibrahim: { label: "النار بردًا وسلامًا", ref: "﴿يَا نَارُ كُونِي بَرْدًا وَسَلَامًا عَلَىٰ إِبْرَاهِيمَ﴾ — الأنبياء ٦٩" },
  lut: { label: "الخروج قبل الصبح", ref: "﴿فَأَسْرِ بِأَهْلِكَ بِقِطْعٍ مِّنَ اللَّيْلِ﴾ — هود ٨١" },
  ismail: { label: "الكبش", ref: "﴿وَفَدَيْنَاهُ بِذِبْحٍ عَظِيمٍ﴾ — الصافات ١٠٧" },
  ishaq: { label: "بشارة سارة", ref: "﴿وَامْرَأَتُهُ قَائِمَةٌ فَضَحِكَتْ فَبَشَّرْنَاهَا بِإِسْحَاقَ﴾ — هود ٧١" },
  yaqub: { label: "عودة البصر", ref: "﴿فَارْتَدَّ بَصِيرًا﴾ — يوسف ٩٦" },
  yusuf: { label: "رؤيا الكواكب", ref: "﴿إِنِّي رَأَيْتُ أَحَدَ عَشَرَ كَوْكَبًا وَالشَّمْسَ وَالْقَمَرَ﴾ — يوسف ٤" },
  ayyub: { label: "عين الماء", ref: "﴿هَٰذَا مُغْتَسَلٌ بَارِدٌ وَشَرَابٌ﴾ — ص ٤٢" },
  shuayb: { label: "الميزان", ref: "﴿فَأَوْفُوا الْكَيْلَ وَالْمِيزَانَ﴾ — الأعراف ٨٥" },
  musa: { label: "العصا", ref: "﴿وَمَا تِلْكَ بِيَمِينِكَ يَا مُوسَىٰ﴾ — طه ١٧" },
  harun: { label: "اللسان الفصيح", ref: "﴿وَأَخِي هَارُونُ هُوَ أَفْصَحُ مِنِّي لِسَانًا﴾ — القصص ٣٤" },
  dawud: { label: "الدرع", ref: "﴿وَعَلَّمْنَاهُ صَنْعَةَ لَبُوسٍ لَّكُمْ﴾ — الأنبياء ٨٠" },
  sulayman: { label: "النملة", ref: "﴿قَالَتْ نَمْلَةٌ يَا أَيُّهَا النَّمْلُ﴾ — النمل ١٨" },
  yunus: { label: "الحوت", ref: "﴿فَالْتَقَمَهُ الْحُوتُ﴾ — الصافات ١٤٢" },
  zakariya: { label: "المحراب", ref: "﴿وَهُوَ قَائِمٌ يُصَلِّي فِي الْمِحْرَابِ﴾ — آل عمران ٣٩" },
  yahya: { label: "خُذِ الكتاب بقوة", ref: "﴿يَا يَحْيَىٰ خُذِ الْكِتَابَ بِقُوَّةٍ﴾ — مريم ١٢" },
  isa: { label: "المائدة", ref: "﴿أَنزِلْ عَلَيْنَا مَائِدَةً مِّنَ السَّمَاءِ﴾ — المائدة ١١٤" },
  muhammad: { label: "القرآن الكريم", ref: "﴿نَزَلَ بِهِ الرُّوحُ الْأَمِينُ * عَلَىٰ قَلْبِكَ﴾ — الشعراء ١٩٣–١٩٤" },
};
export function matchPairs(level: number, vps: VP[]): Pair[] {
  const ok = vps.filter((p) => GAME_SYMBOLS[p.id]);
  return take(ok, Math.min(LEVEL_NEED[level - 1], ok.length)).map((p) => ({ id: p.id, left: p.short, right: GAME_SYMBOLS[p.id].label }));
}
export const symbolRef = (id: string) => GAME_SYMBOLS[id]?.ref ?? "";
// «رتّب الأنبياء» يصحّح فقط ترتيبًا ثابتًا بالدليل أو الاتفاق (مراجعة الشيخ)، برتبة ثابتة هنا لا بترتيب جدول الرحلة.
// خارج اللعبة فقط (لا من الرحلة): إدريس، لوط، أيوب، شعيب، هارون، ذو الكفل، إلياس، اليسع، يونس، يحيى — ترتيبهم مختلف فيه
const ORDER_RANK = ["adam", "noah", "hud", "salih", "ibrahim", "ismail", "ishaq", "yaqub", "yusuf", "musa", "dawud", "sulayman", "zakariya", "isa", "muhammad"];
export const orderSet = (level: number, vps: VP[]) => {
  const ok = vps.filter((p) => ORDER_RANK.includes(p.id)).map((p) => ({ ...p, sort: ORDER_RANK.indexOf(p.id) }));
  return take(ok, Math.min(LEVEL_NEED[level - 1], ok.length));
};

export type WhoRound = { id: string; clues: string[]; options: VP[] };
export function whoRounds(level: number, vps: VP[]): WhoRound[] {
  const withClues = vps.filter((p) => CLUES.some((c) => c.id === p.id));
  return take(withClues, Math.min(WHO_ROUNDS[level - 1], withClues.length)).map((p) => {
    const others = take(vps.filter((x) => x.id !== p.id), WHO_OPTIONS[level - 1] - 1);
    return { id: p.id, clues: CLUES.find((c) => c.id === p.id)!.clues, options: shuffle([p, ...others]) };
  });
}
// النتيجة من ١٠٠: الصحيح مقسوم على (الصحيح + الأخطاء)
export const scoreOf = (right: number, wrong: number) => (right + wrong ? Math.round((100 * right) / (right + wrong)) : 0);

import data from "./prophets-content.json";

// محتوى الأنبياء المراجَع شرعيًا (الشيخ المراجع — prophets-content.json): الرمز الأساسي للرحلة،
// وتسلسل الأشكال التي تتحول بالضغط في صفحة النبي مع جملة ومرجع لكل شكل، والنبذة والمزيد.
// ⚠️ أي تعديل في الملف يحتاج مراجعة شرعية (وما في notes ينتظر رأي والدة م. أحمد).

export type ShapeStep = { shape: string; label: string; caption: string; ref: string };
export type ProphetContent = {
  id: string; name: string;
  // unified: نبي ذكر القرآن اسمه فقط، فله الرمز الموحد دائمًا (قرار والدة م. أحمد)
  symbol: { main: string; label: string; unified?: boolean };
  sequence: ShapeStep[];
  summary: string; more: string[]; refs: string[]; notes?: string;
};

const LIST = (data as { prophets: ProphetContent[] }).prophets;
const BY_ID = new Map(LIST.map((p) => [p.id, p]));

// «العصا» في التسلسل هي العصا وحدها (شكل staff في الرحلة فيه البحر المنشق معها)
const ALIAS: Record<string, string> = { staff: "staff_plain" };

export const prophetContent = (id: string) => BY_ID.get(id);
export const mainSymbol = (id: string) => BY_ID.get(id)?.symbol;
export const shapeSequence = (id: string): ShapeStep[] =>
  (BY_ID.get(id)?.sequence ?? []).map((s) => ({ ...s, shape: ALIAS[s.shape] ?? s.shape }));

// الرموز الأساسية (لاختيار الأدمن في شاشة رحلة الأنبياء)
export const MAIN_SYMBOLS = [...new Map(LIST.map((p) => [p.symbol.main, { value: p.symbol.main, label: p.symbol.label }])).values()];

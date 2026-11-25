"use client";
import { ReleaseBoard } from "@/components/teacher/release-board";
import { HADITH_ORDER, hadithById } from "@/lib/eight";

// فتح الأحاديث القصيرة للحفظ (الأدمن)؛ تسجيل الحفظ لكل طفل من صفحة «حفظ الطلاب»
const ITEMS = HADITH_ORDER.map(hadithById).filter((h): h is NonNullable<typeof h> => !!h).map((h) => ({ id: h.id, title: h.title, text: h.text, sub: h.ref }));
export default function Page() {
  return <ReleaseBoard kind="hadith" items={ITEMS} icon="books" title="أحاديث الأطفال" hint="افتحي الحديث لفصل ليظهر لأطفاله مع شرحه البسيط. ولما يحفظه الطفل سجّليه من صفحة «حفظ الطلاب» (نجمتان)." />;
}

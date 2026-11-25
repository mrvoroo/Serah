"use client";
import { ReleaseBoard } from "@/components/teacher/release-board";
import { DUA_ORDER, duaById } from "@/lib/eight";

// فتح أدعية اليوم والليلة للأطفال (الأدمن) بالترتيب المقترح (الأقصر والأكثر تكرارًا أولًا)
const ITEMS = DUA_ORDER.map(duaById).filter((d): d is NonNullable<typeof d> => !!d).map((d) => ({ id: d.id, title: `${d.icon} ${d.title}`, text: d.text, sub: d.grade }));
export default function Page() {
  return <ReleaseBoard kind="dua" items={ITEMS} icon="moon" title="أدعية الأطفال" hint="اضغطي على الفصل تحت الدعاء ليظهر لأطفاله (ويصلهم إشعار)، واضغطي مرة ثانية لإخفائه. الطفل يكسب نجمة كل يوم يمر فيه على أدعيته." />;
}

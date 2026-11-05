import { Fragment } from "react";
import { religiousSegments } from "@/lib/religious-text";

// نص فيه آيات وأسماء سور: الآيات (بين ﴿ ﴾) بخط المصحف بالتشكيل، وأسماء السور بخط الرقعة
export function RT({ text }: { text?: string | null }) {
  if (!text) return null;
  const segs = religiousSegments(String(text));
  if (segs.length === 1 && segs[0].t === "text") return <>{segs[0].v}</>;
  return (
    <>
      {segs.map((s, i) => s.t === "ayah" ? <span key={i} className="ayah-text" data-ayah-text="">{s.v}</span>
        : s.t === "surah" ? <span key={i} className="surah-name" data-surah="">{s.v}</span>
        : <Fragment key={i}>{s.v}</Fragment>)}
    </>
  );
}

// اسم سورة منفرد (عنوان المصحف مثلًا)
export function SurahName({ name, className }: { name: string; className?: string }) {
  return <span className={`surah-name ${className ?? ""}`.trim()} data-surah="">{name}</span>;
}

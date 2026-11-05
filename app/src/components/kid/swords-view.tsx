"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, ChevronDown } from "lucide-react";
import data from "@/content/swords.json";
import { SymbolStage } from "@/components/prophet/symbol-stage";
import { cn } from "@/lib/utils";
import { RT } from "@/components/religious-text";

// سيوف النبي ﷺ (مراجَعة شرعيًا — content/swords.json): رسم تقريبي على صفة السيف العربي في ذلك الزمان مع تنبيه للطفل،
// ثم بطاقة لكل سيف بما ثبت عنه ودرجته ومراجعه. لم يثبت وصف دقيق لشكل أي سيف، ولم يثبت أن طرف ذي الفقار مشقوق أو مائل.
type Sword = { id: string; name: string; facts: string[]; refs: string[]; grade: string };
type Fact = { text: string; ref: string; grade: string };
const D = data as unknown as { note: string; swords: Sword[]; generalFacts?: Fact[] };
// للطفل: الثابت فقط (صحيح/حسن)؛ الضعيف في الملف تنبيه لنا حتى لا يُستعمل
const SOUND = (D.generalFacts ?? []).filter((f) => /^(صحيح|حسن)/.test(f.grade));

const STEPS = [
  { shape: "dhulfiqar", label: "ذو الفقار", caption: "فيه حُفَر صغار متتابعة في متن النصل، ومنها جاء اسمه.", ref: "النهاية لابن الأثير؛ سنن الترمذي ١٥٦١" },
  { shape: "arab_sword", label: "قبيعة من فضة", caption: "وكانت قبيعة سيف رسول الله ﷺ من فضة.", ref: "سنن أبي داود ٢٥٨٣" },
];

function SwordCard({ s }: { s: Sword }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-[24px] border bg-card p-4 shadow-soft">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-start">
        <span className="font-heading text-xl font-extrabold">{s.name}</span>
        <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <ul className="mt-2 flex flex-col gap-2">
        {(open ? s.facts : s.facts.slice(0, 1)).map((f, k) => (
          <li key={k} className="flex gap-2 text-base leading-8"><span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-gold" /><span><RT text={f} /></span></li>
        ))}
      </ul>
      {open && (
        <div className="mt-3 flex flex-col gap-1 text-xs leading-6 text-muted-foreground">
          <p><b>درجة الخبر:</b> {s.grade}</p>
          <p><b>المراجع:</b> {s.refs.map((r, i) => <span key={i}>{i > 0 && " · "}<RT text={r} /></span>)}</p>
        </div>
      )}
    </li>
  );
}

export function SwordsView() {
  return (
    <div className="flex flex-col gap-4 pb-28">
      <Link href="/kid/journey/" className="flex w-fit items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
        <ArrowRight className="size-4" /> رجوع للرحلة
      </Link>
      <header className="rounded-[32px] bg-hero p-6 text-white shadow-soft">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">من السيرة النبوية</span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">سيوف النبي ﷺ</h1>
        <p className="mt-3 text-base leading-8 text-white/85">ذكر العلماء في كتب السيرة أسماء سيوف كانت للنبي ﷺ، أشهرها «ذو الفقار».</p>
      </header>
      <SymbolStage steps={STEPS} title="رسم سيف ذي الفقار" />
      <p role="note" className="flex gap-2 rounded-[24px] border border-gold/40 bg-gold/10 p-4 text-sm font-bold leading-7">
        <Info className="mt-1 size-5 shrink-0 text-gold" /> {D.note}
      </p>
      {SOUND.length ? (
        <section aria-labelledby="sw-facts" className="rounded-[28px] border bg-card p-5 shadow-soft">
          <h2 id="sw-facts" className="mb-3 font-heading text-xl font-extrabold">ما ثبت في الأحاديث</h2>
          <ul className="flex flex-col gap-3">
            {SOUND.map((f, k) => (
              <li key={k} className="text-base leading-8"><RT text={f.text} /><span className="block text-xs text-muted-foreground"><RT text={f.ref} /> — {f.grade}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="sw-list">
        <h2 id="sw-list" className="mb-3 font-heading text-xl font-extrabold">أسماء سيوفه ﷺ ({D.swords.length.toLocaleString("ar-EG")})</h2>
        <ul className="grid gap-3 sm:grid-cols-2">{D.swords.map((s) => <SwordCard key={s.id} s={s} />)}</ul>
      </section>
    </div>
  );
}

"use client";
import { useState } from "react";
import { BookOpenText, ChevronDown } from "lucide-react";
import type { ProphetContent } from "@/content/prophets";
import { cn } from "@/lib/utils";
import { RT } from "@/components/religious-text";

// نبذة عن النبي (مراجَعة شرعيًا): فقرة قصيرة ثم «اقرأ المزيد» للنقاط التفصيلية والمراجع
export function ProphetBio({ content }: { content: ProphetContent }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="bio-title" className="rounded-[28px] border bg-card p-5 shadow-soft">
      <h2 id="bio-title" className="mb-3 flex items-center gap-2 font-heading text-xl font-extrabold"><BookOpenText className="size-5 text-gold" /> تعرّف على سيدنا {content.name}</h2>
      <p className="text-base leading-8"><RT text={content.summary} /></p>
      {open && (
        <div id="bio-more" className="mt-4 flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {content.more.map((m, k) => (
              <li key={k} className="flex gap-3 text-base leading-8">
                <span aria-hidden className="mt-3 size-2 shrink-0 rounded-full bg-gold" />
                <span><RT text={m} /></span>
              </li>
            ))}
          </ul>
          {content.refs.length > 0 && <p className="text-xs leading-6 text-muted-foreground">المراجع: {content.refs.map((r, i) => <span key={i}>{i > 0 && " · "}<RT text={r} /></span>)}</p>}
        </div>
      )}
      {content.more.length > 0 && (
        <button type="button" aria-expanded={open} aria-controls="bio-more" onClick={() => setOpen((v) => !v)}
          className="mt-4 flex h-11 items-center gap-1 rounded-full bg-secondary px-5 text-sm font-bold">
          {open ? "إخفاء" : "اقرأ المزيد"} <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      )}
    </section>
  );
}

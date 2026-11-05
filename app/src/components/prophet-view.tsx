"use client";
import Link from "next/link";
import { Headphones, PlayCircle } from "lucide-react";
import { driveImage, type Lecture } from "@/lib/api";
import { AudioPlayer } from "@/components/audio-player";
import type { ContentItem, ProphetRow } from "@/lib/prophets";
import { prophetContent, shapeSequence } from "@/content/prophets";
import { SymbolStage } from "@/components/prophet/symbol-stage";
import { ProphetBio } from "@/components/prophet/prophet-bio";
import { ImageGallery } from "@/components/prophet/image-gallery";
import { cn } from "@/lib/utils";
import { RT } from "@/components/religious-text";

// صفحة النبي: البطاقة الرئيسية، ثم الرمز التفاعلي والنبذة (من المحتوى المراجَع)، ثم العناصر بالترتيب
// (نص، صوت، فيديوهات يوتيوب، والصور مجمّعة في معرض صغير مكان أول صورة) ثم المحاضرات عنه
// تُستخدم في صفحة الطفل وفي «معاينة كطفل» عند الأدمن

export function YouTube({ id, title }: { id: string; title?: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`}
        title={title || "فيديو"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}

function Item({ it }: { it: ContentItem }) {
  return (
    <section data-testid="prophet-item" data-kind={it.kind} className={cn("rounded-[28px] border bg-card p-4 shadow-soft", (!it.approved || !it.visible) && "border-dashed")}>
      {it.title && <h2 className="mb-3 font-heading text-xl font-extrabold">{it.title}</h2>}
      {it.kind === "text" && <p className="whitespace-pre-line text-base leading-8 text-muted-foreground"><RT text={it.body} /></p>}
      {it.kind === "audio" && <AudioPlayer id={it.file_id} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {it.kind === "image" && <img src={driveImage(it.file_id)} alt={it.title || "صورة"} loading="lazy" className="w-full rounded-2xl object-cover" />}
      {it.kind === "youtube" && <YouTube id={it.url} title={it.title} />}
      {it.body && it.kind !== "text" && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground"><RT text={it.body} /></p>}
    </section>
  );
}

// lectureHref: رابط المحاضرة (الطفل يفتح مشغّله، والمعلمة صفحة المحاضرات عندها)
export function ProphetView({ prophet, items, lectures, lectureHref = (id) => `/kid/lecture/?id=${id}` }: { prophet: ProphetRow; items: ContentItem[]; lectures?: Lecture[]; lectureHref?: (id: string) => string }) {
  const name = prophet.name.replace(/\s*(ﷺ|عليه السلام)\s*$/, "");
  // اللقب الواجب بعد الاسم: «ﷺ» لنبينا محمد، و«عليه السلام» لباقي الأنبياء
  const honored = `${name} ${prophet.prophet_id === "muhammad" ? "ﷺ" : "عليه السلام"}`;
  const related = (lectures ?? []).filter((l) => l.prophet_id === prophet.prophet_id || String(l.title).includes(name));
  const content = prophetContent(prophet.prophet_id);
  const steps = shapeSequence(prophet.prophet_id);
  const images = items.filter((it) => it.kind === "image");
  const firstImage = images[0]?.item_id;
  return (
    <div className="flex flex-col gap-4">
      <header className="relative overflow-hidden rounded-[32px] bg-hero p-6 text-white shadow-soft">
        {prophet.symbol_name && <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{prophet.symbol_name}</span>}
        <h1 className="mt-2 font-heading text-3xl font-extrabold leading-tight md:text-4xl">{prophet.title || `سيدنا ${honored}`}</h1>
        <p className="mt-3 text-base leading-8 text-white/85"><RT text={prophet.text} /></p>
      </header>

      {steps.length > 0 && <SymbolStage steps={steps} title={`رمز سيدنا ${honored}`} />}
      {content && <ProphetBio content={content} />}

      {items.map((it) => it.kind !== "image" ? <Item key={it.item_id} it={it} />
        : it.item_id === firstImage ? <ImageGallery key="gallery" images={images.map((x) => ({ id: x.item_id, file_id: x.file_id, title: x.title, body: x.body }))} /> : null)}
      {items.length === 0 && !content && (
        <p className="rounded-[28px] border bg-card p-6 text-center text-muted-foreground">قريبًا محتوى جديد عن سيدنا {honored} ✨</p>
      )}

      {related.length > 0 && (
        <section className="rounded-[28px] border bg-card p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-extrabold"><Headphones className="size-5 text-gold" /> محاضرات عن سيدنا {honored}</h2>
          <ul className="grid gap-2">
            {related.map((l) => (
              <li key={l.lecture_id}>
                <Link href={lectureHref(l.lecture_id)} className="flex items-center gap-3 rounded-2xl bg-secondary p-3 font-bold text-secondary-foreground">
                  <PlayCircle className="size-6 shrink-0 text-gold" /> <span className="truncate">{l.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

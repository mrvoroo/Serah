"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { driveImage } from "@/lib/api";
import { arNum } from "@/lib/quran";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RT } from "@/components/religious-text";

// معرض صور صغير: بطاقات صغيرة مائلة تُسحب أفقيًا (لا تأخذ الشاشة)، والضغط يفتح الصورة كبيرة مع التالي والسابق
// (على نمط بطاقات Aceternity القابلة للتوسيع)
export type GalleryImage = { id: string; file_id: string; title: string; body?: string };
const TILT = [-4, 3, -2, 4, -3, 2];

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const cur = open === null ? null : images[open];
  const move = (d: number) => setOpen((o) => (o === null ? o : (o + d + images.length) % images.length));
  return (
    <section aria-labelledby="gallery-title" className="rounded-[28px] border bg-card p-4 shadow-soft">
      <h2 id="gallery-title" className="mb-3 flex items-center gap-2 font-heading text-xl font-extrabold"><Images className="size-5 text-gold" /> صور ({arNum(images.length)})</h2>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3 pt-2 [scrollbar-width:thin]">
        {images.map((im, k) => (
          <li key={im.id} className="shrink-0 snap-start">
            <motion.button type="button" onClick={() => setOpen(k)} aria-label={`افتح الصورة: ${im.title || arNum(k + 1)}`}
              initial={{ rotate: TILT[k % TILT.length] }} whileHover={{ rotate: 0, y: -6, scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="block w-32 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-soft dark:border-white/90 sm:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={driveImage(im.file_id, 400)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              {im.title && <span className="block truncate px-2 py-1 text-xs font-bold text-[#2a1f63]">{im.title}</span>}
            </motion.button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="rounded-[28px] p-3 sm:max-w-2xl">
          {cur && (
            <div className="flex flex-col gap-3">
              <DialogTitle className="pe-8 font-heading text-lg font-extrabold">{cur.title || `صورة ${arNum((open ?? 0) + 1)}`}</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={driveImage(cur.file_id)} alt={cur.title || "صورة"} className="max-h-[65vh] w-full rounded-2xl bg-secondary object-contain" />
              {cur.body && <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground"><RT text={cur.body} /></p>}
              {images.length > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => move(-1)} aria-label="الصورة السابقة" className="grid size-11 place-items-center rounded-full bg-secondary"><ChevronRight className="size-5" /></button>
                  <span className="text-sm font-bold text-muted-foreground">{arNum((open ?? 0) + 1)} / {arNum(images.length)}</span>
                  <button type="button" onClick={() => move(1)} aria-label="الصورة التالية" className="grid size-11 place-items-center rounded-full bg-secondary"><ChevronLeft className="size-5" /></button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

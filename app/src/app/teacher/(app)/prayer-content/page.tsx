"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, BadgeCheck, Clock, Loader2, Pencil, Plus, SquarePlay, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { YouTube } from "@/components/prophet-view";
import { SalahGuide } from "@/components/kid/prayer/salah-guide";
import { RT } from "@/components/religious-text";
import { Icon3D } from "@/components/icon3d";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { times, VIDEO_SLOTS, ytId, type ExtraZikr, type SalahExtras } from "@/lib/salah-extras";
import { cn } from "@/lib/utils";

// صفحة الأدمن: روابط فيديوهات يوتيوب في قسم الصلاة، وأذكار إضافية تظهر للأطفال بعد الأذكار الأصلية
// الأذكار الأصلية (المراجَعة من الشيخ) ثابتة ولا تُعدَّل من هنا
const ar = (n: number) => n.toLocaleString("ar-EG");
const TABS = [{ id: "videos", label: "الفيديوهات" }, { id: "azkar", label: "أذكار إضافية" }, { id: "preview", label: "معاينة كطفل" }] as const;
type Tab = (typeof TABS)[number]["id"];
type VideoForm = { key: string; title: string; url: string; had: boolean };
type ZikrForm = { zikr_id?: string; text: string; count: string; ref: string; virtue: string; grade: string; visible: boolean; confirmed: boolean };
const blank: ZikrForm = { text: "", count: "1", ref: "", virtue: "", grade: "", visible: true, confirmed: false };
const GRADES = ["صحيح", "حسن"] as const;
const HARAKAT = /[ً-ْ]/;
const latinDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[^0-9]/g, "").slice(0, 3);

export default function PrayerContentPage() {
  const me = useRequireRole(["admin", "superadmin"]);
  const { data, error, reload } = useApi<SalahExtras>("salahExtras", { all: true }, { enabled: !!me });
  const [tab, setTab] = useState<Tab>("videos");
  const [busy, setBusy] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoForm | null>(null);
  const [zikr, setZikr] = useState<ZikrForm | null>(null);
  const azkar = data?.azkar ?? [];

  // بعد أي حفظ: نحدّث هذه الصفحة وقسم الصلاة عند الأطفال في نفس الجهاز
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); invalidate("salahExtras"); await reload(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(null); }
  };
  const saveVideo = async (clear = false) => {
    if (!video) return;
    const ok = await run("video", () => api("saveSalahVideo", { key: video.key, url: clear ? "" : video.url.trim() }), clear ? "تم حذف الفيديو" : "تم حفظ الفيديو");
    if (ok) setVideo(null);
  };
  const saveZikr = async () => {
    if (!zikr) return;
    const ok = await run("zikr", () => api("saveExtraZikr", { ...zikr, count: Number(zikr.count) }), zikr.zikr_id ? "تم حفظ التعديل" : "تمت إضافة الذكر");
    if (ok) setZikr(null);
  };
  const move = (i: number, to: number) => {
    if (to < 0 || to >= azkar.length) return;
    const ids = azkar.map((z) => z.zikr_id); const [x] = ids.splice(i, 1); ids.splice(to, 0, x);
    run("order", () => api("reorderExtraAzkar", { ids }), "تم حفظ الترتيب");
  };
  const edit = (z: ExtraZikr) => setZikr({ zikr_id: z.zikr_id, text: z.text, count: String(z.count), ref: z.ref, virtue: z.virtue, grade: z.grade, visible: z.visible, confirmed: false });
  // الاعتماد: المطوّر، أو أدمن غير التي أضافته أو عدّلته آخر مرة
  const canApprove = (z: ExtraZikr) => me?.role === "superadmin" || (z.created_by !== me?.user_id && z.updated_by !== me?.user_id);
  const pending = azkar.filter((z) => !z.approved).length;

  const vId = video ? ytId(video.url) : "";
  const count = Number(zikr?.count);
  // سبب تعطيل «حفظ» يظهر للمعلمة بدل زر رمادي بلا تفسير
  const zikrWhy = !zikr ? "" : !zikr.text.trim() ? "اكتبي نص الذكر" : !(Number.isInteger(count) && count >= 1 && count <= 100) ? "العدد من ١ إلى ١٠٠"
    : !(zikr.ref.trim().length >= 4 && /[0-9٠-٩]/.test(zikr.ref)) ? "اكتبي المصدر كاملًا: اسم الكتاب ورقم الحديث" : !zikr.grade ? "اختاري درجة الحديث" : !zikr.confirmed ? "علّمي على خانة التأكيد" : "";
  const zikrOk = !!zikr && !zikrWhy;
  const dirty = !!zikr && (zikr.zikr_id ? zikr.confirmed : !!(zikr.text.trim() || zikr.ref.trim() || zikr.virtue.trim()));

  if (!me) return null;
  if (error && !data) return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] border bg-card p-6 text-center text-muted-foreground">
      <p>{error}</p><Button variant="secondary" size="lg2" onClick={reload}>إعادة المحاولة</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Icon3D name="mosque" size={48} float />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-extrabold">محتوى الصلاة</h1>
          <p className="text-sm text-muted-foreground">فيديوهات يوتيوب وأذكار إضافية تظهر للأطفال في صفحة الصلاة. أذكار ما بعد الصلاة الأصلية مراجَعة شرعيًا ولا تُعدَّل من هنا.</p>
        </div>
      </div>
      <div role="tablist" aria-label="أقسام محتوى الصلاة" className="flex w-fit max-w-full flex-wrap gap-1 rounded-2xl bg-secondary p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("h-10 rounded-xl px-3 text-sm font-bold sm:px-4", tab === t.id ? "bg-hero text-white" : "text-secondary-foreground")}>{t.label}</button>
        ))}
      </div>

      {!data && tab !== "preview" && <div className="grid gap-3"><Skeleton className="h-20 rounded-[24px]" /><Skeleton className="h-20 rounded-[24px]" /></div>}

      {data && tab === "videos" && (
        <div className="flex flex-col gap-4">
          {(["videos", "howTo"] as const).map((g) => (
            <section key={g} className="flex flex-col gap-2" aria-labelledby={`vg-${g}`}>
              <h2 id={`vg-${g}`} className="font-heading text-lg font-extrabold">{g === "videos" ? "فيديوهات عامة" : "خطوات كيفية الصلاة"}</h2>
              <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {VIDEO_SLOTS.filter((s) => s.group === g).map((s) => {
                  const cur = data.videos[s.key] || ytId(s.builtIn);
                  return (
                    <li key={s.key} data-testid="video-slot" className="flex items-center gap-3 rounded-[24px] border bg-card p-3 shadow-soft">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", cur ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-secondary text-muted-foreground")}><SquarePlay className="size-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-bold leading-6">{s.title}</p>
                        <p className="truncate text-xs text-muted-foreground" dir={cur ? "ltr" : undefined}>{cur ? `youtu.be/${cur}` : "لا يوجد فيديو"}</p>
                      </div>
                      <Button variant={cur ? "secondary" : "hero"} size="lg2" className="px-3 sm:px-5" aria-label={`${cur ? "تغيير" : "إضافة"} فيديو ${s.title}`}
                        onClick={() => setVideo({ key: s.key, title: s.title, url: cur ? `https://youtu.be/${cur}` : "", had: !!data.videos[s.key] })}>
                        {cur ? <Pencil /> : <Plus />} {cur ? "تغيير" : "إضافة"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {data && tab === "azkar" && (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-gold/10 p-3 text-sm leading-7">أضيفي فقط ذكرًا ثابتًا (صحيحًا أو حسنًا)، واكتبيه بالتشكيل كما ورد بلا زيادة ولا نقص، مع مصدره (الكتاب ورقم الحديث). اجعلي العدد كما ورد في الحديث، أضيفي فقط ذكرًا ورد بعد كل صلاة مكتوبة؛ أمّا ما ورد بعد صلاة معيّنة (كالفجر أو المغرب وحدهما) فلا تضيفيه هنا، لأنه سيظهر بعد كل الصلوات. لا تكرري ذكرًا موجودًا في الأذكار الأصلية. يظهر للأطفال في قسم مستقل بعد أذكار الصلاة مع علامة «اختارته المعلمة».</p>
          <p className="rounded-2xl bg-secondary/60 p-3 text-sm leading-7">الذكر الجديد أو المعدَّل يبقى مخفيًا عن الأطفال حتى يعتمده المطوّر أو أدمن أخرى (غير التي أضافته أو عدّلته)، ويصلهم إشعار بمراجعته.</p>
          {pending > 0 && <p role="status" className="font-bold text-amber-700 dark:text-amber-400">{pending === 1 ? "ذكر واحد ينتظر" : `${ar(pending)} أذكار تنتظر`} الاعتماد</p>}
          <Button variant="hero" size="lg2" className="w-fit" onClick={() => setZikr({ ...blank })}><Plus /> إضافة ذكر</Button>
          <ol className="grid grid-cols-1 gap-2">
            {azkar.map((z, i) => (
              <li key={z.zikr_id} data-testid="extra-zikr" className={cn("flex flex-col gap-2 rounded-[24px] border bg-card p-4 shadow-soft", !z.visible && "border-dashed bg-muted/40")}>
                <p className="line-clamp-3 text-lg leading-[2]"><RT text={z.text} /></p>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                  <span className="rounded-full bg-secondary px-2 py-1">{times(z.count)}</span>
                  {z.approved
                    ? <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-400"><BadgeCheck className="size-3.5" /> معتمد</span>
                    : <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-1 text-[#7A4D00] dark:text-gold"><Clock className="size-3.5" /> ينتظر الاعتماد</span>}
                  <span className="min-w-0 truncate">{z.ref}{z.grade && ` — ${z.grade}`}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="flex items-center gap-2 text-sm font-bold">
                    <Switch checked={z.visible} disabled={!!busy} aria-label={`ظاهر للأطفال: الذكر ${ar(i + 1)}`}
                      onCheckedChange={(v) => run(z.zikr_id, () => api("setExtraZikrVisible", { zikr_id: z.zikr_id, visible: v }), v ? "ظاهر للأطفال" : "تم الإخفاء")} />
                    {!z.visible ? "مخفي عن الأطفال" : z.approved ? "ظاهر للأطفال" : "يظهر بعد الاعتماد"}
                  </Label>
                  {canApprove(z) ? (
                    <Button variant={z.approved ? "secondary" : "hero"} size="lg2" disabled={!!busy} aria-label={`${z.approved ? "إلغاء اعتماد" : "اعتماد"} الذكر ${ar(i + 1)}`}
                      onClick={() => run(z.zikr_id, () => api("approveExtraZikr", { zikr_id: z.zikr_id, approved: !z.approved, seen: z.updated_at ?? "" }), z.approved ? "تم إلغاء الاعتماد" : "تم الاعتماد — يظهر للأطفال")}>
                      {z.approved ? "إلغاء الاعتماد" : <><BadgeCheck /> اعتماد</>}
                    </Button>
                  ) : !z.approved && <span className="text-xs text-muted-foreground">يعتمده المطوّر أو أدمن أخرى</span>}
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon-xl" aria-label={`نقل الذكر ${ar(i + 1)} لأعلى`} disabled={i === 0 || !!busy} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
                    <Button variant="ghost" size="icon-xl" aria-label={`نقل الذكر ${ar(i + 1)} لأسفل`} disabled={i === azkar.length - 1 || !!busy} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
                    <Button variant="ghost" size="icon-xl" aria-label={`تعديل الذكر ${ar(i + 1)}`} disabled={!!busy} onClick={() => edit(z)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-xl" aria-label={`حذف الذكر ${ar(i + 1)}`} disabled={!!busy}
                      onClick={() => window.confirm("حذف هذا الذكر؟") && run(z.zikr_id, () => api("deleteExtraZikr", { zikr_id: z.zikr_id }), "تم الحذف")}><Trash2 /></Button>
                  </div>
                </div>
              </li>
            ))}
            {azkar.length === 0 && <p className="rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد أذكار إضافية بعد.</p>}
          </ol>
        </div>
      )}

      {tab === "preview" && <div className="rounded-[28px] border bg-background p-3 sm:p-5"><SalahGuide /></div>}

      <Dialog open={!!video} onOpenChange={(o) => !o && !busy && setVideo(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader><DialogTitle>فيديو «{video?.title}»</DialogTitle><DialogDescription className="leading-7">اختاري فيديو من مصدر موثوق على منهج أهل السنة، بلا موسيقى، وبهيئة محتشمة، وشاهديه كاملًا قبل الحفظ. ثم انسخي رابطه من يوتيوب والصقيه هنا.</DialogDescription></DialogHeader>
          {video && (
            <form id="video-form" className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (vId && !busy) saveVideo(); }}>
              <Label htmlFor="v-url">رابط الفيديو</Label>
              <Input id="v-url" dir="ltr" value={video.url} onChange={(e) => setVideo({ ...video, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              {video.url.trim() && !vId && <p className="text-sm text-destructive">الرابط غير صحيح — انسخي رابط الفيديو من يوتيوب</p>}
              {vId && <YouTube id={vId} title={video.title} />}
            </form>
          )}
          <DialogFooter className="gap-2">
            {video?.had && <Button variant="secondary" size="lg2" disabled={!!busy} onClick={() => window.confirm("حذف الفيديو من هذا المكان؟") && saveVideo(true)}><Trash2 /> حذف الفيديو</Button>}
            <Button type="submit" form="video-form" variant="hero" size="lg2" disabled={!vId || !!busy}>{busy === "video" && <Loader2 className="animate-spin" />} حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!zikr} onOpenChange={(o) => !o && !busy && (!dirty || window.confirm("إغلاق بدون حفظ؟")) && setZikr(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] sm:max-w-lg">
          <DialogHeader><DialogTitle>{zikr?.zikr_id ? "تعديل ذكر" : "إضافة ذكر"}</DialogTitle><DialogDescription>يجب ذكر مصدر كل ذكر ودرجته</DialogDescription></DialogHeader>
          {zikr && (
            <form id="zikr-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (zikrOk && !busy) saveZikr(); }}>
              <div className="grid gap-1.5"><Label htmlFor="z-text">نص الذكر (بالتشكيل)</Label><Textarea id="z-text" rows={4} className="text-lg leading-[2]" value={zikr.text} maxLength={1500} onChange={(e) => setZikr({ ...zikr, text: e.target.value })} />
                {zikr.text.trim() && !HARAKAT.test(zikr.text) && <p className="text-sm text-amber-700 dark:text-amber-400">النص بلا تشكيل — شكّلي الذكر حتى يقرأه الأطفال صحيحًا</p>}</div>
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <div className="grid gap-1.5"><Label htmlFor="z-count">العدد</Label><Input id="z-count" type="text" inputMode="numeric" dir="ltr" className="text-center" value={zikr.count} onChange={(e) => setZikr({ ...zikr, count: latinDigits(e.target.value) })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="z-ref">المصدر</Label><Input id="z-ref" value={zikr.ref} maxLength={200} placeholder="مثل: صحيح مسلم ٥٩١" onChange={(e) => setZikr({ ...zikr, ref: e.target.value })} /></div>
              </div>
              <div role="radiogroup" aria-label="درجة الحديث" className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">درجة الحديث:</span>
                {GRADES.map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={zikr.grade === g} onClick={() => setZikr({ ...zikr, grade: g })}
                    className={cn("h-10 rounded-2xl px-4 text-sm font-bold transition", zikr.grade === g ? "bg-hero text-white shadow-soft" : "bg-secondary text-secondary-foreground")}>{g}</button>
                ))}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="z-virtue">فضله كما ورد في الحديث (اختياري)</Label>
                <Textarea id="z-virtue" rows={2} value={zikr.virtue} maxLength={800} aria-describedby="z-virtue-hint" onChange={(e) => setZikr({ ...zikr, virtue: e.target.value })} />
                <p id="z-virtue-hint" className="text-xs text-muted-foreground">لا تكتبي فضلًا إلا من حديث ثابت، واذكري مصدره إن كان من حديث آخر.</p>
              </div>
              <Label className="flex items-center gap-2 text-sm font-bold"><Switch checked={zikr.visible} onCheckedChange={(v) => setZikr({ ...zikr, visible: v })} aria-label="ظاهر للأطفال" /> ظاهر للأطفال</Label>
              <label className="flex items-start gap-2 rounded-2xl bg-gold/10 p-3 text-sm font-bold leading-7">
                <input type="checkbox" className="mt-1.5 size-4 shrink-0 accent-primary" checked={zikr.confirmed} onChange={(e) => setZikr({ ...zikr, confirmed: e.target.checked })} />
                تأكدتُ أن الذكر ثابت (صحيح أو حسن)، وأن نصه وعدده وفضله كما وردت في المصدر.
              </label>
            </form>
          )}
          <DialogFooter className="items-center gap-2">
            {zikrWhy && <p role="status" className="text-sm text-muted-foreground">{zikrWhy}</p>}
            <Button type="submit" form="zikr-form" variant="hero" size="lg2" disabled={!zikrOk || !!busy}>{busy === "zikr" && <Loader2 className="animate-spin" />} حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

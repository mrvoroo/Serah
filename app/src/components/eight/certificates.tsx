"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Award, Printer } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { type Cert, type Certs } from "@/lib/eight";
import { cn } from "@/lib/utils";

// الشهادات: قائمة الشهادات المستحقة (من الخادم)، وفتح الشهادة بتصميم للطباعة (A4 أفقي) — زخرفة هندسية ونجوم فقط
const KIND: Record<Cert["kind"], { label: string; icon: string }> = { surah: { label: "حفظ سورة", icon: "📗" }, juz: { label: "حفظ جزء", icon: "🏆" }, stage: { label: "مرحلة من الرحلة", icon: "🚀" } };
const fmtLong = (d: string) => { try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); } catch { return d.slice(0, 10); } };

function Star8({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return <g transform={`translate(${x} ${y})`}><rect x={-r} y={-r} width={r * 2} height={r * 2} fill={fill} /><rect x={-r} y={-r} width={r * 2} height={r * 2} fill={fill} transform="rotate(45)" /></g>;
}

export function CertificateView({ data, cert }: { data: Certs; cert: Cert }) {
  const f = data.kid.gender === "f";
  const [head, tail] = cert.title.split(":");
  const what = cert.kind === "stage" ? <>{f ? "قد أتمّت" : "قد أتمّ"} <b>{head}</b> من رحلة الأنبياء{tail ? <>:<br /><b>{tail.trim()}</b></> : null}</>
    : <>{f ? "قد أتمّت حفظ" : "قد أتمّ حفظ"} <b className="surah-name text-[1.4em]">{cert.title}</b></>;
  return (
    <div data-testid="certificate" style={{ containerType: "inline-size" }} className="cert-print relative mx-auto aspect-[297/210] w-full max-w-4xl overflow-hidden rounded-[18px] bg-[#FFFDF6] text-[#3A2A10] shadow-soft print:rounded-none print:shadow-none" dir="rtl">
      <svg viewBox="0 0 297 210" className="absolute inset-0 size-full" aria-hidden preserveAspectRatio="none">
        <rect x="6" y="6" width="285" height="198" fill="none" stroke="#B88A2B" strokeWidth="1.6" />
        <rect x="10" y="10" width="277" height="190" fill="none" stroke="#1E7A5E" strokeWidth=".6" />
        {[[14, 14], [283, 14], [14, 196], [283, 196]].map(([x, y], i) => <Star8 key={i} x={x} y={y} r={5} fill="#B88A2B" />)}
        {Array.from({ length: 13 }, (_, i) => <Star8 key={"t" + i} x={34 + i * 19} y={10} r={1.4} fill="#1E7A5E" />)}
        {Array.from({ length: 13 }, (_, i) => <Star8 key={"b" + i} x={34 + i * 19} y={200} r={1.4} fill="#1E7A5E" />)}
      </svg>
      <div className="absolute inset-[8%] flex flex-col items-center justify-center gap-[1.6%] text-center leading-snug" style={{ fontSize: "1.9cqw" }}>
        <p className="font-heading text-[0.9em] font-bold tracking-wide text-[#1E7A5E]">بسم الله الرحمن الرحيم</p>
        <p className="font-heading text-[2.4em] font-extrabold leading-tight text-[#8A5E10]">شهادة تقدير</p>
        <p className="text-[1em]">{f ? "تشهد منصة المُنْتَهَى بأن الطالبة" : "تشهد منصة المُنْتَهَى بأن الطالب"}</p>
        <p className="font-heading text-[2em] font-extrabold text-[#1E7A5E]">{data.kid.name}</p>
        {data.kid.class_name && <p className="text-[0.85em] opacity-80">{data.kid.class_name}</p>}
        <p className="text-[1.15em] leading-[1.9]">{what}</p>
        <p className="text-[0.95em]">{cert.kind === "stage" ? (f ? "بارك الله فيها، ونفعها بقصص الأنبياء عليهم السلام، وجعلها من الصالحين" : "بارك الله فيه، ونفعه بقصص الأنبياء عليهم السلام، وجعله من الصالحين") : f ? "بارك الله فيها، ونفع بها، وجعلها من أهل القرآن" : "بارك الله فيه، ونفع به، وجعله من أهل القرآن"}</p>
        <div className="mt-[2%] flex w-full items-end justify-between text-[0.75em]">
          <div className="text-start"><p className="opacity-70">التاريخ</p><p className="font-bold">{fmtLong(cert.at)}</p></div>
          <div className="text-center"><p className="opacity-70">رقم الشهادة</p><p dir="ltr" className="font-bold tracking-widest">{cert.id}</p></div>
          <div className="text-end"><p className="opacity-70">المعلمة</p><p className="font-bold">{data.teacher || "—"}</p></div>
        </div>
      </div>
    </div>
  );
}

type KidRow = { user_id: string; name: string; avatar: string; gender: "m" | "f" };
const KID_KEY = "serah_parent_kid";

export function Certificates({ parent = false }: { parent?: boolean }) {
  const sp = useSearchParams();
  const open = sp.get("c") ?? "";
  const kids = useApi<KidRow[]>("parentKids", {}, { enabled: parent });
  const klist = Array.isArray(kids.data) ? kids.data : [];
  const [sel, setSel] = useState("");
  useEffect(() => { if (parent) { try { setSel(localStorage.getItem(KID_KEY) || ""); } catch { /* لا شيء */ } } }, [parent]); // eslint-disable-line react-hooks/set-state-in-effect
  const kid = klist.find((k) => k.user_id === sel) ?? klist[0];
  const { data, loading, error } = useApi<Certs>("certificates", parent ? { kid_id: kid?.user_id ?? "" } : {}, { enabled: !parent || !!kid });
  const base = parent ? "/parent/certificates/" : "/kid/certificates/";
  const cert = data?.items.find((c) => c.id === open);
  const f = data?.kid.gender === "f";

  if (open) return (
    <div className="flex flex-col gap-3">
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } html, body { height: 100%; overflow: hidden !important } body * { visibility: hidden !important } .cert-print, .cert-print * { visibility: visible !important } .cert-print { position: fixed; inset: 0; width: 100vw; max-width: none; } }`}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={base} className={buttonVariants({ variant: "secondary", size: "lg2" })}><ArrowRight /> الشهادات</Link>
        {cert && <Button variant="hero" size="lg2" onClick={() => window.print()}><Printer /> طباعة / حفظ PDF</Button>}
      </div>
      {loading && !data ? <Skeleton className="aspect-[297/210] w-full rounded-[18px]" /> : cert && data ? <CertificateView data={data} cert={cert} /> : <p className="rounded-[24px] border bg-card p-5 text-center">الشهادة غير موجودة</p>}
      <p className="text-xs text-muted-foreground print:hidden">من نافذة الطباعة اختيار «حفظ كـ PDF» ينزّلها، والأفضل «أفقي» بدون هوامش.</p>
    </div>
  );

  return (
    <section aria-labelledby="ce-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="medal1" size={56} float />
        <div>
          <h1 id="ce-title" className="font-heading text-2xl font-extrabold">{parent ? "شهادات أطفالي" : "شهاداتي"}</h1>
          <p className="text-sm text-muted-foreground">شهادة لكل سورة تؤكد المعلمة حفظها، ولجزء عمّ، ولكل مرحلة من رحلة الأنبياء.</p>
        </div>
      </header>
      {parent && klist.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="اختيار الطفل">
          {klist.map((k) => (
            <button key={k.user_id} type="button" role="radio" aria-checked={k.user_id === kid?.user_id} onClick={() => { setSel(k.user_id); try { localStorage.setItem(KID_KEY, k.user_id); } catch { /* لا شيء */ } }}
              className={cn("flex h-12 items-center gap-2 rounded-2xl border px-3 font-bold", k.user_id === kid?.user_id ? "border-primary bg-primary/10 text-primary" : "bg-card")}><KidAvatar value={k.avatar} size={28} /> {k.name}</button>
          ))}
        </div>
      )}
      {loading && !data ? <Skeleton className="h-40 rounded-[24px]" /> : error && !data ? <p className="rounded-[24px] border bg-card p-5 text-center">{error}</p> : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Award className="size-12 text-amber-500" />
          <p className="font-heading text-lg font-extrabold">لسه مفيش شهادات</p>
          <p className="text-sm leading-7 text-muted-foreground">{parent ? "الشهادة بتظهر لما المعلمة تأكد حفظ سورة، أو لما يكمّل الطفل مرحلة من الرحلة." : f ? "احفظي سورة وسمّعيها للمعلمة في حديقة جزء عمّ، وتظهر شهادتك هنا 🌱" : "احفظ سورة وسمّعها للمعلمة في حديقة جزء عمّ، وتظهر شهادتك هنا 🌱"}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((c) => (
            <li key={c.id}>
              <Link href={`${base}?c=${c.id}`} data-testid="cert-item" className="flex items-center gap-3 rounded-[24px] border bg-card p-4 shadow-soft transition active:scale-[0.98]">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-2xl">{KIND[c.kind].icon}</span>
                <div className="min-w-0"><p className="text-xs font-bold text-muted-foreground">{KIND[c.kind].label}</p><p className="truncate font-heading text-lg font-extrabold">{c.title}</p><p className="text-xs text-muted-foreground">{fmtLong(c.at)}</p></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

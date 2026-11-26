"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { CERT_PRINT_CSS, CertificateView } from "./certificate-art";

// الشهادات: قائمة الشهادات المستحقة (من الخادم)، وفتح الشهادة بتصميم «الليلة البنفسجي» للطباعة (A4 أفقي يملأ الورقة)
const KIND: Record<Cert["kind"], { label: string; icon: string }> = { surah: { label: "حفظ سورة", icon: "📗" }, juz: { label: "حفظ جزء", icon: "🏆" }, stage: { label: "مرحلة من الرحلة", icon: "🚀" } };
const fmtLong = (d: string) => { try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); } catch { return d.slice(0, 10); } };

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
  const noKids = parent && !kids.loading && !kids.error && klist.length === 0;
  const base = parent ? "/parent/certificates/" : "/kid/certificates/";
  const cert = data?.items.find((c) => c.id === open);
  const f = data?.kid.gender === "f";
  const [mounted, setMounted] = useState(false); // نسخة الطباعة تُضاف لـ body بعد التحميل فقط
  useEffect(() => { setMounted(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  if (open) return (
    <div className="flex flex-col gap-3">
      <style>{CERT_PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={base} className={buttonVariants({ variant: "secondary", size: "lg2" })}><ArrowRight /> الشهادات</Link>
        {cert && <Button variant="hero" size="lg2" onClick={() => window.print()}><Printer /> طباعة / حفظ PDF</Button>}
      </div>
      {loading && !data ? <Skeleton className="aspect-[297/210] w-full rounded-[18px]" /> : cert && data ? <CertificateView data={data} cert={cert} /> : <p className="rounded-[24px] border bg-card p-5 text-center">الشهادة غير موجودة</p>}
      {mounted && cert && data && createPortal(<div className="cert-print-portal" aria-hidden><CertificateView data={data} cert={cert} print /></div>, document.body)}
      <p className="text-xs text-muted-foreground print:hidden">من نافذة الطباعة اختيار «حفظ كـ PDF» ينزّلها. الشهادة بتطلع أفقي ومالية الورقة.</p>
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
      {noKids ? <p className="rounded-[24px] border bg-card p-5 text-center text-sm text-muted-foreground">لا يوجد طفل مربوط بحسابك بعد</p> : parent && kids.error && !kids.data ? <p role="alert" className="rounded-[24px] border bg-card p-5 text-center">تعذّر التحميل، يُرجى المحاولة بعد قليل</p> : loading && !data ? <Skeleton className="h-40 rounded-[24px]" /> : error && !data ? <p className="rounded-[24px] border bg-card p-5 text-center">{error}</p> : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Award className="size-12 text-amber-500" />
          <p className="font-heading text-lg font-extrabold">لسه مفيش شهادات</p>
          <p className="text-sm leading-7 text-muted-foreground">{parent ? "الشهادة بتظهر لما المعلمة تأكد حفظ سورة، أو لما يكمّل الطفل مرحلة من الرحلة." : f ? "احفظي سورة وسمّعيها للمعلمة في حديقة جزء عمّ، وتظهر شهادتك هنا 🌱" : "احفظ سورة وسمّعها للمعلمة في حديقة جزء عمّ، وتظهر شهادتك هنا 🌱"}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.items.map((c) => (
            <li key={c.id} className="min-w-0">
              <Link href={`${base}?c=${c.id}`} data-testid="cert-item" className="flex items-center gap-3 rounded-[24px] border bg-card p-4 shadow-soft transition active:scale-[0.98]">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-2xl">{KIND[c.kind].icon}</span>
                <div className="min-w-0 flex-1"><p className="text-xs font-bold text-muted-foreground">{KIND[c.kind].label}</p><p className="truncate font-heading text-lg font-extrabold">{c.title}</p><p className="text-xs text-muted-foreground">{fmtLong(c.at)}</p></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

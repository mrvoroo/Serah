import { cn } from "@/lib/utils";

// شعار المنصة «المُنْتَهَى | Muntaha»: شجرة ذهبية داخل دائرة (public/brand)
// display: بخط الرقعة بدون تشكيل (التشكيل فوق الرقعة يزحم الحروف ويصعّب القراءة)، والاسم بالتشكيل للعنوان وقارئ الشاشة
export const BRAND = { ar: "المُنْتَهَى", display: "المنتهى", en: "Muntaha" } as const;
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function BrandLogo({ size = 40, glow = false, className }: { size?: number; glow?: boolean; className?: string }) {
  const src = `${base}/brand/logo-${size > 96 ? 256 : size > 48 ? 128 : 64}.png`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden width={size} height={size}
      className={cn("shrink-0 rounded-full ring-1 ring-gold/50", glow && "shadow-[0_0_40px_-6px_var(--gold)]", className)} />
  );
}

// الشعار مع الاسم (للشريط العلوي والقائمة الجانبية)
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <BrandLogo size={size} />
      <span className="flex flex-col leading-none">
        {/* الاسم بخط الرقعة، والإنجليزي بخط Cinzel الكلاسيكي */}
        <span className="font-ruqaa text-[1.6rem] leading-[1.1]" aria-label={BRAND.ar}>{BRAND.display}</span>
        <span className="font-brand-en text-[10px] font-bold tracking-[0.3em] text-gold">{BRAND.en.toUpperCase()}</span>
      </span>
    </span>
  );
}

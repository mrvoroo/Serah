import { BRAND } from "@/components/brand-logo";
import { type Cert, type Certs } from "@/lib/eight";

// الشهادة بتصميم «الليلة البنفسجي» (اعتمده المالك 2026-11-26): سما بنفسجي ونجوم وفوانيس وهلال، برواز ذهبي،
// الشعار فوق، الاسم في شريط ذهبي، شجرة مثمرة للقرآن ومسار نجوم لمراحل الرحلة، ووسام «أحسنت». بلا صور أشخاص.
// كل المقاسات بوحدة --u = «مليمتر» من ورقة A4 أفقية (297×210): على الشاشة تُحسب من عرض الحاوية،
// وفي الطباعة مقاس ثابت بالمليمتر (لا vw ولا cqw) حتى لا يرسمها الآيفون بعرض الموبايل في ركن الورقة.
// الخلفية والشريط داخل SVG (محتوى لا «خلفية») فلا تسقطها المتصفحات عند الطباعة.

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const u = (n: number) => `calc(var(--u) * ${n})`;
const fmtLong = (d: string) => { try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); } catch { return d.slice(0, 10); } };

const GOLD = "#FFB020", GOLD_D = "#C98200", NIGHT = "#1A1040", CREAM = "#FFE7A3";

function Defs({ P }: { P: string }) {
  return (
    <defs>
      <radialGradient id={P + "sky"} cx="50%" cy="35%" r="75%"><stop offset="0" stopColor="#3A2390" /><stop offset=".45" stopColor="#2B1A6B" /><stop offset="1" stopColor={NIGHT} /></radialGradient>
      <symbol id={P + "s5"} viewBox="-10 -10 20 20"><path d="M0-9.5 2.6-3.2 9.4-3 4.1 1.3 6-5.3 0 8.6-6 5.3-4.1 1.3-9.4-3-2.6-3.2Z" transform="rotate(180) scale(1,-1)" /></symbol>
      <symbol id={P + "rose"} viewBox="-20 -20 40 40">
        <rect x="-13" y="-13" width="26" height="26" fill={GOLD} /><rect x="-13" y="-13" width="26" height="26" fill={GOLD} transform="rotate(45)" />
        <circle r="9.5" fill="#2B1A6B" />
        <rect x="-6" y="-6" width="12" height="12" fill={GOLD} /><rect x="-6" y="-6" width="12" height="12" fill={GOLD} transform="rotate(45)" />
        <circle r="2.6" fill="#2B1A6B" />
      </symbol>
      <symbol id={P + "lantern"} viewBox="0 0 40 90">
        <line x1="20" y1="0" x2="20" y2="22" stroke={GOLD} strokeWidth="1.4" />
        <circle cx="20" cy="24" r="3" fill="none" stroke={GOLD} strokeWidth="1.6" />
        <path d="M12 30h16l-2 6H14Z" fill={GOLD} />
        <path d="M13 36h14l5 14-5 16H13l-5-16Z" fill={GOLD} />
        <path d="M15 39h10l3.5 11-3.5 13H15l-3.5-13Z" fill={CREAM} />
        <path d="M20 41l2.2 5.5L20 60l-2.2-13.5Z" fill={GOLD} opacity=".9" />
        <path d="M12 66h16l-3 6H15Z" fill={GOLD} /><path d="M18 72h4l-2 7Z" fill={GOLD} />
      </symbol>
      <symbol id={P + "tree"} viewBox="0 0 160 190">
        <ellipse cx="80" cy="180" rx="62" ry="9" fill="#7CC36A" />
        <path d="M70 182c4-30 2-55-6-78l10-2c6 16 8 30 7 44 4-14 12-26 24-34l6 7c-14 10-22 26-23 63Z" fill="#8B5A2B" />
        <circle cx="80" cy="62" r="44" fill="#3FA65A" /><circle cx="44" cy="84" r="30" fill="#4DB866" /><circle cx="118" cy="82" r="31" fill="#4DB866" />
        <circle cx="80" cy="96" r="30" fill="#45AF60" /><circle cx="62" cy="40" r="22" fill="#58C472" /><circle cx="102" cy="44" r="20" fill="#58C472" />
        <g fill="#FF5A5F"><circle cx="58" cy="62" r="6.5" /><circle cx="96" cy="70" r="6.5" /><circle cx="76" cy="38" r="6" /><circle cx="40" cy="92" r="6" /><circle cx="120" cy="92" r="6.5" /><circle cx="84" cy="104" r="6" /><circle cx="112" cy="50" r="5.5" /></g>
        <g fill="#fff" opacity=".7"><circle cx="56" cy="60" r="1.8" /><circle cx="94" cy="68" r="1.8" /><circle cx="74" cy="36" r="1.6" /><circle cx="38" cy="90" r="1.6" /><circle cx="118" cy="90" r="1.8" /><circle cx="82" cy="102" r="1.6" /><circle cx="110" cy="48" r="1.5" /></g>
      </symbol>
      {/* مسار الرحلة: خطوات نجوم تصعد إلى نجمة كبيرة */}
      <symbol id={P + "path"} viewBox="0 0 160 190">
        <path d="M24 176C70 170 40 132 82 124S120 84 92 64 118 30 128 22" fill="none" stroke={CREAM} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
        {[[24, 176, 9], [62, 146, 10], [96, 112, 11], [100, 70, 12]].map(([x, y, r], i) => <use key={i} href={"#" + P + "s5"} x={x - r} y={y - r} width={r * 2} height={r * 2} fill={GOLD} />)}
        <circle cx="128" cy="24" r="20" fill={GOLD} opacity=".25" />
        <use href={"#" + P + "s5"} x="108" y="4" width="40" height="40" fill={GOLD} />
      </symbol>
      <symbol id={P + "seal"} viewBox="0 0 120 150">
        <path d="M38 80 22 140l18-8 10 16 14-58Z" fill="#6D4AFF" /><path d="M82 80l16 60-18-8-10 16-14-58Z" fill="#4B2FD0" />
        <polygon points="60,4 67,15 80,10 82,23 95,24 91,37 103,43 94,53 101,65 88,69 89,82 76,81 71,94 60,86 49,94 44,81 31,82 32,69 19,65 26,53 17,43 29,37 25,24 38,23 40,10 53,15" fill={GOLD} />
        <circle cx="60" cy="50" r="31" fill="#FFC94D" stroke={GOLD_D} strokeWidth="2.5" />
        <circle cx="60" cy="50" r="25" fill="none" stroke={GOLD_D} strokeWidth="1.2" strokeDasharray="2 2.4" />
        <text x="60" y="47" textAnchor="middle" fontSize="13" fontWeight="800" fill="#7A4A00" style={{ fontFamily: "var(--font-baloo), var(--font-cairo), sans-serif" }}>أحسنت</text>
        <g fill="#7A4A00"><use href={"#" + P + "s5"} x="42" y="54" width="9" height="9" /><use href={"#" + P + "s5"} x="55" y="53" width="10" height="10" /><use href={"#" + P + "s5"} x="69" y="54" width="9" height="9" /></g>
      </symbol>
      <symbol id={P + "moon"} viewBox="0 0 40 40"><path d="M27 4a16 16 0 1 0 9 26A13 13 0 1 1 27 4Z" /></symbol>
    </defs>
  );
}

function Art({ quran, P }: { quran: boolean; P: string }) {
  const stars: [number, number, number, number][] = [[40, 44, 4, .9], [250, 40, 5, 1], [62, 70, 2.6, .7], [232, 74, 3, .7], [28, 104, 3, .6], [266, 110, 2.6, .6], [88, 30, 2.4, .6], [206, 28, 2.6, .6]];
  return (
    <svg viewBox="0 0 297 210" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
      <Defs P={P} />
      <rect width="297" height="210" fill={"url(#" + P + "sky)"} />
      {stars.map(([x, y, s, o], i) => <use key={i} href={"#" + P + "s5"} x={x} y={y} width={s} height={s} fill={CREAM} opacity={o} />)}
      <g fill="#fff" opacity=".55">{[[50, 60], [76, 52], [240, 58], [222, 44], [36, 128], [262, 134], [98, 46], [198, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".55" />)}</g>
      <rect x="7" y="7" width="283" height="196" rx="5" fill="none" stroke={GOLD} strokeWidth="1.8" />
      <rect x="11" y="11" width="275" height="188" rx="3" fill="none" stroke={GOLD} strokeWidth=".5" strokeDasharray="1.5 1.5" />
      {[[-1, -1], [278, -1], [-1, 191], [278, 191]].map(([x, y], i) => <use key={"r" + i} href={"#" + P + "rose"} x={x} y={y} width="20" height="20" />)}
      <use href={"#" + P + "lantern"} x="24" y="11" width="16" height="36" /><use href={"#" + P + "lantern"} x="257" y="11" width="16" height="36" />
      <use href={"#" + P + "moon"} x="226" y="56" width="18" height="18" fill="#FFD36B" />
      <use href={"#" + P + (quran ? "tree" : "path")} x="222" y="104" width="62" height="74" />
      <use href={"#" + P + "seal"} x="18" y="110" width="44" height="55" />
    </svg>
  );
}

export function CertificateView({ data, cert, print = false }: { data: Certs; cert: Cert; print?: boolean }) {
  const f = data.kid.gender === "f";
  const quran = cert.kind !== "stage";
  const [head, tail] = cert.title.split(":");
  const name = data.kid.name;
  const nameSize = name.length > 22 ? 8 : name.length > 15 ? 10 : 12;
  return (
    <div className={print ? "" : "mx-auto w-full max-w-4xl print:hidden"} style={print ? undefined : { containerType: "inline-size" }}>
      <div data-testid={print ? "certificate-print" : "certificate"} dir="rtl" className={print ? "relative overflow-hidden text-white" : "relative aspect-[297/210] w-full overflow-hidden rounded-[18px] text-white shadow-soft"}
        style={{ ["--u" as string]: print ? "0.9394mm" : "calc(100cqw / 297)", ...(print ? { width: "279mm", height: "197.4mm" } : {}), background: NIGHT, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <Art quran={quran} P={print ? "cxp-" : "cxs-"} />
        <div className="absolute flex flex-col items-center text-center" style={{ top: u(13), bottom: u(30), left: u(64), right: u(64) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${base}/brand/logo-256.png`} alt="" className="block rounded-full" style={{ width: u(24), height: u(24) }} />
          <p className="font-ruqaa leading-[1.5]" style={{ fontSize: u(6), marginTop: u(4.5), color: GOLD }} aria-label={BRAND.ar}>{BRAND.display}</p>
          <p className="font-brand-en font-bold leading-none" style={{ fontSize: u(2.3), letterSpacing: u(1), color: "#FFD98A" }}>{BRAND.en.toUpperCase()}</p>
          <p className="font-bold" style={{ fontSize: u(3.9), marginTop: u(3.5), color: GOLD }}>بسم الله الرحمن الرحيم</p>
          <p className="font-heading font-extrabold leading-[1.1]" style={{ fontSize: u(15.5), color: GOLD }}>شهادة تقدير</p>
          <p className="font-bold" style={{ fontSize: u(4.9), marginTop: u(1.5) }}>{f ? "تشهد منصة المُنْتَهَى بأن الطالبة" : "تشهد منصة المُنْتَهَى بأن الطالب"}</p>
          <div className="relative grid shrink-0 place-items-center" style={{ width: u(150), height: u(23), marginTop: u(2.5) }}>
            <svg viewBox="0 0 150 23" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
              <path d="M0 5h12v-3l6 3H132l6-3v3h12l-6 7 6 7H138v3l-6-3H18l-6 3v-3H0l6-7Z" fill={GOLD_D} />
              <rect x="12" y="2" width="126" height="18" rx="2" fill={GOLD} />
              <rect x="14" y="4" width="122" height="14" rx="1.5" fill="none" stroke="#fff" strokeWidth=".5" opacity=".7" />
            </svg>
            <p className="relative font-heading font-extrabold leading-none" style={{ fontSize: u(nameSize), color: NIGHT, paddingBottom: u(1.2) }}>{name}</p>
          </div>
          {data.kid.class_name && <p className="font-bold opacity-85" style={{ fontSize: u(3.9), marginTop: u(1.5) }}>{data.kid.class_name}</p>}
          {quran ? (
            <p className="font-extrabold" style={{ fontSize: u(6), marginTop: u(2.5) }}>{f ? "قد أتمّت حفظ" : "قد أتمّ حفظ"} <span className="font-ruqaa" style={{ fontSize: u(10.6), color: GOLD, padding: `0 ${u(2)}` }}>{cert.title}</span></p>
          ) : (
            <p className="font-extrabold leading-[1.6]" style={{ fontSize: u(5.4), marginTop: u(3) }}>{f ? "قد أتمّت" : "قد أتمّ"} <span style={{ color: GOLD }}>{head}</span> من رحلة الأنبياء{tail ? <><br /><span style={{ color: GOLD }}>{tail.trim()}</span></> : null}</p>
          )}
          <p className="font-bold" style={{ fontSize: u(4.4), marginTop: u(2) }}>{!quran ? (f ? "بارك الله فيها، ونفعها بقصص الأنبياء عليهم السلام، وجعلها من الصالحين" : "بارك الله فيه، ونفعه بقصص الأنبياء عليهم السلام، وجعله من الصالحين") : f ? "بارك الله فيها، ونفع بها، وجعلها من أهل القرآن" : "بارك الله فيه، ونفع به، وجعله من أهل القرآن"}</p>
        </div>
        <div className="absolute flex justify-center text-center" style={{ left: u(64), right: u(64), bottom: u(20), gap: u(20), fontSize: u(3.5) }}>
          <div><p className="font-bold opacity-75">التاريخ</p><p className="font-extrabold" style={{ fontSize: u(4.2), color: GOLD }}>{fmtLong(cert.at)}</p></div>
          <div><p className="font-bold opacity-75">رقم الشهادة</p><p dir="ltr" className="font-extrabold" style={{ fontSize: u(4.2), color: GOLD, letterSpacing: u(0.6) }}>{cert.id}</p></div>
          <div><p className="font-bold opacity-75">المعلمة</p><p className="font-extrabold" style={{ fontSize: u(4.2), color: GOLD }}>{data.teacher || "—"}</p></div>
        </div>
      </div>
    </div>
  );
}

// الطباعة: نسخة مستقلة (portal) ابن مباشر لـ body، وكل ما عداها display:none، فتكون أول شيء في الصفحة بلا position.
// (سفاري الآيفون يحسب position:fixed والتوسيط بالنسبة لعرض شاشة الموبايل لا الورقة، فكان يطبع نصفها الأيمن فقط.)
// مقاس ثابت 279×197.4mm بنسبة A4: يملأ A4 الأفقي ويدخل كاملًا في Letter، والتوسيط بـ margin:auto (يصير صفرًا لو الورقة أضيق)، و6mm من فوق تتوسّط A4 وتدخل في Letter.
export const CERT_PRINT_CSS = `
.cert-print-portal { display: none }
@media print {
  @page { size: A4 landscape; margin: 0 }
  html, body { margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; overflow: visible !important; direction: ltr; background: ${NIGHT} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact }
  body > *:not(.cert-print-portal) { display: none !important }
  .cert-print-portal { display: block !important; width: 279mm; margin: 6mm auto 0; break-inside: avoid; page-break-inside: avoid }
}`;

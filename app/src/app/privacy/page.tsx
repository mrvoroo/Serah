import Link from "next/link";
import { ArrowRight, Database, EyeOff, Lock, ShieldCheck, Smartphone, Trash2, Users } from "lucide-react";

export const metadata = { title: "الخصوصية | المُنْتَهَى", description: "كيف تحفظ منصة المنتهى بيانات الأطفال والمعلمات وتحميها" };

// صفحة الخصوصية: ما نحفظه، ومن يراه، وأين يُحفظ، وكيف يُحذف — بلغة بسيطة لولي الأمر
const SECTIONS = [
  {
    icon: Database, title: "ما الذي نحفظه؟",
    items: [
      "اسم الطفل كما تكتبه المعلمة، وشكله (صورة رمزية من المنصة، لا صورة حقيقية)، وفصله، وهل هو ولد أم بنت لمخاطبته بالصيغة الصحيحة.",
      "الرمز السري يُحفظ مشفّرًا ولا يظهر لأي أحد.",
      "المدينة والدولة إن كتبتها المعلمة، وآخر دخول، ونشاطه في المنصة: النجوم، حضور المحاضرات (ومدة حضور المحاضرة المباشرة)، نتائج الاختبارات، الواجبات، والصلوات التي يعلّم عليها.",
      "لو فعّل الإشعارات: عنوان الجهاز الخاص بالإشعارات وجدول مواعيدها (أوقات الصلاة، وقد تدل على المدينة تقريبًا).",
      "الاقتراحات التي يرسلها (نص أو تسجيل صوتي).",
      "للمعلمات: الاسم، والرمز مشفّرًا، وحساب تيليجرام لو ربطته لرفع المحاضرات، وسجل العمليات الإدارية.",
    ],
  },
  {
    icon: EyeOff, title: "ما الذي لا نحفظه ولا نفعله",
    items: [
      "لا نطلب بريدًا إلكترونيًا ولا رقم هاتف ولا صورًا حقيقية للأطفال.",
      "لا إعلانات، ولا أدوات تتبّع أو تحليل تجارية، ولا بيع أو مشاركة أي بيانات مع أي جهة.",
      "إحداثيات الموقع (لحساب مواقيت الصلاة) تُستعمل على الجهاز فقط ولا تُرسل إلينا.",
    ],
  },
  {
    icon: Users, title: "من يرى بيانات الطفل؟",
    items: [
      "معلمات فصله، والمعلمات الأدمن، ومطوّر المنصة لأغراض الإدارة والدعم فقط.",
      "زملاء فصله يرون اسمه وشكله ونجومه في لوحة الترتيب، ومن يعرف كود الفصل يرى الأسماء والأشكال في قائمة الدخول — لذلك لا تشارك كود الفصل خارج الفصل.",
    ],
  },
  {
    icon: Lock, title: "أين تُحفظ البيانات وكيف تُحمى؟",
    items: [
      "في حساب جوجل خاص بالمنصة (Google Sheets و Google Drive)، مع نسخة احتياطية أسبوعية تُحفظ آخر ٨ أسابيع منها.",
      "الدخول برمز سري، ومحاولات التخمين تُقفل الحساب مؤقتًا، وكل اتصال مشفّر (HTTPS).",
      "الموقع نفسه على GitHub Pages، ونص القرآن من api.alquran.cloud والتلاوات من everyayah.com والفيديوهات من يوتيوب (الوضع الخاص youtube-nocookie)، وخط المصحف من Google Fonts، والإشعارات عبر خدمة الإشعارات الخاصة بالجهاز (جوجل أو أبل أو موزيلا) — هذه الخدمات ترى عنوان الجهاز عند التحميل كأي موقع.",
      "المعلمات يرفعن المحاضرات عبر تيليجرام. والمحاضرة المباشرة (عند تفعيلها) على خادم خاص بالمنصة، ويُحفظ تسجيلها الصوتي لتراجعه الإدارة قبل نشره.",
    ],
  },
  {
    icon: Smartphone, title: "ما الذي يُحفظ على الجهاز؟",
    items: [
      "بيانات الدخول، والإعدادات (مثل الوضع الليلي ومكان المواقيت)، ونسخ صغيرة لتسريع الفتح (نص السور، آخر سجل للصلوات). تسجيل الخروج يمسح بيانات الحساب، ومسح بيانات المتصفح يمسح الكل.",
    ],
  },
  {
    icon: Trash2, title: "حذف البيانات",
    items: [
      "يمكن لولي الأمر طلب حذف حساب طفله وكل بياناته نهائيًا عن طريق معلمة الفصل أو إدارة المنصة، ويُحذف من الجداول فورًا، ومن النسخ الاحتياطية خلال ١٢ أسبوعًا على الأكثر.",
      "حذف المعلمة لطفل من الفصل يوقف حسابه فورًا، والحذف النهائي يتم بطلب كما سبق.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-svh bg-[#0B0620] text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-24 pt-6">
        <nav><Link href="/about/" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"><ArrowRight className="size-4" /> من نحن</Link></nav>
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-[#FFC24D]/15 text-[#FFC24D]"><ShieldCheck className="size-9" /></span>
          <h1 className="font-heading text-4xl font-extrabold">الخصوصية</h1>
          <p className="max-w-xl leading-8 text-white/80">«المنتهى» منصة تعليمية للأطفال. نحفظ أقلَّ ما تحتاجه المنصة من البيانات لتعمل، ولا نشاركه مع أحد. هذه الصفحة تشرح ذلك بوضوح لأولياء الأمور.</p>
        </header>
        {SECTIONS.map((s, i) => (
          <section key={s.title} aria-labelledby={`pv-${i}`} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <h2 id={`pv-${i}`} className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#FFC24D]"><s.icon className="size-5" /> {s.title}</h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 leading-8 text-white/90">
              {s.items.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        ))}
        <p className="text-center text-sm text-white/60">حسابات الأطفال تنشئها المعلمات بإذن أولياء الأمور. لأي سؤال عن الخصوصية يُرجى التواصل مع معلمة الفصل أو إدارة المنصة.</p>
      </div>
    </main>
  );
}

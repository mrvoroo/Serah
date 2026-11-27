// قصص السكرول التفاعلية في صفحة النبي: الطفل يقرأ فقرة فقرة، والمشهد الواقعي خلف الكلام يتغير مع كل فقرة.
// ⚠️ النصوص نفسها لا تُكتب هنا: كل فقرة تشير لرقم سطرها في «more» من المحتوى المراجَع شرعيًا (prophets-content.json).
// هنا فقط: أي صورة من صور المشهد، وجو المرحلة، ونوع التفاعل. أي كلمة جديدة يراها الطفل تحتاج مراجعة الشيخ.

// soil/wet/sticky/dark/dry: مراحل الطين على أرضية الصورة (تراب ← طين ← لازب ← حمأ مسنون ← صلصال)
export type StoryMood = { dim?: number; mist?: number; beam?: number; gold?: number; soil?: number; wet?: number; sticky?: number; dark?: number; dry?: number };
export type StoryInteract = "earth" | "clink" | "names" | "hold";
export type StoryChapter = {
  label: string; // عنوان قصير للفقرة (من عناوين مراحل المشهد المراجَعة)
  more?: number; // رقم الفقرة في content.more (المراجَع)
  // ⚠️ نص جديد (مش من content.more): لازم مراجعة الشيخ قبل النشر
  text?: string;
  ref?: string;
  img: number; // رقم الصورة في المشهد (يبدأ من صفر)
  mood: StoryMood;
  interact?: StoryInteract;
  leaves?: boolean; // أوراق قليلة تتساقط
  moodAfter?: StoryMood;
  imgAfter?: number; // صورة تظهر بعد التفاعل (نور التوبة)
};
export type ProphetStory = {
  chapters: StoryChapter[];
  // ألوان تراب الأرض (حديث: «خلق آدم من قبضة قبضها من جميع الأرض» — أبو داود ٤٦٩٣، الترمذي ٢٩٥٥)
  earth?: string[];
  // أسماء أشياء تظهر عند لمس النقاط الذهبية (توضيح لـ«الأسماء كلها»، بلا ادعاء أنها هي بعينها) — ⚠️ تحتاج مراجعة الشيخ
  names?: string[];
  // ⚠️ فقرة «الشجرة» على صورة الشجرة الصغيرة: الصورتان ٣ و٤ فيهما كرات ذهبية مستديرة قد توحي بثمر محدد (ملاحظة الشيخ)،
  // تُستبدلان بصور بلا كرات ثم ترجع الفقرة لصورة الشجرة الكبيرة.
  // الفقرات اللي تظهر بعد القصة كخاتمة صغيرة (السور والمراجع)
  footer?: number[];
};

export const STORIES: Record<string, ProphetStory> = {
  adam: {
    earth: ["#8f3b22", "#c9883f", "#e9dcc1", "#4a2e1e", "#d4a95c", "#2a1c14"],
    names: ["الماء", "الجبل", "النجم", "الطير", "الشمس", "القمر"],
    chapters: [
      // نصوص الطين من صياغة الشيخ المعتمدة (مختصرة لفقرتين)
      { label: "من تراب", img: 4, mood: { beam: 0.35 }, interact: "earth",
        text: "خلق الله سيدنا آدم عليه السلام من تراب، من قبضةٍ قبضها من جميع الأرض، فجاء الناس بألوان مختلفة كألوان الأرض: ﴿خَلَقَهُ مِن تُرَابٍ﴾", ref: "آل عمران: ٥٩، وحديث صحيح: أبو داود ٤٦٩٣، الترمذي ٢٩٥٥" },
      { label: "طين ثم صلصال", img: 5, mood: { beam: 0.4 }, interact: "clink",
        text: "ثم خُلط التراب بالماء فصار طينًا، ثم يبس الطين فصار صلصالًا، يُسمع له صوت إذا نُقر مثل الفخّار: ﴿خَلَقَ الْإِنسَانَ مِن صَلْصَالٍ كَالْفَخَّارِ﴾", ref: "ص: ٧١، الرحمن: ١٤" },
      { label: "التكريم", more: 0, img: 5, mood: { beam: 1, gold: 0.25 } },
      { label: "الأسماء", more: 1, img: 1, mood: { beam: 0.25, gold: 0.12 }, interact: "names" },
      // more[2] مقسومة على مشهدين عند حدّ الجملة (نفس النص المراجَع)
      { label: "الجنة", img: 6, mood: { beam: 0.3, gold: 0.1 },
        text: "أسكنه الله الجنة هو وزوجه أمَّنا حواء عليها السلام، وأباح لهما كل شيء إلا شجرة واحدة.", ref: "البقرة: ٣٥، واسم «حواء» في صحيح البخاري ٣٣٣٠ — صورة للتقريب، والجنة أجمل من كل ما نتخيّل" },
      { label: "الشجرة", img: 7, mood: { dim: 0.35, mist: 0.8 }, leaves: true,
        text: "فوسوس لهما الشيطان فأكلا منها.", ref: "البقرة: ٣٦، الأعراف: ١٩-٢٢" },
      { label: "التوبة", more: 3, img: 7, mood: { dim: 0.3, mist: 0.4 }, interact: "hold", moodAfter: { beam: 0.6, gold: 0.2 }, imgAfter: 8 },
      { label: "نبيٌّ كلّمه الله", more: 4, img: 9, mood: { beam: 0.3, gold: 0.15 } },
      { label: "نتعلّم من القصة", more: 6, img: 9, mood: { beam: 0.5, gold: 0.3 } },
    ],
    footer: [5],
  },
};

export const storyOf = (id: string): ProphetStory | null => (Object.prototype.hasOwnProperty.call(STORIES, id) ? STORIES[id] : null);

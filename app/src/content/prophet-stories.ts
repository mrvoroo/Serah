// قصص السكرول التفاعلية في صفحة النبي: الطفل يقرأ فقرة فقرة، والمشهد الواقعي خلف الكلام يتغير مع كل فقرة.
// ⚠️ النصوص نفسها لا تُكتب هنا: كل فقرة تشير لرقم سطرها في «more» من المحتوى المراجَع شرعيًا (prophets-content.json).
// هنا فقط: أي صورة من صور المشهد، وجو المرحلة، ونوع التفاعل. أي كلمة جديدة يراها الطفل تحتاج مراجعة الشيخ.

export type StoryMood = { dim?: number; mist?: number; beam?: number; gold?: number };
export type StoryInteract = "earth" | "names" | "hold";
export type StoryChapter = {
  label: string; // عنوان قصير للفقرة (من عناوين مراحل المشهد المراجَعة)
  more: number; // رقم الفقرة في content.more
  img: number; // رقم الصورة في المشهد (يبدأ من صفر)
  mood: StoryMood;
  interact?: StoryInteract;
  leaves?: boolean; // أوراق قليلة تتساقط
  moodAfter?: StoryMood; // جو المرحلة بعد التفاعل (التوبة)
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
      { label: "من الأرض", more: 0, img: 0, mood: { beam: 0.45, gold: 0.08 }, interact: "earth" },
      { label: "الأسماء", more: 1, img: 1, mood: { beam: 0.25, gold: 0.12 }, interact: "names" },
      { label: "الشجرة", more: 2, img: 1, mood: { dim: 0.5, mist: 0.9 }, leaves: true },
      { label: "التوبة", more: 3, img: 3, mood: { dim: 0.35, mist: 0.45 }, interact: "hold", moodAfter: { beam: 1, gold: 0.3 } },
      { label: "نبيٌّ كلّمه الله", more: 4, img: 3, mood: { beam: 0.4, gold: 0.2 } },
      { label: "نتعلّم من القصة", more: 6, img: 3, mood: { beam: 0.6, gold: 0.35 } },
    ],
    footer: [5],
  },
};

export const storyOf = (id: string): ProphetStory | null => (Object.prototype.hasOwnProperty.call(STORIES, id) ? STORIES[id] : null);

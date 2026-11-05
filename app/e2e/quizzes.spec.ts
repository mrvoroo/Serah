import { test, expect, type Page, type Route } from "@playwright/test";

// المرحلة 7: الاختبارات والواجبات — المعلمة تنشئ، والأدمن تنشر، والطفل يحل سؤالًا في كل شاشة ويأخذ نجومًا، والمعلمة ترى النتائج وتعتمد الواجبات

type Call = { action: string; [k: string]: unknown };
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
const TEACHER = { user_id: "T2", name: "معلمة ثانية", role: "teacher", class_id: "C1", avatar: "" };
const ADMIN = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };

// خلفية وهمية فيها حالة: الأسئلة بإجاباتها هنا فقط، والطفل يستلمها بدون الإجابة (مثل الخلفية الحقيقية)
async function mock(page: Page, user: typeof KID) {
  const calls: Call[] = [];
  const quizzes = [
    { quiz_id: "Z1", title: "قصة سيدنا نوح عليه السلام", status: "published", prophet_id: "nuh", lecture_id: "", created_at: "2", results: 1,
      qs: [
        { question_id: "q1", text: "من صنع السفينة؟", options: ["سيدنا نوح عليه السلام", "سيدنا موسى عليه السلام"], image_file_id: "", correct: 0 },
        { question_id: "q2", text: "كم سنة لبث سيدنا نوح عليه السلام في قومه يدعوهم إلى الله؟", options: ["١٠٠", "٩٥٠", "٥٠"], image_file_id: "", correct: 1 },
      ] },
  ];
  const results: Record<string, { score: number; total: number; stars: number }> = {};
  const hw = [{ assignment_id: "W1", title: "احفظ سورة الفاتحة", details: "مع التجويد", due: "2026-11-20", prophet_id: "", lecture_id: "", created_at: "1", status: "" as string }];
  const strip = (q: { correct: number }, withAnswer: boolean) => { const { correct, ...rest } = q; return withAnswer ? { ...rest, correct } : rest; };
  const isT = user.role !== "student";
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    const z = quizzes.find((x) => x.quiz_id === b.quiz_id);
    switch (b.action) {
      case "quizzes": return ok(quizzes.filter((q) => isT || q.status === "published").filter((q) => !b.prophet_id || q.prophet_id === b.prophet_id)
        .map(({ qs, ...q }) => ({ ...q, count: qs.length, mine: isT ? undefined : results[q.quiz_id] ?? null })));
      case "quiz": return z ? ok({ quiz: { ...z, qs: undefined }, questions: z.qs.map((q) => strip(q, isT)), mine: results[z.quiz_id] ?? null }) : route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error: "الاختبار غير موجود" }) });
      case "submitQuiz": {
        const ans = b.answers as Record<string, number>;
        const review = z!.qs.map((q) => ({ question_id: q.question_id, chosen: ans[q.question_id] ?? -1, correct: q.correct, ok: ans[q.question_id] === q.correct }));
        const score = review.filter((r) => r.ok).length, total = review.length, stars = Math.round((20 * score) / total);
        const first = !results[z!.quiz_id];
        const best = results[z!.quiz_id] ?? null;
        if (first) results[z!.quiz_id] = { score, total, stars };
        return ok({ score, total, stars: first ? stars : 0, first, best, review });
      }
      case "saveQuiz": { quizzes.push({ quiz_id: "Z2", title: String(b.title), status: "draft", prophet_id: String(b.prophet_id), lecture_id: "", created_at: "3", results: 0,
        qs: (b.questions as { text: string; options: string[]; correct: number }[]).map((q, i) => ({ question_id: `n${i}`, text: q.text, options: q.options.filter(Boolean), image_file_id: "", correct: q.correct })) }); return ok("Z2"); }
      case "setQuizStatus": { if (z) z.status = String(b.status); return ok(true); }
      case "quizResults": return ok({ quiz: z, questions: z!.qs, per: [{ right: 1, answered: 1 }, { right: 0, answered: 1 }],
        kids: [{ user_id: "S1", name: "يوسف", avatar: "🌟", done: true, score: 1, total: 2, stars: 10, answers: [0, 2] }, { user_id: "S2", name: "مريم", avatar: "🌙", done: false }] });
      case "assignments": return ok(hw.map((a) => (isT ? { ...a, status: undefined, kids: 2, done: 1, approved: 0 } : a)));
      case "markAssignment": { hw[0].status = b.done ? "done" : ""; return ok(hw[0].status); }
      case "saveAssignment": return ok("W2");
      case "assignmentStatus": return ok({ assignment: hw[0], kids: [{ user_id: "S1", name: "يوسف", avatar: "🌟", status: "done", at: "" }, { user_id: "S2", name: "مريم", avatar: "🌙", status: "", at: "" }] });
      case "reviewAssignment": return ok(b.approve ? "approved" : "returned");
      case "me": return ok({ points: 30, attended: [], rank: 1, total: 2 });
      case "journey": return ok([]);
      case "dashboard": return ok({ kids: 2, lectures: 0, published: 0, drafts: 0, attendanceRate: 0, totalPoints: 0, perLecture: [], days: [], top: [], recent: [], newSuggestions: 0 });
      default: return ok([]);
    }
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t-" + u.user_id); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
  return calls;
}

test("الطفل: كارت «اختبر نفسك» في الرئيسية، ثم يحل الاختبار سؤالًا في كل شاشة ويأخذ نجومه والإجابات الصحيحة", async ({ page }) => {
  const calls = await mock(page, KID);
  await page.goto("/Serah/kid/");
  const card = page.getByRole("link", { name: /اختبر نفسك/ });
  await expect(card).toContainText("عندك ٢ حاجات جديدة");
  await card.click();
  await expect(page).toHaveURL(/\/kid\/tasks\/$/);
  await page.getByRole("link", { name: /قصة سيدنا نوح عليه السلام/ }).click();
  await expect(page.getByRole("heading", { name: "قصة سيدنا نوح عليه السلام" })).toBeVisible();
  await expect(page.getByText("تكسب لحد ٢٠ نجمة")).toBeVisible();
  await page.getByRole("button", { name: /يلا نبدأ/ }).click();

  await expect(page.getByText("سؤال ١ من ٢")).toBeVisible();
  const next = page.getByRole("button", { name: /التالي/ });
  await expect(next).toBeDisabled();
  await page.getByRole("radio", { name: /سيدنا نوح عليه السلام/ }).click();
  await expect(page.getByRole("radio", { name: /سيدنا نوح عليه السلام/ })).toHaveAttribute("aria-checked", "true");
  await next.click();
  await expect(page.getByRole("heading", { name: "كم سنة لبث سيدنا نوح عليه السلام في قومه يدعوهم إلى الله؟" })).toBeVisible();
  // الرجوع يحفظ الإجابة
  await page.getByRole("button", { name: "السؤال السابق" }).click();
  await expect(page.getByRole("radio", { name: /سيدنا نوح عليه السلام/ })).toHaveAttribute("aria-checked", "true");
  await next.click();
  await expect(page.getByRole("button", { name: "جاوب كل الأسئلة الأول" })).toBeDisabled();
  await page.getByRole("radio", { name: "ج ٥٠" }).click();
  await page.getByRole("button", { name: "سلّم الإجابات" }).click();

  await expect(page.getByText("جاوبت ١ من ٢ صح")).toBeVisible();
  await expect(page.getByText(/كسبت/)).toBeVisible();
  await expect(page.getByTestId("review-item")).toHaveCount(2);
  await expect(page.getByTestId("review-item").nth(1)).toContainText("الإجابة الصح: ٩٥٠");
  expect(calls.find((c) => c.action === "submitQuiz")).toMatchObject({ quiz_id: "Z1", answers: { q1: 0, q2: 2 } });

  // محاولة ثانية: تدريب بدون نجوم
  await page.getByRole("button", { name: /حاول تاني/ }).click();
  await page.getByRole("radio", { name: /سيدنا نوح عليه السلام/ }).click();
  await page.getByRole("button", { name: /التالي/ }).click();
  await page.getByRole("radio", { name: "ب ٩٥٠" }).click();
  await page.getByRole("button", { name: "سلّم الإجابات" }).click();
  await expect(page.getByText("ما شاء الله! كله صح")).toBeVisible();
  await expect(page.getByText(/ده تدريب/)).toContainText("نتيجتك الأولى ١ من ٢");
});

test("الطفل: الواجب — يضغط «أنجزت» وتتغير الحالة", async ({ page }) => {
  const calls = await mock(page, KID);
  await page.goto("/Serah/kid/tasks/");
  const item = page.getByTestId("kid-homework");
  await expect(item).toContainText("احفظ سورة الفاتحة");
  await expect(item).toContainText("مع التجويد");
  await item.getByRole("button", { name: "أنجزت" }).click();
  await expect(item.getByText("أنجزت — مستني المعلمة")).toBeVisible();
  await expect(item.getByRole("button", { name: /شيل العلامة/ })).toBeVisible();
  expect(calls.find((c) => c.action === "markAssignment")).toMatchObject({ assignment_id: "W1", done: true });
});

test("المعلمة: تنشئ اختبارًا بأسئلة واختيار الإجابة الصحيحة، ويبقى مسودة تنتظر الأدمن", async ({ page }) => {
  const calls = await mock(page, TEACHER);
  await page.goto("/Serah/teacher/quizzes/");
  await expect(page.getByTestId("quiz-card")).toHaveCount(1);
  await expect(page.getByRole("switch")).toHaveCount(0); // النشر للأدمن فقط
  await page.getByRole("button", { name: /اختبار جديد/ }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("عنوان الاختبار").fill("قصة سيدنا يونس عليه السلام");
  await d.getByLabel("نص السؤال 1").fill("أين كان سيدنا يونس عليه السلام حين دعا ربه في الظلمات؟");
  await d.getByLabel("السؤال 1 الاختيار أ").fill("في بطن الحوت");
  await d.getByLabel("السؤال 1 الاختيار ب").fill("فوق الجبل");
  await d.getByRole("button", { name: "الإجابة الصحيحة للسؤال 1: الاختيار أ" }).click();
  await d.getByRole("button", { name: /إضافة سؤال/ }).click();
  await expect(d.getByTestId("quiz-question")).toHaveCount(2);
  await d.getByLabel("نص السؤال 2").fill("ماذا قال سيدنا يونس عليه السلام في بطن الحوت؟");
  await d.getByLabel("السؤال 2 الاختيار أ").fill("لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ");
  await d.getByLabel("السؤال 2 الاختيار ب").fill("لا شيء");
  await d.getByRole("button", { name: "الإجابة الصحيحة للسؤال 2: الاختيار أ" }).click();
  await d.getByRole("button", { name: "حفظ الاختبار" }).click();
  await expect(d).toBeHidden();
  const save = calls.find((c) => c.action === "saveQuiz")!;
  expect(save).toMatchObject({ title: "قصة سيدنا يونس عليه السلام" });
  expect((save.questions as { correct: number }[]).map((q) => q.correct)).toEqual([0, 0]);
  await expect(page.getByTestId("quiz-card")).toHaveCount(2);
  await expect(page.getByTestId("quiz-card").filter({ hasText: "قصة سيدنا يونس عليه السلام" })).toContainText("ينتظر مراجعة الأدمن");
});

test("الأدمن: تنشر الاختبار، وترى النتائج لكل طفل وكل سؤال", async ({ page }) => {
  const calls = await mock(page, ADMIN);
  await page.goto("/Serah/teacher/quizzes/");
  const card = page.getByTestId("quiz-card").first();
  await card.getByRole("switch").click();
  await expect.poll(() => calls.find((c) => c.action === "setQuizStatus")).toMatchObject({ quiz_id: "Z1", status: "draft" });
  await card.getByRole("button", { name: /نتائج/ }).click();
  const d = page.getByRole("dialog");
  await expect(d).toContainText("حلّه ١ من ٢");
  await expect(d.getByTestId("result-kid").first()).toContainText("١ / ٢");
  await expect(d.getByLabel("سؤال 2 خطأ")).toBeVisible();
  await expect(d.getByTestId("result-kid").nth(1)).toContainText("لم يحل بعد");
});

test("المعلمة: الواجبات — إنشاء ومتابعة واعتماد", async ({ page }) => {
  const calls = await mock(page, TEACHER);
  await page.goto("/Serah/teacher/homework/");
  await expect(page.getByTestId("homework-card")).toContainText("١ ينتظر");
  await page.getByRole("button", { name: /واجب جديد/ }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("العنوان").fill("اقرأ قصة سيدنا يوسف عليه السلام");
  await d.getByLabel("موعد التسليم").fill("2026-11-30");
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "saveAssignment")).toMatchObject({ title: "اقرأ قصة سيدنا يوسف عليه السلام", due: "2026-11-30" });
  await page.getByRole("button", { name: /متابعة احفظ سورة الفاتحة/ }).click();
  const s = page.getByRole("dialog");
  await expect(s.getByTestId("homework-kid").first()).toContainText("أنجز — ينتظر الاعتماد");
  await s.getByRole("button", { name: "اعتماد يوسف" }).click();
  await expect.poll(() => calls.find((c) => c.action === "reviewAssignment")).toMatchObject({ assignment_id: "W1", user_id: "S1", approve: true });
});

test("المعلمة: متابعة واجب ثانٍ لا تعرض أطفال الواجب الأول القديمة (كان يعتمد طفلًا في الواجب الخطأ)", async ({ page }) => {
  await page.route(/script\.google\.com\/macros/, async (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    const W = (id: string, title: string) => ({ assignment_id: id, title, details: "", due: "", prophet_id: "", lecture_id: "", created_at: id, kids: 1, done: 0, approved: 0 });
    if (b.action === "assignments") return ok([W("W1", "الواجب الأول"), W("W2", "الواجب الثاني")]);
    if (b.action === "assignmentStatus") {
      if (b.assignment_id === "W2") await new Promise((r) => setTimeout(r, 2500));
      return ok({ assignment: W(b.assignment_id, ""), kids: [{ user_id: b.assignment_id === "W1" ? "S1" : "S2", name: b.assignment_id === "W1" ? "يوسف" : "مريم", avatar: "", status: "", at: "" }] });
    }
    return ok([]);
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, TEACHER);
  await page.goto("/Serah/teacher/homework/");
  await page.getByRole("button", { name: /متابعة الواجب الأول/ }).click();
  await expect(page.getByRole("dialog").getByText("يوسف")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: /متابعة الواجب الثاني/ }).click();
  await expect(page.getByRole("dialog").getByText("يوسف")).toHaveCount(0);
  await expect(page.getByRole("dialog").getByText("مريم")).toBeVisible();
});

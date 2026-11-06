import { test, expect, type Page, type Route } from "@playwright/test";

// قرارات م. أحمد والوالدة: صيغة المؤنث للبنات، إشعار تصحيح السؤال، مشاركة الواجب، وضع التصحيح للأدمن، والرمز الموحد

type Call = { action: string; [k: string]: unknown };
async function mock(page: Page, user: Record<string, unknown>, extra: (b: Call) => unknown = () => undefined) {
  const calls: Call[] = [];
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const data = extra(b);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: data === undefined ? [] : data }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
  return calls;
}
const GIRL = { user_id: "S2", name: "مريم", role: "student", class_id: "C1", avatar: "🌙", gender: "f" };
const QUIZ = { quiz_id: "Z1", title: "قصة سيدنا نوح عليه السلام", status: "published", prophet_id: "nuh", lecture_id: "", created_at: "1", count: 1, mine: null };

test("البنت: المنصة تخاطبها بصيغة المؤنث، وإشعار تصحيح السؤال يظهر في الرئيسية ويختفي بعد القراءة", async ({ page }) => {
  const calls = await mock(page, GIRL, (b) => {
    if (b.action === "me") return { points: 10, attended: [], rank: 1, total: 2 };
    if (b.action === "notices") return [{ notice_id: "N1", text: "تم تعديل سؤال في اختبار «قصة سيدنا نوح عليه السلام» لأنه كان فيه خطأ. نتيجتك الآن ٢ من ٢، وزادت نجومك ١٠.", at: "x" }];
    if (b.action === "quizzes") return [QUIZ];
    if (b.action === "quiz") return { quiz: QUIZ, questions: [{ question_id: "q1", text: "من صنع السفينة؟", options: ["سيدنا نوح عليه السلام", "غيره"], image_file_id: "" }], mine: null };
    if (b.action === "readNotice") return true;
  });
  await page.goto("/Serah/kid/");
  await expect(page.getByText("قولي للمعلمة اقتراحك")).toBeVisible();
  const notice = page.getByTestId("kid-notice");
  await expect(notice).toContainText("وزادت نجومك ١٠");
  await notice.getByRole("button", { name: "تمام، قرأته" }).click();
  await expect(notice).toHaveCount(0);
  expect(calls.find((c) => c.action === "readNotice")).toMatchObject({ notice_id: "N1" });
  await page.goto("/Serah/kid/quiz/?id=Z1");
  await expect(page.getByText("تكسبي لحد ٢٠ نجمة")).toBeVisible();
  await expect(page.getByText(/اختاري الإجابة الصح/)).toBeVisible();
});

test("المعلمة: تحدد ولد/بنت للطفل عند الإضافة", async ({ page }) => {
  const calls = await mock(page, { user_id: "T2", name: "معلمة ثانية", role: "teacher", class_id: "C1", avatar: "" }, (b) => {
    if (b.action === "students") return [{ user_id: "S2", name: "مريم", avatar: "🌙", gender: "f", points: 5 }];
    if (b.action === "addStudent") return { user_id: "S9" };
  });
  await page.goto("/Serah/teacher/students/");
  await expect(page.getByText("بنت · 5 نجمة")).toBeVisible();
  await page.getByRole("button", { name: /إضافة طفل/ }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("الاسم").fill("فاطمة");
  await d.getByLabel(/الرمز السري/).fill("1234");
  await d.getByRole("radio", { name: /بنت/ }).click();
  await d.getByRole("button", { name: /إضافة|حفظ/ }).last().click();
  await expect.poll(() => calls.find((c) => c.action === "addStudent")).toMatchObject({ name: "فاطمة", gender: "f" });
});

test("الواجب: واجب معلمة أخرى بلا أزرار إدارة، والصاحبة تشاركه مع معلمة", async ({ page }) => {
  const W = (id: string, title: string, extra: object) => ({ assignment_id: id, title, details: "", due: "", prophet_id: "", lecture_id: "", created_at: id, kids: 2, done: 0, approved: 0, helpers: [], ...extra });
  const calls = await mock(page, { user_id: "T2", name: "معلمة ثانية", role: "teacher", class_id: "C1", avatar: "" }, (b) => {
    if (b.action === "assignments") return [W("W1", "واجب مروة", { can_manage: false, created_by: "T3", created_by_name: "مروة" }), W("W2", "واجبي", { can_manage: true, created_by: "T2", created_by_name: "معلمة ثانية" })];
    if (b.action === "classTeachers") return [{ user_id: "T3", name: "مروة", role: "teacher" }];
    if (b.action === "saveAssignment") return "W2";
  });
  await page.goto("/Serah/teacher/homework/");
  const other = page.getByTestId("homework-card").filter({ hasText: "واجب مروة" });
  await expect(other).toContainText("من أ. مروة");
  await expect(other.getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "تعديل واجبي" }).click();
  const d = page.getByRole("dialog");
  await d.getByRole("checkbox", { name: /أ. مروة/ }).click();
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "saveAssignment")).toMatchObject({ assignment_id: "W2", helpers: ["T3"] });
});

test("الأدمن: تصحيح اختبار حلّه أطفال — تصحيح فقط بدون إضافة أو حذف", async ({ page }) => {
  const calls = await mock(page, { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" }, (b) => {
    if (b.action === "quizzes") return [{ ...QUIZ, results: 3 }];
    if (b.action === "quiz") return { quiz: QUIZ, questions: [{ question_id: "q1", text: "من صنع السفينة؟", options: ["سيدنا نوح عليه السلام", "غيره"], image_file_id: "", correct: 1 }] };
    if (b.action === "saveQuiz") return "Z1";
  });
  await page.goto("/Serah/teacher/quizzes/");
  await page.getByRole("button", { name: `تعديل ${QUIZ.title}` }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByRole("note")).toContainText("يُعاد تصحيح نتائجهم");
  await expect(d.getByRole("button", { name: /إضافة سؤال/ })).toHaveCount(0);
  await expect(d.getByRole("button", { name: "حذف السؤال 1" })).toBeDisabled();
  await d.getByRole("button", { name: "الإجابة الصحيحة للسؤال 1: الاختيار أ" }).click();
  await d.getByRole("button", { name: "حفظ التصحيح" }).click();
  await expect.poll(() => calls.find((c) => c.action === "saveQuiz")).toMatchObject({ quiz_id: "Z1" });
  expect((calls.find((c) => c.action === "saveQuiz")!.questions as { correct: number }[])[0].correct).toBe(0);
});

test("ذو الكفل وإلياس واليسع: الرمز الموحد «نبيّ كريم» بشكل واحد بلا نقاط تنقل", async ({ page }) => {
  await mock(page, GIRL, (b) => b.action === "prophet" ? { prophet: { prophet_id: b.id, name: "إلياس", title: "", tag: "", text: "", symbol: "", symbol_name: "" }, items: [] } : undefined);
  await page.goto("/Serah/kid/prophet/?id=ilyas");
  const stage = page.getByRole("region", { name: /رمز سيدنا/ });
  await expect(stage.getByText("نبيّ كريم")).toBeVisible();
  await expect(stage.getByText("بَعْل")).toBeVisible();
  await expect(stage.getByRole("tab")).toHaveCount(0);
  await expect(stage.getByText("اضغط على الشكل")).toHaveCount(0);
});

test("البنت يرافقها «حبيبة» بدل «زيد»", async ({ page }) => {
  await mock(page, GIRL, (b) => (b.action === "me" ? { points: 0, attended: [], rank: 1, total: 1, gender: "f" } : undefined));
  await page.goto("/Serah/kid/");
  await expect(page.getByRole("img", { name: /^حبيبة/ }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /^زيد/ })).toHaveCount(0);
});

test("الولد الذي غيّرته المعلمة لبنت: الشخصية تتحول لحبيبة بدون خروج", async ({ page }) => {
  await mock(page, { ...GIRL, gender: "m" }, (b) => (b.action === "me" ? { points: 0, attended: [], rank: 1, total: 1, gender: "f" } : undefined));
  await page.goto("/Serah/kid/");
  await expect(page.getByRole("img", { name: /^حبيبة/ }).first()).toBeVisible();
});

test("إدارة الرحلة: تحديد عدة أنبياء وإخفاؤهم مرة واحدة، وإظهار الكل", async ({ page }, info) => {
  // WebKit على ويندوز لا يعتبر الصف «ثابتًا» أبدًا (نفس مشكلة الرسم السابقة)، فنضغط مباشرة هناك
  const force = info.project.name === "iphone";
  const rows = ["nuh", "hud", "salih"].map((id, i) => ({ prophet_id: id, name: id, title: "", tag: "", text: "", symbol: "", symbol_name: "", visible: true, items: 0, pending: 0, sort: i }));
  const calls = await mock(page, { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" }, (b) => (b.action === "journeyAdmin" ? rows : b.action === "setProphetsVisible" ? 2 : undefined));
  await page.goto("/Serah/teacher/journey/");
  await page.getByRole("checkbox", { name: "تحديد nuh" }).click({ force });
  await expect(page.getByRole("checkbox", { name: "تحديد nuh" })).toBeChecked();
  await page.getByRole("checkbox", { name: "تحديد salih" }).click({ force });
  await page.getByRole("button", { name: /إخفاء المحدد/ }).click();
  await expect.poll(() => calls.find((c) => c.action === "setProphetsVisible")).toMatchObject({ ids: ["nuh", "salih"], visible: false });
  await page.getByRole("button", { name: /إظهار الكل/ }).click();
  await expect.poll(() => calls.filter((c) => c.action === "setProphetsVisible").length).toBe(2);
  expect(calls.filter((c) => c.action === "setProphetsVisible")[1]).toMatchObject({ all: true, visible: true });
});

test("صفحة «من نحن»: الفريق ثم صفحة أحمد الشخصية، ورابطها في صفحة الدخول", async ({ page }) => {
  await page.goto("/Serah/");
  await page.getByRole("link", { name: /من نحن/ }).click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.getByText("اتنين صحاب")).toBeVisible();
  await expect(page.getByRole("link", { name: "الصفحة الشخصية: عبد الله" })).toHaveAttribute("href", /\/about\/abdullah\/$/);
  await page.getByRole("link", { name: "الصفحة الشخصية: أحمد" }).click();
  await expect(page).toHaveURL(/\/about\/ahmad\/$/);
  await expect(page.getByText("جامعة الملك سعود").first()).toBeVisible();
  await expect(page.getByText("ادعولي اتجوز")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("اللوجو وزر «الرئيسية» يرجعان كل مستخدم لرئيسيته، والزر يختفي على الرئيسية", async ({ page }) => {
  await mock(page, GIRL);
  await page.goto("/Serah/kid/tasks/");
  await expect(page.getByRole("link", { name: "المُنْتَهَى — الرئيسية" })).toHaveAttribute("href", /\/kid\/$/);
  await page.getByRole("link", { name: "رجوع للرئيسية" }).click();
  await expect(page).toHaveURL(/\/Serah\/kid\/$/);
  await expect(page.getByRole("link", { name: "رجوع للرئيسية" })).toHaveCount(0);
});

test("المعلمة داخل صفحات الطفل: اللوجو يرجعها للوحتها", async ({ page }) => {
  await mock(page, { user_id: "T2", name: "معلمة", role: "teacher", class_id: "C1", avatar: "" });
  await page.goto("/Serah/kid/quran/");
  await expect(page.getByRole("link", { name: "المُنْتَهَى — الرئيسية" })).toHaveAttribute("href", /\/teacher\/$/);
  await expect(page.getByRole("link", { name: "رجوع للرئيسية" })).toHaveAttribute("href", /\/teacher\/$/);
});

test("أسماء الله الحسنى: ٩٩ اسمًا، والبحث، وبطاقة الاسم بالمعنى والدليل، والتنقل والعداد", async ({ page }) => {
  await mock(page, GIRL);
  await page.goto("/Serah/kid/names/");
  await expect(page.getByRole("list", { name: "الأسماء" }).getByRole("button")).toHaveCount(99);
  await page.getByLabel("بحث في الأسماء").fill("رحمن");
  await expect(page.getByRole("list", { name: "الأسماء" }).getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: /^الرحمن —/ }).click();
  const d = page.getByRole("dialog", { name: "اسم الله الرحمن" });
  await expect(d).toBeVisible();
  await expect(d.locator("[data-ayah-text]").first()).toBeVisible();
  await d.getByRole("button", { name: "الاسم التالي" }).click();
  await expect(page.getByRole("dialog", { name: "اسم الله الرحيم" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/تعرّفتِ على ٢ من ٩٩/)).toBeVisible();
});

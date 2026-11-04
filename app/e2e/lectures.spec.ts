import { test, expect, type Page, type Route } from "@playwright/test";

// المرحلة 4 (الموقع): تعديل المحاضرة وصورها، الحذف حسب الصلاحية، تعديل الطفل، ربط تيليجرام، واختيار النبي عند الرفع

type Call = { action: string; [k: string]: unknown };
const TEACHER = { user_id: "T2", name: "معلمة ثانية", role: "teacher", class_id: "C1", avatar: "" };
const ADMIN = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const LECTURES = () => [
  { lecture_id: "L1", class_id: "C1", title: "قصة نوح", date: "2026-11-01", audio_file_id: "a1", duration_sec: 600, status: "draft", images: ["f1", "f2"],
    imageItems: [{ image_id: "I1", file_id: "f1" }, { image_id: "I2", file_id: "f2" }], prophet_id: "", notes: "" },
  { lecture_id: "L2", class_id: "C1", title: "قصة يوسف", date: "2026-10-20", audio_file_id: "a2", duration_sec: 300, status: "published", images: [], imageItems: [], prophet_id: "yusuf", notes: "" },
];

async function mock(page: Page, user: typeof TEACHER) {
  const calls: Call[] = [];
  const lectures = LECTURES();
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    switch (b.action) {
      case "lectures": return ok(lectures);
      case "journey": return ok([]);
      case "updateLecture": { const l = lectures.find((x) => x.lecture_id === b.lecture_id); if (l) Object.assign(l, b); return ok(true); }
      case "deleteLecture": lectures.splice(lectures.findIndex((l) => l.lecture_id === b.lecture_id), 1); return ok(true);
      case "startUpload": return ok({ uploadUrl: "https://upload.test/session" });
      case "addLectureImage": return ok("I9");
      case "createLecture": return ok({ lecture_id: "L7" });
      case "students": return ok([{ user_id: "S1", name: "يوسف", avatar: "🌟", points: 10 }]);
      case "tgLinkToken": return ok({ url: "https://t.me/Serah_2026_bot?start=abc123" });
      case "classCode": return ok({ code: "SERAH1" });
      default: return ok(true);
    }
  });
  // جلسة الرفع على درايف: نرد بمعرّف الملف
  await page.route("https://upload.test/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "new-file" }) }));
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t-" + u.user_id); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
  return calls;
}
const png = { name: "p.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") };

test("تعديل المحاضرة: العنوان والنبي، وترتيب الصور وحذفها وإضافتها", async ({ page }) => {
  const calls = await mock(page, TEACHER);
  await page.goto("/Serah/teacher/lectures/");
  await page.getByRole("button", { name: "تعديل قصة نوح" }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByTestId("lecture-image")).toHaveCount(2);
  await d.getByRole("button", { name: "تقديم صورة 2" }).click();
  await expect.poll(() => calls.find((c) => c.action === "reorderLectureImages")).toMatchObject({ lecture_id: "L1", ids: ["I2", "I1"] });
  await d.getByRole("button", { name: "حذف صورة 1" }).click();
  await expect.poll(() => calls.find((c) => c.action === "deleteLectureImage")).toMatchObject({ image_id: "I2" });
  await expect(d.getByTestId("lecture-image")).toHaveCount(1);
  await d.getByLabel("إضافة صور").setInputFiles(png);
  await expect.poll(() => calls.find((c) => c.action === "addLectureImage")).toMatchObject({ lecture_id: "L1", file_id: "new-file" });
  await expect(d.getByTestId("lecture-image")).toHaveCount(2);
  await d.getByLabel("العنوان").fill("قصة سيدنا نوح");
  await d.getByLabel("عن أي نبي؟").selectOption("noah");
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "updateLecture")).toMatchObject({ lecture_id: "L1", title: "قصة سيدنا نوح", prophet_id: "noah", date: "2026-11-01" });
  await expect(page.getByText("قصة سيدنا نوح")).toBeVisible();
});

test("الحذف: المعلمة تحذف المسودة فقط، والأدمن تحذف المنشورة", async ({ page }) => {
  let calls = await mock(page, TEACHER);
  await page.goto("/Serah/teacher/lectures/");
  await expect(page.getByRole("button", { name: "حذف قصة يوسف" })).toHaveCount(0);
  await page.getByRole("button", { name: "حذف قصة نوح" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "حذف" }).click();
  await expect.poll(() => calls.find((c) => c.action === "deleteLecture")).toMatchObject({ lecture_id: "L1" });
  await expect(page.getByText("قصة نوح", { exact: true })).toHaveCount(0);

  await page.context().clearCookies();
  const p2 = await page.context().newPage();
  calls = await mock(p2, ADMIN);
  await p2.goto("/Serah/teacher/lectures/");
  await expect(p2.getByRole("button", { name: "حذف قصة يوسف" })).toBeVisible();
  await expect(p2.getByText("يوسف").first()).toBeVisible();
});

test("تعديل اسم الطفل وشكله", async ({ page }) => {
  const calls = await mock(page, TEACHER);
  await page.goto("/Serah/teacher/students/");
  await page.getByRole("button", { name: "تعديل يوسف" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("الاسم").fill("يوسف أحمد");
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "updateStudent")).toMatchObject({ user_id: "S1", name: "يوسف أحمد" });
});

test("ربط تيليجرام من الإعدادات: زر واحد يفتح البوت بالرمز", async ({ page }) => {
  await mock(page, TEACHER);
  await page.goto("/Serah/teacher/settings/");
  await page.getByRole("button", { name: "ربط تيليجرام" }).click();
  await expect(page.getByRole("link", { name: /افتحي تيليجرام/ })).toHaveAttribute("href", "https://t.me/Serah_2026_bot?start=abc123");
});

test("الرفع من الموقع: اختيار النبي يقترح العنوان ويُحفظ مع المحاضرة", async ({ page }) => {
  const calls = await mock(page, TEACHER);
  await page.goto("/Serah/teacher/upload/");
  await page.getByLabel("المحاضرة عن أي نبي؟").selectOption("yusuf");
  await expect(page.getByLabel("اسم المحاضرة")).toHaveValue("قصة سيدنا يوسف");
  await page.locator("input[type=file]").setInputFiles({ name: "a.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("ID3") });
  await page.getByRole("button", { name: /رفع|ارفعي|إرسال/ }).last().click();
  await expect.poll(() => calls.find((c) => c.action === "createLecture")).toMatchObject({ title: "قصة سيدنا يوسف", audio_file_id: "new-file" });
  await expect.poll(() => calls.find((c) => c.action === "updateLecture")).toMatchObject({ lecture_id: "L7", prophet_id: "yusuf" });
});

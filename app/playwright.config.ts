import { defineConfig, devices } from "@playwright/test";

// اختبارات المتصفح: npx playwright test (يشغّل خادم التطوير تلقائيًا)
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  // اختبار واحد في كل مرة: اختبارات الرحلة ترسم WebGL بالمعالج (بدون كارت شاشة) وتتأخر لو اشتغل غيرها معها
  workers: 1,
  use: { baseURL: "http://localhost:3123", launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // أندرويد (كروم)
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // آيفون (محرك سفاري WebKit). ملاحظة: WebKit على ويندوز لا يشغّل أي صوت، فاختبارات تشغيل الصوت تُتخطى هنا
    { name: "iphone", use: { ...devices["iPhone 14"], launchOptions: {} } },
  ],
  webServer: { command: "npx next dev -p 3123", url: "http://localhost:3123/Serah/", reuseExistingServer: true, timeout: 180_000 },
});

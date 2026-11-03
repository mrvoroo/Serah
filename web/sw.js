// خدمة بسيطة: تخزّن ملفات الواجهة فقط لتعمل أسرع، ولا تخزّن بيانات الـ API
const CACHE = "serah-shell-v1";
const SHELL = ["./", "./index.html", "./app.js", "./style.css", "./config.js", "./manifest.json", "./icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

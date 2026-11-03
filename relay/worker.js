// وسيط Cloudflare Worker: يستلم ويب هوك تيليجرام ويردّ فورًا بـ 200،
// ثم يمرّر الرسالة إلى Google Apps Script (الذي يردّ بتحويل 302 لا يقبله تيليجرام).
// المتغيرات (Settings → Variables): APPS_SCRIPT_URL, RELAY_KEY (= WEBHOOK_KEY في السكريبت), TG_SECRET
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("ok");
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TG_SECRET) return new Response("forbidden", { status: 403 });
    const body = await request.text();
    ctx.waitUntil(forward(body, env));
    return new Response("ok");
  },
};

async function forward(body, env) {
  const url = env.APPS_SCRIPT_URL + "?k=" + encodeURIComponent(env.RELAY_KEY);
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, redirect: "follow" });
      const t = await r.text();
      if (r.ok && !/"ok":\s*false/.test(t)) return;
    } catch (e) {}
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
}

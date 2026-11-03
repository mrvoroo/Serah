/* واجهة التطبيق — بدون مكتبات لتكون سريعة وخفيفة */
const $app = document.getElementById("app");
const AVATARS = ["🦁","🐘","🐪","🕊️","🐑","🐢","🦋","🐬","🌟","🌴","🐦","🌙"];
const S = { token: localStorage.getItem("serah_token"), user: JSON.parse(localStorage.getItem("serah_user") || "null") };

/* ---------- الاتصال بالـ API ---------- */
async function api(action, params = {}) {
  const res = await fetch(SERAH.API_URL, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, // يتجنب طلب preflight
    body: JSON.stringify({ action, token: S.token, ...params })
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error);
  return j.data;
}
const h = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const audioUrl = id => `https://drive.usercontent.google.com/download?id=${id}&export=download`;
const imgUrl = id => `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
function saveSession(d) { S.token = d.token; S.user = d.user; localStorage.setItem("serah_token", d.token); localStorage.setItem("serah_user", JSON.stringify(d.user)); }
function logout() { localStorage.clear(); S.token = S.user = null; viewWelcome(); }

/* ---------- شاشة الترحيب / الدخول ---------- */
function viewWelcome() {
  $app.innerHTML = `
    <div class="card"><h1>أهلاً بك 🌟</h1><p>اكتب كود الفصل لتبدأ رحلتك</p>
      <input id="code" placeholder="كود الفصل" autocapitalize="characters" dir="ltr">
      <div class="err" id="err"></div>
      <button class="btn" id="go">هيا بنا ✨</button>
      <button class="btn ghost" id="t">دخول المعلمة</button></div>`;
  document.getElementById("go").onclick = async () => {
    try { viewPickKid(await api("classInfo", { code: document.getElementById("code").value })); }
    catch (e) { document.getElementById("err").textContent = e.message; }
  };
  document.getElementById("t").onclick = viewTeacherLogin;
}

function viewPickKid(cls) {
  $app.innerHTML = `<h2>من أنت؟</h2><div class="avatars">${cls.kids.map((k, i) =>
    `<div class="av" style="animation-delay:${i * 60}ms" data-id="${h(k.user_id)}">${h(k.avatar || AVATARS[i % AVATARS.length])}<small>${h(k.name)}</small></div>`).join("")}</div>
    <button class="btn ghost" id="back">رجوع</button>`;
  document.getElementById("back").onclick = viewWelcome;
  $app.querySelectorAll(".av").forEach(el => el.onclick = () => viewPin(el.dataset.id, el.innerText));
}

function viewPin(user_id, label) {
  let pin = "";
  const draw = () => document.getElementById("dots").textContent = "●".repeat(pin.length) + "○".repeat(4 - pin.length);
  $app.innerHTML = `<div class="card"><h2>${h(label)}</h2><p>اكتب رمزك السري</p><div class="dots" id="dots"></div><div class="err" id="err"></div>
    <div class="pad">${[1,2,3,4,5,6,7,8,9,"⌫",0,"✓"].map(n => `<button data-n="${n}">${n}</button>`).join("")}</div></div>`;
  draw();
  $app.querySelectorAll(".pad button").forEach(b => b.onclick = async () => {
    const n = b.dataset.n;
    if (n === "⌫") pin = pin.slice(0, -1); else if (n !== "✓" && pin.length < 4) pin += n;
    draw();
    if (pin.length === 4 || n === "✓") {
      try { saveSession(await api("login", { user_id, pin })); viewHome(); }
      catch (e) { document.getElementById("err").textContent = e.message; pin = ""; draw(); }
    }
  });
}

function viewTeacherLogin() {
  $app.innerHTML = `<div class="card"><h2>دخول المعلمة</h2>
    <input id="n" placeholder="الاسم"><input id="p" type="password" inputmode="numeric" placeholder="الرمز السري">
    <div class="err" id="err"></div><button class="btn" id="go">دخول</button><button class="btn ghost" id="back">رجوع</button></div>`;
  document.getElementById("back").onclick = viewWelcome;
  document.getElementById("go").onclick = async () => {
    try { saveSession(await api("login", { name: n.value.trim(), pin: p.value })); viewHome(); }
    catch (e) { document.getElementById("err").textContent = e.message; }
  };
}

/* ---------- الرئيسية ---------- */
async function viewHome() {
  if (!S.token) return viewWelcome();
  const teacher = S.user.role !== "student";
  $app.innerHTML = `<div class="card">جارٍ التحميل… ⏳</div>`;
  try {
    const lectures = await api("lectures");
    $app.innerHTML = `<h2>${teacher ? "لوحة المعلمة" : "مرحبًا " + h(S.user.name) + " 🌟"}</h2>
      ${lectures.length ? lectures.map(l => `<div class="card"><h3>${h(l.title)}</h3>
         <div>${h(String(l.date).slice(0, 10))} ${l.status === "draft" ? '<span class="badge">مسودة</span>' : ""}</div>
         <button class="btn" data-play="${h(l.lecture_id)}">▶ استمع وشاهد</button>
         ${teacher ? `<button class="btn alt" data-pub="${h(l.lecture_id)}" data-st="${l.status === "draft" ? "published" : "draft"}">${l.status === "draft" ? "اعتماد ونشر للأطفال" : "إخفاء"}</button>` : ""}</div>`).join("")
        : '<div class="card">لا توجد محاضرات بعد 🌙</div>'}
      ${teacher ? `<button class="btn alt" id="st">👧 الطلاب</button><a class="btn" href="upload.html" style="text-decoration:none">🎙 رفع محاضرة جديدة</a>` : ""}
      <button class="btn ghost" id="lb">🏆 لوحة النجوم</button>
      <button class="btn ghost" id="sg">💡 عندي فكرة</button>
      ${teacher ? '<button class="btn ghost" id="cc">🏷 كود الفصل</button><button class="btn ghost" id="pw">🔑 تغيير الرمز السري</button>' : ""}
      <button class="btn ghost" id="out">خروج</button>`;
    if (teacher) { document.getElementById("pw").onclick = viewChangePin; document.getElementById("cc").onclick = viewClassCode; }
    $app.querySelectorAll("[data-play]").forEach(b => b.onclick = () => viewPlayer(lectures.find(l => l.lecture_id === b.dataset.play)));
    $app.querySelectorAll("[data-pub]").forEach(b => b.onclick = async () => { await api("setLectureStatus", { lecture_id: b.dataset.pub, status: b.dataset.st }); viewHome(); });
    document.getElementById("lb").onclick = viewBoard;
    if (teacher) document.getElementById("st").onclick = viewStudents;
    document.getElementById("sg").onclick = viewSuggest;
    document.getElementById("out").onclick = logout;
  } catch (e) { if (/جلسة|مسجل|رمز/.test(e.message)) return logout(); $app.innerHTML = `<div class="card err">${h(e.message)}</div>`; }
}

/* ---------- مشغّل المحاضرة: الصور تتغير تلقائيًا مع الصوت ---------- */
function viewPlayer(l) {
  const imgs = l.images || [];
  $app.innerHTML = `<h2>${h(l.title)}</h2><div class="stage" id="stage"></div>
    <div id="cnt" class="badge" style="margin-top:10px"></div>
    <div class="row"><button class="btn ghost" id="prev">▶ السابقة</button><button class="btn ghost" id="next">التالية ◀</button></div>
    <audio id="au" controls preload="metadata" src="${audioUrl(l.audio_file_id)}"></audio>
    <button class="btn ghost" id="back">رجوع</button>`;
  const au = document.getElementById("au"), stage = document.getElementById("stage");
  let cur = -1, manualUntil = 0;
  const show = i => {
    if (!imgs.length || i === cur) return; cur = Math.max(0, Math.min(imgs.length - 1, i));
    stage.innerHTML = `<img alt="" src="${imgUrl(imgs[cur])}">`;
    document.getElementById("cnt").textContent = `${cur + 1} / ${imgs.length}`;
  };
  const auto = () => { // توزيع الصور بالتساوي على مدة الصوت
    if (Date.now() < manualUntil || !au.duration || !isFinite(au.duration)) return;
    show(Math.min(imgs.length - 1, Math.floor((au.currentTime / au.duration) * imgs.length)));
  };
  au.addEventListener("timeupdate", auto);
  au.addEventListener("seeked", () => { manualUntil = 0; auto(); });
  document.getElementById("next").onclick = () => { manualUntil = Date.now() + 15000; show(cur + 1); };
  document.getElementById("prev").onclick = () => { manualUntil = Date.now() + 15000; show(cur - 1); };
  document.getElementById("back").onclick = () => { au.pause(); viewHome(); };
  au.addEventListener("play", () => { if (S.user.role === "student") api("markAttendance", { lecture_id: l.lecture_id }).catch(() => {}); }, { once: true });
  show(0);
}

/* ---------- إدارة الطلاب (للمعلمة) ---------- */
async function viewStudents(msg) {
  const list = await api("students");
  let av = AVATARS[0];
  $app.innerHTML = `<h2>👧 الطلاب (${list.length})</h2>${typeof msg === "string" ? `<div class="card">${h(msg)}</div>` : ""}
    ${list.map(k => `<div class="card"><div style="font-size:40px">${h(k.avatar)}</div><b>${h(k.name)}</b> — ${k.points} ⭐
      <div class="row"><button class="btn ghost" data-pin="${h(k.user_id)}">رمز جديد</button><button class="btn ghost" data-del="${h(k.user_id)}">حذف</button></div></div>`).join("") || '<div class="card">لم تتم إضافة طلاب بعد</div>'}
    <div class="card"><h3>إضافة طفل</h3><input id="nm" placeholder="اسم الطفل"><input id="pn" inputmode="numeric" maxlength="4" placeholder="رمز سري من 4 أرقام">
      <div>اختاري الشكل:</div><div class="avatars" id="avs">${AVATARS.map(a => `<div class="av ${a === av ? "sel" : ""}" data-a="${a}">${a}</div>`).join("")}</div>
      <div class="err" id="err"></div><button class="btn" id="add">إضافة</button></div>
    <button class="btn ghost" id="back">رجوع</button>`;
  document.getElementById("back").onclick = viewHome;
  $app.querySelectorAll("#avs .av").forEach(el => el.onclick = () => { av = el.dataset.a; $app.querySelectorAll("#avs .av").forEach(x => x.classList.toggle("sel", x === el)); });
  document.getElementById("add").onclick = async () => {
    try { await api("addStudent", { name: document.getElementById("nm").value, pin: document.getElementById("pn").value, avatar: av }); viewStudents("تمت إضافة الطفل ✔"); }
    catch (e) { document.getElementById("err").textContent = e.message; }
  };
  $app.querySelectorAll("[data-pin]").forEach(b => b.onclick = async () => {
    const pin = prompt("اكتبي الرمز السري الجديد (4 أرقام)"); if (!pin) return;
    try { await api("setStudentPin", { user_id: b.dataset.pin, pin }); viewStudents("تم تغيير الرمز ✔"); } catch (e) { alert(e.message); }
  });
  $app.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("حذف هذا الطفل من الفصل؟")) return;
    try { await api("removeStudent", { user_id: b.dataset.del }); viewStudents("تم الحذف"); } catch (e) { alert(e.message); }
  });
}

async function viewClassCode() {
  const { code } = await api("classCode");
  $app.innerHTML = `<div class="card"><h2>🏷 كود الفصل</h2><p>الأطفال يكتبون هذا الكود في أول شاشة</p>
    <div class="dots" style="letter-spacing:4px" dir="ltr">${h(code)}</div><input id="c" dir="ltr" placeholder="كود جديد (حروف إنجليزية أو أرقام)">
    <div class="err" id="err"></div><button class="btn" id="go">تغيير الكود</button><button class="btn ghost" id="back">رجوع</button></div>`;
  document.getElementById("back").onclick = viewHome;
  document.getElementById("go").onclick = async () => {
    try { await api("setClassCode", { code: document.getElementById("c").value }); viewClassCode(); }
    catch (e) { document.getElementById("err").textContent = e.message; }
  };
}

function viewChangePin() {
  $app.innerHTML = `<div class="card"><h2>🔑 تغيير الرمز السري</h2><input id="o" type="password" inputmode="numeric" placeholder="الرمز الحالي"><input id="n" type="password" inputmode="numeric" placeholder="الرمز الجديد">
    <div class="err" id="err"></div><button class="btn" id="go">حفظ</button><button class="btn ghost" id="back">رجوع</button></div>`;
  document.getElementById("back").onclick = viewHome;
  document.getElementById("go").onclick = async () => {
    try { await api("changeMyPin", { oldPin: document.getElementById("o").value, newPin: document.getElementById("n").value }); viewHome(); }
    catch (e) { document.getElementById("err").textContent = e.message; }
  };
}

/* ---------- لوحة النجوم ---------- */
async function viewBoard() {
  const d = await api("leaderboard");
  $app.innerHTML = `<h2>🏆 لوحة النجوم</h2>${d.top.map((k, i) => `<div class="card">${["🥇","🥈","🥉"][i] || i + 1} ${h(k.avatar)} <b>${h(k.name)}</b> — ${k.points} ⭐</div>`).join("")}
    ${S.user.role === "student" && d.me ? `<div class="card">ترتيبك: ${d.me}</div>` : ""}<button class="btn ghost" id="back">رجوع</button>`;
  document.getElementById("back").onclick = viewHome;
}

/* ---------- صندوق الاقتراحات ---------- */
function viewSuggest() {
  $app.innerHTML = `<div class="card"><h2>💡 عندي فكرة</h2><p>اكتب فكرتك وسنقرؤها بإذن الله</p>
    <input id="t" placeholder="اكتب هنا"><div class="err" id="err"></div><button class="btn" id="go">إرسال</button><button class="btn ghost" id="back">رجوع</button></div>`;
  document.getElementById("back").onclick = viewHome;
  document.getElementById("go").onclick = async () => {
    try { await api("suggest", { text: document.getElementById("t").value }); $app.innerHTML = `<div class="card"><h2>شكرًا لك 🌟</h2><button class="btn" id="b">رجوع</button></div>`; document.getElementById("b").onclick = viewHome; }
    catch (e) { document.getElementById("err").textContent = e.message; }
  };
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
S.token ? viewHome() : viewWelcome();

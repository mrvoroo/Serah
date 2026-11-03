/**
 * منصة رحلة مع الأنبياء — الخلفية (Google Apps Script)
 * قاعدة البيانات: Google Sheets | الملفات: Google Drive
 * الأسرار (توكن البوت وغيره) تُحفظ في Script Properties فقط ولا تُكتب هنا أبدًا.
 */

/* ============ 1) هيكل الجداول ============ */
const SCHEMA = {
  Classes:      ['class_id', 'name', 'teacher_id', 'join_code', 'created_at'],
  Users:        ['user_id', 'role', 'name', 'class_id', 'avatar', 'pin_hash', 'city', 'country', 'telegram_id', 'active', 'created_at'],
  Lectures:     ['lecture_id', 'class_id', 'title', 'date', 'audio_file_id', 'duration_sec', 'status', 'notes', 'created_by', 'created_at'],
  LectureImages:['image_id', 'lecture_id', 'sort', 'file_id'],
  Attendance:   ['lecture_id', 'user_id', 'at'],
  Quizzes:      ['quiz_id', 'class_id', 'lecture_id', 'title', 'status', 'created_at'],
  Questions:    ['question_id', 'quiz_id', 'text', 'opt_a', 'opt_b', 'opt_c', 'opt_d', 'correct', 'points'],
  Results:      ['quiz_id', 'user_id', 'score', 'total', 'at'],
  Assignments:  ['assignment_id', 'class_id', 'lecture_id', 'title', 'details', 'due', 'created_at'],
  Points:       ['user_id', 'points', 'reason', 'at'],
  Suggestions:  ['id', 'from_user', 'role', 'text', 'audio_file_id', 'status', 'at'],
  BotState:     ['chat_id', 'state', 'data', 'at']
};
const MAX_BOT_DOWNLOAD = 20 * 1024 * 1024; // حد تنزيل البوت من تيليجرام (20MB)

function props_() { return PropertiesService.getScriptProperties(); }
function prop_(k) { return props_().getProperty(k); }

// معرّف الشيت (ليس سرًا). السكريبت يعمل كمشروع مستقل ويفتح الشيت بهذا المعرّف.
const DEFAULT_SHEET_ID = '1rSVqAiyoQKLvlOYMCXaTYHR_7q3HSz2RHwFN2zwHjPU';

function ss_() {
  const id = prop_('SHEET_ID') || DEFAULT_SHEET_ID;
  return SpreadsheetApp.openById(id);
}

/** شغّلها مرة واحدة من المحرر: تنشئ الجداول ومجلدات درايف */
function setup() {
  const ss = ss_();
  props_().setProperty('SHEET_ID', ss.getId());
  Object.keys(SCHEMA).forEach(name => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1') || ss.getSheetByName('ورقة1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  if (!prop_('ROOT_FOLDER')) {
    const root = DriveApp.createFolder('Serah_Files');
    props_().setProperty('ROOT_FOLDER', root.getId());
    ['audio', 'images', 'docs', 'suggestions'].forEach(n =>
      props_().setProperty('FOLDER_' + n, root.createFolder(n).getId()));
  }
  if (!prop_('HMAC_KEY')) props_().setProperty('HMAC_KEY', Utilities.getUuid() + Utilities.getUuid());
  if (!prop_('PIN_SALT')) props_().setProperty('PIN_SALT', Utilities.getUuid());
  if (!prop_('WEBHOOK_KEY')) props_().setProperty('WEBHOOK_KEY', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('تم الإعداد ✔  اكمل: ضع BOT_TOKEN و SITE_ORIGIN في Script Properties');
}

/* ============ 2) أدوات الجداول ============ */
function rows_(name) {
  const sh = ss_().getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const head = v.shift();
  return v.map(r => { const o = {}; head.forEach((h, i) => o[h] = r[i]); return o; });
}
function append_(name, obj) {
  const sh = ss_().getSheetByName(name);
  sh.appendRow(SCHEMA[name].map(h => obj[h] === undefined ? '' : obj[h]));
  return obj;
}
function update_(name, keyCol, keyVal, patch) {
  const sh = ss_().getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const head = v[0], ki = head.indexOf(keyCol);
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][ki]) === String(keyVal)) {
      Object.keys(patch).forEach(k => { const ci = head.indexOf(k); if (ci >= 0) sh.getRange(i + 1, ci + 1).setValue(patch[k]); });
      return true;
    }
  }
  return false;
}
function id_(p) { return p + Utilities.getUuid().slice(0, 8); }
function now_() { return new Date().toISOString(); }
function day_(v) {
  const s = String(v || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = v instanceof Date ? v : new Date(s);
  return isNaN(d) ? s.slice(0, 10) : Utilities.formatDate(d, 'Asia/Riyadh', 'yyyy-MM-dd');
}

/* ============ 3) المصادقة (رمز موقّع بدون تخزين) ============ */
// يحوّل الأرقام العربية/الفارسية إلى إنجليزية ويحذف المسافات (لوحة المفاتيح العربية)
function normDigits_(s) {
  return String(s == null ? '' : s).trim()
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
}
function normName_(s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ');
}
function hashPin_(pin) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, prop_('PIN_SALT') + normDigits_(pin));
  return d.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
function sign_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, prop_('HMAC_KEY')));
}
function makeToken_(user) {
  const body = [user.user_id, user.role, user.class_id, Date.now() + 30 * 864e5].join('|');
  return Utilities.base64EncodeWebSafe(body) + '.' + sign_(body);
}
function auth_(token) {
  if (!token) throw new Error('غير مسجل');
  const [b, sig] = String(token).split('.');
  const body = Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString();
  if (sign_(body) !== sig) throw new Error('رمز غير صالح');
  const [user_id, role, class_id, exp] = body.split('|');
  if (Date.now() > Number(exp)) throw new Error('انتهت الجلسة');
  return { user_id, role, class_id };
}
function needTeacher_(me) { if (me.role !== 'teacher' && me.role !== 'admin') throw new Error('للمعلمات فقط'); }

/* ============ 4) واجهة الـ API ============ */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  return handle_(e.parameter.action, e.parameter, e.parameter.token);
}

function doPost(e) {
  // طلب من تيليجرام (الويب هوك) — يتحقق بمفتاح في الرابط
  if (e.parameter && e.parameter.k) {
    if (e.parameter.k !== prop_('WEBHOOK_KEY')) return json_({ ok: false });
    try {
      const upd = JSON.parse(e.postData.contents);
      const cache = CacheService.getScriptCache();
      const dupKey = 'upd' + upd.update_id;
      if (cache.get(dupKey)) return json_({ ok: true, dup: true }); // تيليجرام قد يعيد الإرسال
      const lock = LockService.getScriptLock();
      lock.waitLock(25000);
      try {
        if (cache.get(dupKey)) return json_({ ok: true, dup: true });
        cache.put(dupKey, '1', 6 * 3600);
        onTelegram_(upd);
      } finally { lock.releaseLock(); }
    } catch (err) { console.error(err); return json_({ ok: false, error: String(err) }); }
    return json_({ ok: true });
  }
  // طلب من التطبيق (نرسله بصيغة نص عادي لتجنب مشاكل CORS)
  const body = JSON.parse(e.postData.contents || '{}');
  return handle_(body.action, body, body.token);
}

const PUBLIC_ACTIONS = { login: 1, classInfo: 1, ping: 1 };

function handle_(action, p, token) {
  try {
    let me = null;
    if (!PUBLIC_ACTIONS[action]) me = auth_(token);
    const fn = ACTIONS[action];
    if (!fn) throw new Error('إجراء غير معروف');
    return json_({ ok: true, data: fn(p, me) });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

const ACTIONS = {
  ping: () => 'pong',

  // الطفل: كود الفصل → قائمة الأطفال بالأفاتار
  classInfo: (p) => {
    const c = rows_('Classes').find(x => String(x.join_code).toUpperCase() === normDigits_(p.code).toUpperCase().replace(/\s+/g, ''));
    if (!c) throw new Error('كود الفصل غير صحيح');
    const kids = rows_('Users').filter(u => u.class_id === c.class_id && u.role === 'student' && u.active !== false)
      .map(u => ({ user_id: u.user_id, name: u.name, avatar: u.avatar }));
    return { class_id: c.class_id, name: c.name, kids };
  },

  // دخول الطفل (user_id + رمز) أو المعلمة (name + رمز)
  login: (p) => {
    const users = rows_('Users');
    let u = p.user_id ? users.find(x => x.user_id === p.user_id)
                      : users.find(x => x.role !== 'student' && normName_(x.name) === normName_(p.name));
    if (!u || u.active === false || u.pin_hash !== hashPin_(p.pin)) throw new Error('الرمز غير صحيح');
    return { token: makeToken_(u), user: { user_id: u.user_id, name: u.name, role: u.role, class_id: u.class_id, avatar: u.avatar } };
  },

  // المحاضرات: الطفل يرى المنشور فقط، والمعلمة ترى الكل
  lectures: (p, me) => {
    const isT = me.role !== 'student';
    const list = rows_('Lectures').filter(l => l.class_id === me.class_id && (isT || l.status === 'published'));
    const imgs = rows_('LectureImages');
    return list.map(l => Object.assign({}, l, {
      images: imgs.filter(i => i.lecture_id === l.lecture_id).sort((a, b) => a.sort - b.sort).map(i => i.file_id)
    })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  // اعتماد/نشر المحاضرة (المراجعة الشرعية من والدة المشرف)
  setLectureStatus: (p, me) => {
    needTeacher_(me);
    if (['draft', 'published'].indexOf(p.status) < 0) throw new Error('حالة غير صحيحة');
    update_('Lectures', 'lecture_id', p.lecture_id, { status: p.status });
    return true;
  },

  markAttendance: (p, me) => {
    const dup = rows_('Attendance').some(a => a.lecture_id === p.lecture_id && a.user_id === me.user_id);
    if (!dup) { append_('Attendance', { lecture_id: p.lecture_id, user_id: me.user_id, at: now_() }); addPoints_(me.user_id, 10, 'حضور محاضرة'); }
    return true;
  },

  leaderboard: (p, me) => {
    const kids = rows_('Users').filter(u => u.class_id === me.class_id && u.role === 'student');
    const pts = {};
    rows_('Points').forEach(r => pts[r.user_id] = (pts[r.user_id] || 0) + Number(r.points));
    const all = kids.map(k => ({ user_id: k.user_id, name: k.name, avatar: k.avatar, points: pts[k.user_id] || 0 }))
      .sort((a, b) => b.points - a.points);
    return { top: all.slice(0, 10), me: all.findIndex(x => x.user_id === me.user_id) + 1 };
  },

  // ملخص الطفل: نقاطه ومحاضراته المسموعة وترتيبه
  me: (p, me) => {
    const pts = {};
    rows_('Points').forEach(r => pts[r.user_id] = (pts[r.user_id] || 0) + Number(r.points));
    const kids = rows_('Users').filter(u => u.class_id === me.class_id && u.role === 'student' && u.active !== false)
      .map(u => ({ id: u.user_id, p: pts[u.user_id] || 0 })).sort((a, b) => b.p - a.p);
    const attended = rows_('Attendance').filter(a => a.user_id === me.user_id).map(a => a.lecture_id);
    return { points: pts[me.user_id] || 0, attended, rank: kids.findIndex(k => k.id === me.user_id) + 1, total: kids.length };
  },

  // لوحة المعلمة: إحصائيات وتحليلات الفصل
  dashboard: (p, me) => {
    needTeacher_(me);
    const kids = rows_('Users').filter(u => u.class_id === me.class_id && u.role === 'student' && u.active !== false);
    const kidIds = {}; kids.forEach(k => kidIds[k.user_id] = k);
    const lectures = rows_('Lectures').filter(l => l.class_id === me.class_id)
      .sort((a, b) => day_(a.date).localeCompare(day_(b.date)));
    const att = rows_('Attendance').filter(a => kidIds[a.user_id]);
    const pts = {};
    rows_('Points').forEach(r => { if (kidIds[r.user_id]) pts[r.user_id] = (pts[r.user_id] || 0) + Number(r.points); });
    const perLecture = lectures.filter(l => l.status === 'published').slice(-8).map(l => ({
      title: String(l.title).slice(0, 24), date: day_(l.date),
      count: att.filter(a => a.lecture_id === l.lecture_id).length
    }));
    const published = lectures.filter(l => l.status === 'published');
    const possible = published.length * kids.length;
    const attPublished = att.filter(a => published.some(l => l.lecture_id === a.lecture_id)).length;
    // نشاط آخر 14 يومًا
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const key = Utilities.formatDate(d, 'Asia/Riyadh', 'yyyy-MM-dd');
      days.push({ day: key.slice(5), count: att.filter(a => day_(a.at) === key).length });
    }
    const top = kids.map(k => ({ user_id: k.user_id, name: k.name, avatar: k.avatar, points: pts[k.user_id] || 0 }))
      .sort((a, b) => b.points - a.points).slice(0, 5);
    const recent = att.slice(-6).reverse().map(a => {
      const l = lectures.find(x => x.lecture_id === a.lecture_id);
      return { name: kidIds[a.user_id].name, avatar: kidIds[a.user_id].avatar, lecture: l ? l.title : '', at: a.at };
    });
    const sugg = rows_('Suggestions').filter(s => s.status === 'جديد').length;
    return {
      kids: kids.length, lectures: lectures.length, published: published.length, drafts: lectures.length - published.length,
      attendanceRate: possible ? Math.round(attPublished / possible * 100) : 0,
      totalPoints: Object.keys(pts).reduce((s, k) => s + pts[k], 0),
      perLecture, days, top, recent, newSuggestions: sugg
    };
  },

  suggestions: (p, me) => {
    needTeacher_(me);
    const users = {}; rows_('Users').forEach(u => users[u.user_id] = u);
    return rows_('Suggestions').slice(-50).reverse().map(s => ({ id: s.id, text: s.text, status: s.status, at: s.at,
      name: users[s.from_user] ? users[s.from_user].name : '' }));
  },

  // صندوق الاقتراحات: يراه المشرف فقط
  suggest: (p, me) => {
    const text = String(p.text || '').slice(0, 1000);
    if (!text) throw new Error('اكتب اقتراحك');
    append_('Suggestions', { id: id_('s'), from_user: me.user_id, role: me.role, text, status: 'جديد', at: now_() });
    return true;
  },

  // رفع ملف كبير: ننشئ جلسة رفع متصلة على درايف ويرفع المتصفح مباشرة
  startUpload: (p, me) => {
    needTeacher_(me);
    const kind = p.kind === 'image' ? 'images' : 'audio';
    const meta = { name: String(p.name || 'file').slice(0, 120), parents: [prop_('FOLDER_' + kind)] };
    const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
      method: 'post', contentType: 'application/json; charset=UTF-8', payload: JSON.stringify(meta),
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': p.mime || 'audio/mpeg', Origin: prop_('SITE_ORIGIN') || '*' },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) throw new Error('تعذر بدء الرفع');
    return { uploadUrl: res.getHeaders()['Location'] || res.getHeaders()['location'] };
  },

  // ===== كود الفصل (للمعلمات) =====
  classCode: (p, me) => {
    needTeacher_(me);
    const c = rows_('Classes').find(x => x.class_id === me.class_id);
    return { code: c ? String(c.join_code) : '' };
  },

  setClassCode: (p, me) => {
    needTeacher_(me);
    const code = normDigits_(p.code).toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9]{3,12}$/.test(code)) throw new Error('الكود من 3 إلى 12 حرفًا إنجليزيًا أو أرقام');
    if (rows_('Classes').some(c => String(c.join_code).toUpperCase() === code && c.class_id !== me.class_id)) throw new Error('هذا الكود مستخدم، اختاري غيره');
    update_('Classes', 'class_id', me.class_id, { join_code: code });
    return { code };
  },

  // ===== إدارة الطلاب (للمعلمات) =====
  students: (p, me) => {
    needTeacher_(me);
    const pts = {};
    rows_('Points').forEach(r => pts[r.user_id] = (pts[r.user_id] || 0) + Number(r.points));
    return rows_('Users').filter(u => u.class_id === me.class_id && u.role === 'student' && u.active !== false)
      .map(u => ({ user_id: u.user_id, name: u.name, avatar: u.avatar, points: pts[u.user_id] || 0 }));
  },

  addStudent: (p, me) => {
    needTeacher_(me);
    const name = String(p.name || '').trim().slice(0, 40);
    const pin = normDigits_(p.pin);
    if (!name) throw new Error('اكتبي اسم الطفل');
    if (!/^\d{4}$/.test(pin)) throw new Error('الرمز السري 4 أرقام');
    const u = append_('Users', { user_id: id_('U'), role: 'student', name, class_id: me.class_id, avatar: String(p.avatar || '🌟').slice(0, 8),
      pin_hash: hashPin_(pin), city: p.city || '', country: p.country || '', active: true, created_at: now_() });
    return { user_id: u.user_id };
  },

  setStudentPin: (p, me) => {
    needTeacher_(me);
    const pin = normDigits_(p.pin);
    if (!/^\d{4}$/.test(pin)) throw new Error('الرمز السري 4 أرقام');
    const u = rows_('Users').find(x => x.user_id === p.user_id && x.class_id === me.class_id && x.role === 'student');
    if (!u) throw new Error('الطالب غير موجود');
    update_('Users', 'user_id', u.user_id, { pin_hash: hashPin_(pin) });
    return true;
  },

  removeStudent: (p, me) => {
    needTeacher_(me);
    const u = rows_('Users').find(x => x.user_id === p.user_id && x.class_id === me.class_id && x.role === 'student');
    if (!u) throw new Error('الطالب غير موجود');
    update_('Users', 'user_id', u.user_id, { active: false });
    return true;
  },

  changeMyPin: (p, me) => {
    needTeacher_(me);
    const u = rows_('Users').find(x => x.user_id === me.user_id);
    if (!u || u.pin_hash !== hashPin_(p.oldPin)) throw new Error('الرمز الحالي غير صحيح');
    const np = normDigits_(p.newPin);
    if (np.length < 4) throw new Error('الرمز الجديد 4 أرقام على الأقل');
    update_('Users', 'user_id', me.user_id, { pin_hash: hashPin_(np) });
    return true;
  },

  // بعد اكتمال الرفع من المتصفح: نسجل المحاضرة
  createLecture: (p, me) => {
    needTeacher_(me);
    const l = append_('Lectures', { lecture_id: id_('L'), class_id: me.class_id, title: p.title, date: p.date || now_().slice(0, 10),
      audio_file_id: p.audio_file_id, duration_sec: p.duration_sec || '', status: 'draft', created_by: me.user_id, created_at: now_() });
    share_(p.audio_file_id);
    return l;
  }
};

function addPoints_(user_id, points, reason) { append_('Points', { user_id, points, reason, at: now_() }); }
function share_(fileId) { try { DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {} }

/* ============ 5) بوت تيليجرام للمعلمات ============ */
function tg_(method, payload) {
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload || {}), muteHttpExceptions: true });
  return JSON.parse(r.getContentText());
}
function say_(chat, text, extra) { tg_('sendMessage', Object.assign({ chat_id: chat, text }, extra || {})); }

function getState_(chat) {
  const r = rows_('BotState').find(x => String(x.chat_id) === String(chat));
  return r ? { state: r.state, data: r.data ? JSON.parse(r.data) : {} } : { state: 'idle', data: {} };
}
function setState_(chat, state, data) {
  const row = { chat_id: chat, state, data: JSON.stringify(data || {}), at: now_() };
  if (!update_('BotState', 'chat_id', chat, row)) append_('BotState', row);
}

function teacherByChat_(chat) {
  return rows_('Users').find(u => String(u.telegram_id) === String(chat) && (u.role === 'teacher' || u.role === 'admin') && u.active !== false);
}

function onTelegram_(upd) {
  const m = upd.message; if (!m) return;
  const chat = m.chat.id;
  const text = (m.text || '').trim();

  // ربط حساب المعلمة: /start رمز-الفصل (نفس كود الفصل في الشيت)
  if (text.indexOf('/start') === 0) {
    const code = text.split(/\s+/)[1];
    const cls = code && rows_('Classes').find(c => String(c.join_code).toUpperCase() === code.toUpperCase());
    if (cls) {
      const t = rows_('Users').find(u => u.user_id === cls.teacher_id);
      if (t) { update_('Users', 'user_id', t.user_id, { telegram_id: chat }); return say_(chat, 'أهلاً بكِ ' + t.name + ' ✨\nتم ربط حسابكِ. ابعتي لي تسجيل المحاضرة وسأرفعه فورًا.'); }
    }
    return say_(chat, 'أهلاً بكِ في منصة رحلة مع الأنبياء 🌙\nلربط حسابكِ اكتبي:\n/start كود-الفصل');
  }

  const teacher = teacherByChat_(chat);
  if (!teacher) return say_(chat, 'هذا البوت للمعلمات فقط. اطلبي من المشرف كود الفصل.');

  const st = getState_(chat);
  const file = m.voice || m.audio || (m.document && /audio/.test(m.document.mime_type || '') ? m.document : null);

  // 1) وصل تسجيل صوتي
  if (file) {
    if (file.file_size && file.file_size > MAX_BOT_DOWNLOAD) {
      const link = (prop_('SITE_ORIGIN') || '') + '/upload.html';
      return say_(chat, 'التسجيل كبير (أكبر من 20 ميجا) ولا يستطيع البوت تنزيله 🙏\nارفعيه من هذه الصفحة بزر واحد، وهي ترفع على درايف بدون حد للحجم:\n' + link);
    }
    const info = tg_('getFile', { file_id: file.file_id });
    if (!info.ok) return say_(chat, 'تعذر تنزيل الملف، جرّبي مرة أخرى أو ارفعيه من صفحة الرفع.');
    const blob = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + prop_('BOT_TOKEN') + '/' + info.result.file_path).getBlob();
    const ext = (info.result.file_path.split('.').pop() || 'ogg');
    blob.setName('lecture_' + Date.now() + '.' + ext);
    const f = DriveApp.getFolderById(prop_('FOLDER_audio')).createFile(blob);
    share_(f.getId());
    setState_(chat, 'await_title', { audio_file_id: f.getId(), duration: file.duration || '' });
    return say_(chat, 'تم استلام التسجيل ✔\nما اسم المحاضرة؟');
  }

  // 2) اسم المحاضرة
  if (st.state === 'await_title' && text) {
    const l = append_('Lectures', { lecture_id: id_('L'), class_id: teacher.class_id, title: text, date: now_().slice(0, 10),
      audio_file_id: st.data.audio_file_id, duration_sec: st.data.duration, status: 'draft', created_by: teacher.user_id, created_at: now_() });
    setState_(chat, 'await_images', { lecture_id: l.lecture_id, n: 0 });
    return say_(chat, 'تمت إضافة «' + text + '» كمسودة.\nابعتي الآن صور المحاضرة كلها (يمكنكِ إرسالها كألبوم)، وعند الانتهاء اكتبي: تم');
  }

  // 3) الصور
  if (st.state === 'await_images' && m.photo) {
    const best = m.photo[m.photo.length - 1];
    const info = tg_('getFile', { file_id: best.file_id });
    if (!info.ok) return say_(chat, 'تعذر تنزيل صورة، أعيدي إرسالها.');
    const blob = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + prop_('BOT_TOKEN') + '/' + info.result.file_path).getBlob();
    blob.setName('img_' + st.data.lecture_id + '_' + Date.now() + '.jpg');
    const f = DriveApp.getFolderById(prop_('FOLDER_images')).createFile(blob);
    share_(f.getId());
    const n = (st.data.n || 0) + 1;
    append_('LectureImages', { image_id: id_('I'), lecture_id: st.data.lecture_id, sort: m.message_id, file_id: f.getId() });
    setState_(chat, 'await_images', { lecture_id: st.data.lecture_id, n });
    return;
  }
  if (st.state === 'await_images' && /^(تم|تمام|خلصت|انتهيت)$/.test(text)) {
    setState_(chat, 'idle', {});
    return say_(chat, 'ممتاز ✨ حفظت ' + (st.data.n || 0) + ' صورة.\nالمحاضرة الآن مسودة، وبعد مراجعتها تنشر للأطفال من لوحة المعلمة.');
  }

  say_(chat, 'ابعتي تسجيل المحاضرة الصوتي لأبدأ 🎙');
}

/** (غير مستخدمة — البوت يعمل بالاستعلام الدوري، انظر installPolling) */
function setWebhook() {
  const url = ScriptApp.getService().getUrl() + '?k=' + prop_('WEBHOOK_KEY');
  Logger.log(JSON.stringify(tg_('setWebhook', { url, allowed_updates: ['message'], drop_pending_updates: true })));
}

/** أنشئ أول فصل ومعلمة (عدّل القيم ثم شغّلها مرة واحدة) */
function seedFirstClass() {
  const teacherPin = '1234'; // غيّره فورًا
  const t = append_('Users', { user_id: id_('U'), role: 'admin', name: 'المعلمة', class_id: '', avatar: '', pin_hash: hashPin_(teacherPin), city: 'Riyadh', country: 'SA', active: true, created_at: now_() });
  const code = 'SERAH' + Math.floor(100 + Math.random() * 900);
  const c = append_('Classes', { class_id: id_('C'), name: 'الفصل الأول', teacher_id: t.user_id, join_code: code, created_at: now_() });
  update_('Users', 'user_id', t.user_id, { class_id: c.class_id });
  Logger.log('كود الفصل: ' + code + ' | رمز المعلمة المؤقت: ' + teacherPin);
}

/* ============ 6) استلام رسائل البوت بالاستعلام الدوري ============
 * ويب هوك تيليجرام لا يتوافق مع Apps Script (يردّ بتحويل 302 فيعيد تيليجرام الإرسال بلا توقف)،
 * لذلك نسأل تيليجرام كل دقيقة عن الرسائل الجديدة. */
function pollTelegram() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const offset = Number(prop_('TG_OFFSET') || 0);
    const r = tg_('getUpdates', { offset: offset, timeout: 0, limit: 20, allowed_updates: ['message'] });
    if (!r.ok) return;
    r.result.forEach(upd => {
      props_().setProperty('TG_OFFSET', String(upd.update_id + 1)); // نسجّل قبل المعالجة لمنع التكرار
      try { onTelegram_(upd); } catch (e) { console.error(e); }
    });
  } finally { lock.releaseLock(); }
}

/** شغّلها مرة واحدة: تلغي الويب هوك وتنشئ مشغّلًا يعمل كل دقيقة */
function installPolling() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'pollTelegram').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('pollTelegram').timeBased().everyMinutes(1).create();
  Logger.log(JSON.stringify(tg_('deleteWebhook', { drop_pending_updates: true })));
}

/** يحذف مشغّل الاستعلام الدوري (يُستخدم بعد التحويل إلى ويب هوك عبر Cloudflare) */
function removePolling() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'pollTelegram').forEach(t => ScriptApp.deleteTrigger(t));
}

/** يضبط ويب هوك تيليجرام على عنوان الوسيط (Cloudflare Worker) */
function setRelayWebhook(relayUrl, secret) {
  Logger.log(JSON.stringify(tg_('setWebhook', { url: relayUrl, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true })));
}

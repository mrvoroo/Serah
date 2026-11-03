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

function ss_() {
  const id = prop_('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** شغّلها مرة واحدة من المحرر: تنشئ الجداول ومجلدات درايف */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

/* ============ 3) المصادقة (رمز موقّع بدون تخزين) ============ */
function hashPin_(pin) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, prop_('PIN_SALT') + String(pin));
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
    try { onTelegram_(JSON.parse(e.postData.contents)); } catch (err) { console.error(err); }
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
    const c = rows_('Classes').find(x => x.join_code === String(p.code).trim().toUpperCase());
    if (!c) throw new Error('كود الفصل غير صحيح');
    const kids = rows_('Users').filter(u => u.class_id === c.class_id && u.role === 'student' && u.active !== false)
      .map(u => ({ user_id: u.user_id, name: u.name, avatar: u.avatar }));
    return { class_id: c.class_id, name: c.name, kids };
  },

  // دخول الطفل (user_id + رمز) أو المعلمة (name + رمز)
  login: (p) => {
    const users = rows_('Users');
    let u = p.user_id ? users.find(x => x.user_id === p.user_id)
                      : users.find(x => x.role !== 'student' && x.name === p.name);
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
    const cls = code && rows_('Classes').find(c => c.join_code === code.toUpperCase());
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
    append_('LectureImages', { image_id: id_('I'), lecture_id: st.data.lecture_id, sort: m.date * 1000 + n, file_id: f.getId() });
    setState_(chat, 'await_images', { lecture_id: st.data.lecture_id, n });
    return;
  }
  if (st.state === 'await_images' && /^(تم|تمام|خلصت|انتهيت)$/.test(text)) {
    setState_(chat, 'idle', {});
    return say_(chat, 'ممتاز ✨ حفظت ' + (st.data.n || 0) + ' صورة.\nالمحاضرة الآن مسودة، وبعد مراجعتها تنشر للأطفال من لوحة المعلمة.');
  }

  say_(chat, 'ابعتي تسجيل المحاضرة الصوتي لأبدأ 🎙');
}

/** شغّلها مرة واحدة بعد نشر الويب أب (وضع SITE_ORIGIN و BOT_TOKEN أولاً) */
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

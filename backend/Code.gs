/**
 * منصة رحلة مع الأنبياء — الخلفية (Google Apps Script)
 * قاعدة البيانات: Google Sheets | الملفات: Google Drive
 * الأسرار (توكن البوت وغيره) تُحفظ في Script Properties فقط ولا تُكتب هنا أبدًا.
 */

// رقم النسخة: يزيده سكربت النشر (deploy.ps1) تلقائيًا، ويرجع مع ping للتأكد أن الموقع على أحدث نسخة
const VERSION = 26;

/* ============ 1) هيكل الجداول ============ */
const SCHEMA = {
  Classes:      ['class_id', 'name', 'teacher_id', 'join_code', 'created_at'],
  Users:        ['user_id', 'role', 'name', 'class_id', 'avatar', 'pin_hash', 'city', 'country', 'telegram_id', 'active', 'created_at', 'last_login_at', 'gender'],
  Lectures:     ['lecture_id', 'class_id', 'title', 'date', 'audio_file_id', 'duration_sec', 'status', 'notes', 'created_by', 'created_at', 'prophet_id'],
  LectureImages:['image_id', 'lecture_id', 'sort', 'file_id'],
  Attendance:   ['lecture_id', 'user_id', 'at'],
  // الاختبارات والواجبات (المرحلة 7): الأعمدة الجديدة في آخر كل ورقة حتى يضيفها الترحيل بدون لمس البيانات
  Quizzes:      ['quiz_id', 'class_id', 'lecture_id', 'title', 'status', 'created_at', 'prophet_id', 'created_by', 'updated_at'],
  Questions:    ['question_id', 'quiz_id', 'text', 'opt_a', 'opt_b', 'opt_c', 'opt_d', 'correct', 'points', 'image_file_id', 'sort'],
  Results:      ['quiz_id', 'user_id', 'score', 'total', 'at', 'answers', 'stars'],
  Assignments:  ['assignment_id', 'class_id', 'lecture_id', 'title', 'details', 'due', 'created_at', 'prophet_id', 'created_by', 'helpers'],
  Submissions:  ['sub_id', 'assignment_id', 'user_id', 'status', 'at', 'reviewed_by', 'reviewed_at'],
  // إشعارات داخل المنصة للطفل (مثل: تصحيح سؤال في اختبار حلّه)
  Notices:      ['notice_id', 'user_id', 'text', 'at', 'read'],
  Points:       ['user_id', 'points', 'reason', 'at'],
  Suggestions:  ['id', 'from_user', 'role', 'text', 'audio_file_id', 'status', 'at'],
  BotState:     ['chat_id', 'state', 'data', 'at'],
  AuditLog:     ['at', 'user_id', 'role', 'action', 'target_type', 'target_id', 'details_json', 'imp_by'],
  LoginAttempts:['key', 'fails', 'first_at', 'locked_until'],
  // رحلة الأنبياء: الأقسام (sort ترتيب، symbol شكل المجسم 3D) وعناصر صفحة كل نبي (نص/صوت/صورة/يوتيوب)
  Prophets:     ['prophet_id', 'sort', 'name', 'title', 'tag', 'text', 'symbol', 'symbol_name', 'visible', 'updated_at'],
  // المرحلة 6: سجل الصلوات (day رقم yyyymmdd، key = user_id:day) وأجهزة الإشعارات
  PrayerLog:    ['key', 'user_id', 'day', 'prayers', 'updated_at'],
  PushSubs:     ['sub_id', 'user_id', 'class_id', 'endpoint', 'pull_key', 'plan', 'prefs', 'created_at', 'last_seen', 'fails'],
  // المرحلة 9: المحاضرات المباشرة (مواعيد أسبوعية، جلسات، حضور بالنبضات)
  // week_min = الدقيقة من بداية الأسبوع بالتوقيت المحلي لمنطقة tz (لا يتغير مع التوقيت الصيفي)
  LiveSlots:    ['slot_id', 'class_id', 'title', 'week_min', 'minutes', 'created_by', 'created_at', 'tz'],
  // teacher_seen: آخر نبضة من صفحة المعلمة (لإنهاء المحاضرة المنسية)
  LiveSessions: ['live_id', 'class_id', 'title', 'room', 'status', 'started_at', 'ended_at', 'started_by', 'lecture_id', 'teacher_seen'],
  LiveAttend:   ['key', 'live_id', 'user_id', 'first_at', 'last_at', 'seconds', 'status', 'points', 'override'],
  ProphetContent:['item_id', 'prophet_id', 'kind', 'title', 'body', 'file_id', 'url', 'sort', 'visible', 'approved', 'created_by', 'created_at']
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
  Object.keys(SCHEMA).forEach(ensureSheet_);
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
// تنشئ الورقة لو ناقصة، وتضيف الأعمدة الناقصة في آخرها فقط — لا تمس البيانات الموجودة
function ensureSheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const missing = SCHEMA[name].filter(h => head.indexOf(h) < 0);
  if (missing.length) sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  return sh;
}
function rows_(name) {
  const sh = ss_().getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const head = v.shift();
  return v.map(r => { const o = {}; head.forEach((h, i) => o[h] = r[i]); return o; });
}
// منع حقن الصيغ: نص يبدأ بـ = + - @ يُنفَّذ كصيغة في Sheets (مثل IMPORTXML لتسريب البيانات)،
// فنسبقه بـ ' ليُخزَّن نصًا. القراءة (getValues) ترجع النص الأصلي بدون '
function cell_(v) { return typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v; }
// يكتب الصف حسب أعمدة الورقة الفعلية (لا حسب ترتيب SCHEMA) حتى تبقى الأعمدة المضافة لاحقًا في مكانها الصحيح
function append_(name, obj) {
  const sh = ss_().getSheetByName(name) || ensureSheet_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(h => obj[h] === undefined ? '' : cell_(obj[h])));
  return obj;
}
function audit_(me, action, target_type, target_id, details) {
  try {
    append_('AuditLog', { at: now_(), user_id: me ? me.user_id : 'system', role: me ? me.role : 'system', action,
      target_type: target_type || '', target_id: String(target_id || '').slice(0, 200),
      // الخلية في Sheets حدها 50 ألف حرف: طلب منفوخ بحقل زائد كان يُسقط سطر السجل كله (تهرّب من التدقيق)، فنقصّه
      details_json: details ? JSON.stringify(details).slice(0, 20000) : '', imp_by: me && me.imp || '' });
  } catch (e) { console.error(e); }
}
function update_(name, keyCol, keyVal, patch) {
  const sh = ss_().getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const head = v[0], ki = head.indexOf(keyCol);
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][ki]) === String(keyVal)) {
      Object.keys(patch).forEach(k => { const ci = head.indexOf(k); if (ci >= 0) sh.getRange(i + 1, ci + 1).setValue(cell_(patch[k])); });
      return true;
    }
  }
  return false;
}
function remove_(name, keyCol, keyVal) {
  const sh = ss_().getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const ki = v[0].indexOf(keyCol);
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][ki]) === String(keyVal)) sh.deleteRow(i + 1);
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
// اسم المعلمة/المطوّر للدخول بدون اللقب: «م.احمد» و«م. احمد» و«احمد» واحد، و«أ. مروة» = «مروة»
function staffName_(s) { return normName_(s).replace(/^(ا|م|د)\s*[.\/]\s*/, ''); }
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
// بصمة الرمز السري داخل التوكن (HMAC لا تكشف شيئًا): تغيير الرمز يُنهي كل الجلسات القديمة (مثل جلسة مسروقة)
function pinStamp_(u) { return sign_('pv|' + String(u.pin_hash || '')).slice(0, 12); }
// التوكن: user_id|role|class_id|exp|imp|pv — imp = معرّف المطوّر في وضع «عرض كـ» (قراءة فقط)، pv = بصمة الرمز
function makeToken_(user, ttlMs, imp) {
  const body = [user.user_id, user.role, user.class_id, Date.now() + (ttlMs || 30 * 864e5), imp || '', pinStamp_(user)].join('|');
  return Utilities.base64EncodeWebSafe(body) + '.' + sign_(body);
}
function inactive_(u) { return !u || u.active === false || String(u.active).toUpperCase() === 'FALSE'; }
function auth_(token) {
  if (!token) throw new Error('غير مسجل');
  const [b, sig] = String(token).split('.');
  let body;
  try { body = Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString(); } catch (e) { throw new Error('رمز غير صالح'); }
  if (!sig || sign_(body) !== sig) throw new Error('رمز غير صالح');
  const [user_id, role, class_id, exp, imp, pv] = body.split('|');
  if (Date.now() > Number(exp)) throw new Error('انتهت الجلسة');
  // الحساب الموقوف أو المحذوف يخرج فورًا حتى لو معه توكن صالح، والدور والفصل يُقرآن من الحساب الحالي
  const users = rows_('Users');
  const u = users.find(x => x.user_id === user_id);
  if (inactive_(u)) throw new Error('الحساب موقوف — سجّلي الدخول مرة أخرى أو تواصلي مع الإدارة');
  // التوكنات القديمة (قبل إضافة البصمة) تبقى حتى تنتهي مدتها؛ لإنهائها كلها فورًا غيّر HMAC_KEY
  if (pv && pv !== pinStamp_(u)) throw new Error('انتهت الجلسة — تغيّر الرمز السري، يلزم الدخول مرة أخرى');
  // «عرض كـ»: يسقط التوكن لو المطوّر الذي أصدره لم يعد مطوّرًا فعّالًا
  if (imp) { const s = users.find(x => x.user_id === imp); if (inactive_(s) || s.role !== 'superadmin') throw new Error('انتهت جلسة المعاينة'); }
  if (!imp && (u.role !== role || String(u.class_id) !== String(class_id))) return { user_id, role: u.role, class_id: u.class_id, imp: '' };
  return { user_id, role, class_id, imp: imp || '' };
}
// الرتب: المطوّر (superadmin) فوق المعلمة الأدمن فوق المعلمة فوق الطفل
const RANK = { student: 0, teacher: 1, admin: 2, superadmin: 3 };
function need_(me, role) { if (!me || (RANK[me.role] || 0) < RANK[role]) throw new Error('ليس لديك صلاحية'); }
function needTeacher_(me) { if (!me || (RANK[me.role] || 0) < RANK.teacher) throw new Error('للمعلمات فقط'); }
// الفصل الذي تعمل عليه العملية: المطوّر غير مربوط بفصل، فيعمل على الفصل المطلوب أو أول فصل
function cls_(me, p) {
  if (me.role !== 'superadmin') return me.class_id;
  if (p && p.class_id) return p.class_id;
  if (me._cls === undefined) { const c = rows_('Classes')[0]; me._cls = c ? c.class_id : ''; } // مرة واحدة لكل طلب
  return me._cls;
}

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

/* مصدر واحد للصلاحيات: أقل رتبة لكل إجراء (null = بدون دخول)، و write = يغيّر البيانات
 * (يُرفض في وضع «عرض كـ»)، و audit = يُسجَّل في AuditLog. أي إجراء غير موجود هنا يُرفض. */
const POLICY = {
  ping: { min: null }, classInfo: { min: null }, login: { min: null },
  lectures: { min: 'student' }, leaderboard: { min: 'student' }, me: { min: 'student' },
  markAttendance: { min: 'student', write: 1 }, suggest: { min: 'student', write: 1 },
  dashboard: { min: 'teacher' }, suggestions: { min: 'teacher' }, students: { min: 'teacher' }, classCode: { min: 'teacher' },
  startUpload: { min: 'teacher', write: 1 },
  createLecture: { min: 'teacher', write: 1, audit: 1 },
  setClassCode: { min: 'teacher', write: 1, audit: 1 },
  addStudent: { min: 'teacher', write: 1, audit: 1 },
  setStudentPin: { min: 'teacher', write: 1, audit: 1 },
  removeStudent: { min: 'teacher', write: 1, audit: 1 },
  changeMyPin: { min: 'teacher', write: 1, audit: 1 },
  setLectureStatus: { min: 'admin', write: 1, audit: 1 },
  auditLog: { min: 'admin' },
  users: { min: 'superadmin' }, classes: { min: 'superadmin' }, systemHealth: { min: 'superadmin' },
  viewAs: { min: 'superadmin', audit: 1 },
  setRole: { min: 'superadmin', write: 1, audit: 1 },
  setUserActive: { min: 'superadmin', write: 1, audit: 1 },
  setUserPin: { min: 'superadmin', write: 1, audit: 1 },
  journey: { min: 'student' }, prophet: { min: 'student' }, journeyAdmin: { min: 'admin' },
  seedProphets: { min: 'admin', write: 1, audit: 1 },
  saveProphet: { min: 'admin', write: 1, audit: 1 },
  deleteProphet: { min: 'admin', write: 1, audit: 1 },
  reorderProphets: { min: 'admin', write: 1, audit: 1 },
  setProphetsVisible: { min: 'admin', write: 1, audit: 1 },
  saveContent: { min: 'admin', write: 1, audit: 1 },
  setContentFlags: { min: 'admin', write: 1, audit: 1 },
  deleteContent: { min: 'admin', write: 1, audit: 1 },
  reorderContent: { min: 'admin', write: 1, audit: 1 },
  updateLecture: { min: 'teacher', write: 1, audit: 1 },
  deleteLecture: { min: 'teacher', write: 1, audit: 1 },
  addLectureImage: { min: 'teacher', write: 1, audit: 1 },
  deleteLectureImage: { min: 'teacher', write: 1, audit: 1 },
  reorderLectureImages: { min: 'teacher', write: 1 },
  updateStudent: { min: 'teacher', write: 1, audit: 1 },
  tgLinkToken: { min: 'teacher', write: 1, audit: 1 },
  staff: { min: 'admin' },
  addTeacher: { min: 'admin', write: 1, audit: 1 },
  updateTeacher: { min: 'admin', write: 1, audit: 1 },
  deleteTeacher: { min: 'admin', write: 1, audit: 1 },
  repairAudio: { min: 'superadmin', write: 1, audit: 1 },
  config: { min: 'student' },
  audioChunk: { min: 'student' },
  audioCheck: { min: 'superadmin' },
  // الاختبارات والواجبات
  quizzes: { min: 'student' }, quiz: { min: 'student' },
  submitQuiz: { min: 'student', write: 1 },
  saveQuiz: { min: 'teacher', write: 1, audit: 1 },
  setQuizStatus: { min: 'admin', write: 1, audit: 1 },
  deleteQuiz: { min: 'teacher', write: 1, audit: 1 },
  quizResults: { min: 'teacher' },
  assignments: { min: 'student' },
  saveAssignment: { min: 'teacher', write: 1, audit: 1 },
  deleteAssignment: { min: 'teacher', write: 1, audit: 1 },
  markAssignment: { min: 'student', write: 1 },
  assignmentStatus: { min: 'teacher' }, classTeachers: { min: 'teacher' },
  notices: { min: 'student' }, readNotice: { min: 'student', write: 1 },
  reviewAssignment: { min: 'teacher', write: 1, audit: 1 }
};
const SECRET_PARAMS = { pin: 1, oldPin: 1, newPin: 1, token: 1, action: 1 };

function handle_(action, p, token) {
  try {
    migrate_();
    // hasOwnProperty حتى لا تمر أسماء مثل constructor أو toString الموروثة من Object
    const own = (o) => Object.prototype.hasOwnProperty.call(o, action);
    if (!own(POLICY) || !own(ACTIONS)) throw new Error('إجراء غير معروف');
    const pol = POLICY[action], fn = ACTIONS[action];
    let me = null;
    if (pol.min) {
      me = auth_(token);
      need_(me, pol.min);
      if (me.imp && pol.write) throw new Error('وضع المعاينة للعرض فقط — لا يمكن الحفظ');
    }
    const data = fn(p, me);
    if (pol.audit) {
      const details = {}; Object.keys(p || {}).forEach(k => { if (!SECRET_PARAMS[k]) details[k] = p[k]; });
      audit_(me, action, '', p.user_id || p.quiz_id || p.assignment_id || p.lecture_id || p.class_id || p.item_id || p.prophet_id || p.image_id || '', details);
    }
    return json_({ ok: true, data });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

// عند أول طلب بعد نشر نسخة جديدة: نضيف الأوراق والأعمدة الناقصة فقط (لا يمس البيانات)
function migrate_() {
  if (prop_('SCHEMA_VERSION') === String(VERSION)) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    if (prop_('SCHEMA_VERSION') === String(VERSION)) return;
    Object.keys(SCHEMA).forEach(ensureSheet_);
    if (!prop_('AUDIO_FIXED')) { try { fixAudioTypes_(); props_().setProperty('AUDIO_FIXED', '1'); } catch (e) { console.error(e); } }
    if (!prop_('AUDIO_WEBM')) { try { convertOldAudio_(); props_().setProperty('AUDIO_WEBM', '1'); } catch (e) { console.error(e); } }
    // اسم حساب المطوّر «احمد» (اللقب «م.» يُضاف عند العرض فقط) — مرة واحدة
    if (!prop_('SA_RENAMED')) { try { rows_('Users').filter(u => u.role === 'superadmin' && normName_(u.name) === normName_('م.احمد')).forEach(u => update_('Users', 'user_id', u.user_id, { name: 'احمد' })); props_().setProperty('SA_RENAMED', '1'); } catch (e) { console.error(e); } }
    // مشغّل الإشعارات كل دقيقة — يُنشأ مرة واحدة تلقائيًا (بدون فتح المحرر)
    if (!prop_('VAPID_PUB')) { try { genVapid_(); } catch (e) { console.error(e); } }
    if (prop_('PUSH_TRIGGER') !== '2') { try { installPushTrigger(); props_().setProperty('PUSH_TRIGGER', '2'); } catch (e) { console.error(e); } }
    props_().setProperty('SCHEMA_VERSION', String(VERSION));
  } finally { lock.releaseLock(); }
}

const ACTIONS = {
  ping: () => ({ pong: true, version: VERSION }),

  // الطفل: كود الفصل → قائمة الأطفال بالأفاتار
  classInfo: (p) => {
    const c = rows_('Classes').find(x => String(x.join_code).toUpperCase() === normDigits_(p.code).toUpperCase().replace(/\s+/g, ''));
    if (!c) { codeFail_(); throw new Error('كود الفصل غير صحيح'); }
    const kids = rows_('Users').filter(u => u.class_id === c.class_id && u.role === 'student' && u.active !== false)
      .map(u => ({ user_id: u.user_id, name: u.name, avatar: u.avatar }));
    return { class_id: c.class_id, name: c.name, kids };
  },

  // دخول الطفل (user_id + رمز) أو المعلمة (name + رمز)
  login: (p) => {
    // عداد التخمين للمعلمة على الاسم بدون اللقب، فلا يُقسم بتغيير «م.»/«أ.»/«د/» أو المسافات
    const key = 'login:' + (p.user_id ? String(p.user_id) : staffName_(p.name));
    const users = rows_('Users');
    // الطفل بالمعرّف، والمعلمة بالاسم فقط (حتى لا يكون لها عدادا تخمين منفصلان)
    let u;
    if (p.user_id) u = users.find(x => x.user_id === String(p.user_id) && x.role === 'student');
    else {
      // حسابات قديمة قد تتطابق بعد حذف اللقب (أ. مروة / مروة): كل منها يدخل برمزه لحسابه هو فقط
      const sn = staffName_(p.name), same = sn ? users.filter(x => x.role !== 'student' && staffName_(x.name) === sn) : [];
      u = same.length > 1 ? (same.find(x => x.active !== false && x.pin_hash === hashPin_(p.pin)) || same[0]) : same[0];
    }
    // حساب غير موجود: لا نكتب صفًا في LoginAttempts (يكبر الشيت بلا حد)، بل إبطاء عام
    if (!u) { codeFail_('loginFails'); throw new Error('الرمز غير صحيح'); }
    const a = checkLock_(key);
    if (u.active === false || u.pin_hash !== hashPin_(p.pin)) {
      const lockMin = failAttempt_(key, a);
      throw new Error(lockMin ? 'الرمز غير صحيح. محاولات كثيرة، انتظر ' + lockMin + ' دقيقة' : 'الرمز غير صحيح');
    }
    clearAttempts_(key, a);
    update_('Users', 'user_id', u.user_id, { last_login_at: now_() });
    return { token: makeToken_(u), user: { user_id: u.user_id, name: u.name, role: u.role, class_id: u.class_id, avatar: u.avatar, gender: genderOf_(u) } };
  },

  // المحاضرات: الطفل يرى المنشور فقط، والمعلمة ترى الكل
  lectures: (p, me) => {
    const isT = me.role !== 'student';
    const list = rows_('Lectures').filter(l => l.class_id === cls_(me, p) && (isT || l.status === 'published'));
    const imgs = rows_('LectureImages');
    return list.map(l => {
      const own = imgs.filter(i => i.lecture_id === l.lecture_id).sort((a, b) => a.sort - b.sort);
      const o = Object.assign({}, l, { images: own.map(i => i.file_id) });
      // المعلمة تحتاج معرّف كل صورة للحذف والترتيب
      if (isT) o.imageItems = own.map(i => ({ image_id: i.image_id, file_id: i.file_id }));
      return o;
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  // اعتماد/نشر المحاضرة (المراجعة الشرعية من والدة المشرف)
  setLectureStatus: (p, me) => {
    needTeacher_(me);
    if (['draft', 'published'].indexOf(p.status) < 0) throw new Error('حالة غير صحيحة');
    // الأدمن تنشر محاضرات فصلها فقط؛ المطوّر أي محاضرة
    const l = me.role === 'superadmin' ? rows_('Lectures').find(x => x.lecture_id === p.lecture_id) : ownLecture_(me, p);
    if (!l) throw new Error('المحاضرة غير موجودة');
    update_('Lectures', 'lecture_id', l.lecture_id, { status: p.status });
    return true;
  },

  markAttendance: (p, me) => {
    // محاضرة حقيقية في فصل المستخدم (والطفل المنشورة فقط) — وإلا نقاط لا نهائية بمعرّفات وهمية
    const isT = RANK[me.role] >= RANK.teacher;
    if (!rows_('Lectures').some(l => l.lecture_id === p.lecture_id && l.class_id === cls_(me, p) && (isT || l.status === 'published'))) throw new Error('المحاضرة غير موجودة');
    const dup = rows_('Attendance').some(a => a.lecture_id === p.lecture_id && a.user_id === me.user_id);
    if (!dup) { append_('Attendance', { lecture_id: p.lecture_id, user_id: me.user_id, at: now_() }); addPoints_(me.user_id, 10, 'حضور محاضرة'); }
    return true;
  },

  leaderboard: (p, me) => {
    const kids = rows_('Users').filter(u => u.class_id === cls_(me, p) && u.role === 'student');
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
    const kids = rows_('Users').filter(u => u.class_id === cls_(me, p) && u.role === 'student' && u.active !== false)
      .map(u => ({ id: u.user_id, p: pts[u.user_id] || 0 })).sort((a, b) => b.p - a.p);
    const attended = rows_('Attendance').filter(a => a.user_id === me.user_id).map(a => a.lecture_id);
    const self = rows_('Users').find(u => u.user_id === me.user_id);
    return { points: pts[me.user_id] || 0, attended, rank: kids.findIndex(k => k.id === me.user_id) + 1, total: kids.length, gender: genderOf_(self) };
  },

  // لوحة المعلمة: إحصائيات وتحليلات الفصل
  dashboard: (p, me) => {
    needTeacher_(me);
    const kids = rows_('Users').filter(u => u.class_id === cls_(me, p) && u.role === 'student' && u.active !== false);
    const kidIds = {}; kids.forEach(k => kidIds[k.user_id] = k);
    const lectures = rows_('Lectures').filter(l => l.class_id === cls_(me, p))
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
    const sugg = classSuggestions_(me).filter(s => s.status === 'جديد').length;
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
    return classSuggestions_(me).slice(-50).reverse().map(s => ({ id: s.id, text: s.text, status: s.status, at: s.at,
      name: users[s.from_user] ? users[s.from_user].name : '' }));
  },

  // صندوق الاقتراحات: يراه المشرف فقط
  suggest: (p, me) => {
    const text = String(p.text || '').slice(0, 1000);
    if (!text) throw new Error('اكتب اقتراحك');
    rate_('suggest:' + me.user_id, 10, 3600);
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
      // درايف يسمح للمتصفح بالرفع فقط لو Origin هنا = أصل الصفحة بالضبط (بدون مسار مثل /Serah)
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': uploadMime_(p.mime, kind), Origin: uploadOrigin_(p.origin) },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) throw new Error('تعذر بدء الرفع');
    return { uploadUrl: res.getHeaders()['Location'] || res.getHeaders()['location'] };
  },

  // ===== رحلة الأنبياء (المرحلة 3) =====
  // الأقسام الظاهرة بالترتيب؛ لو الجدول فاضي ترجع [] والموقع يستخدم بياناته الاحتياطية
  journey: () => rows_('Prophets').filter(r => truthy_(r.visible)).sort(bySort_).map(prophetOut_),

  // صفحة النبي: الطفل يرى العناصر الظاهرة والمعتمدة فقط؛ الأدمن تعاين الكل بـ preview
  prophet: (p, me) => {
    const pr = rows_('Prophets').find(r => r.prophet_id === p.id);
    const all = !!p.preview && RANK[me.role] >= RANK.admin;
    if (!pr || (!truthy_(pr.visible) && !all)) throw new Error('القسم غير موجود');
    const items = rows_('ProphetContent').filter(c => c.prophet_id === p.id && (all || (truthy_(c.visible) && truthy_(c.approved))))
      .sort(bySort_).map(contentOut_);
    return { prophet: prophetOut_(pr), items };
  },

  // إدارة الرحلة: كل الأقسام مع عدد العناصر والمنتظرة للاعتماد
  journeyAdmin: () => {
    const content = rows_('ProphetContent');
    return rows_('Prophets').sort(bySort_).map(r => Object.assign(prophetOut_(r), {
      visible: truthy_(r.visible),
      items: content.filter(c => c.prophet_id === r.prophet_id).length,
      pending: content.filter(c => c.prophet_id === r.prophet_id && !truthy_(c.approved)).length
    }));
  },

  // استيراد الأقسام الافتراضية من الموقع مرة واحدة (لو الجدول فاضي فقط)
  seedProphets: (p) => {
    if (rows_('Prophets').length) throw new Error('الأقسام موجودة بالفعل');
    const list = Array.isArray(p.list) ? p.list : [];
    if (!list.length || list.length > 60) throw new Error('بيانات غير صحيحة');
    list.forEach((x, i) => append_('Prophets', Object.assign(cleanProphet_(x), { prophet_id: slug_(x.prophet_id), sort: i, visible: true, updated_at: now_() })));
    return list.length;
  },

  // إضافة قسم (بدون prophet_id) أو تعديله
  saveProphet: (p) => {
    const f = cleanProphet_(p);
    if (!f.name) throw new Error('اكتب اسم النبي');
    if (!p.prophet_id) {
      const rows = rows_('Prophets');
      let id = slug_(p.new_id || ('p' + Utilities.getUuid().replace(/-/g, '').slice(0, 6)));
      if (rows.some(r => r.prophet_id === id)) id += Utilities.getUuid().replace(/-/g, '').slice(0, 4);
      append_('Prophets', Object.assign(f, { prophet_id: id, sort: rows.length, visible: p.visible === undefined ? true : !!p.visible, updated_at: now_() }));
      return id;
    }
    const patch = Object.assign(f, { updated_at: now_() });
    if (p.visible !== undefined) patch.visible = !!p.visible;
    if (!update_('Prophets', 'prophet_id', p.prophet_id, patch)) throw new Error('القسم غير موجود');
    return p.prophet_id;
  },

  deleteProphet: (p) => {
    remove_('ProphetContent', 'prophet_id', p.prophet_id);
    remove_('Prophets', 'prophet_id', p.prophet_id);
    return true;
  },

  reorderProphets: (p) => { reorder_('Prophets', 'prophet_id', p.ids); return true; },

  // إظهار/إخفاء عدة أنبياء مرة واحدة (ids فارغة أو all=true = كل الأقسام)
  setProphetsVisible: (p) => {
    const visible = p.visible === true || p.visible === 'true';
    const rows = rows_('Prophets');
    const ids = (p.all === true || p.all === 'true') ? rows.map(r => r.prophet_id) : (Array.isArray(p.ids) ? p.ids.map(String) : []);
    if (!ids.length) throw new Error('اختاري نبيًا واحدًا على الأقل');
    if (ids.length > 100) throw new Error('عدد كبير');
    const known = {}; rows.forEach(r => known[r.prophet_id] = 1);
    const ok = ids.filter(id => known[id]);
    updateWhere_('Prophets', r => ok.indexOf(String(r.prophet_id)) >= 0, () => ({ visible, updated_at: now_() }));
    return ok.length;
  },

  // عنصر في صفحة النبي: text نص، audio/image ملف على درايف (من startUpload)، youtube رابط فيديو
  // العنصر الجديد غير معتمد حتى تعتمده الأدمن (المراجعة الشرعية)
  saveContent: (p, me) => {
    const kind = String(p.kind || '');
    if (['text', 'audio', 'image', 'youtube'].indexOf(kind) < 0) throw new Error('نوع غير صحيح');
    const f = { kind, title: String(p.title || '').slice(0, 200), body: String(p.body || '').slice(0, 5000), file_id: '', url: '' };
    if (kind === 'text' && !f.body.trim()) throw new Error('اكتب النص');
    if (kind === 'audio' || kind === 'image') {
      f.file_id = String(p.file_id || ''); if (!f.file_id) throw new Error('ارفع الملف أولًا');
      const old = p.item_id ? rows_('ProphetContent').find(c => c.item_id === p.item_id) : null;
      if (!old || String(old.file_id) !== f.file_id) { platformFile_(f.file_id); if (kind === 'audio') f.file_id = playableAudio_(f.file_id); share_(f.file_id); }
    }
    if (kind === 'youtube') { const v = youtubeId_(p.url); if (!v) throw new Error('رابط يوتيوب غير صحيح'); f.url = v; }
    if (p.item_id) {
      if (!update_('ProphetContent', 'item_id', p.item_id, f)) throw new Error('العنصر غير موجود');
      return p.item_id;
    }
    if (!rows_('Prophets').some(r => r.prophet_id === p.prophet_id)) throw new Error('القسم غير موجود');
    const sort = rows_('ProphetContent').filter(c => c.prophet_id === p.prophet_id).length;
    const item = append_('ProphetContent', Object.assign(f, { item_id: id_('c'), prophet_id: p.prophet_id, sort, visible: true, approved: !!p.approved, created_by: me.user_id, created_at: now_() }));
    return item.item_id;
  },

  setContentFlags: (p) => {
    const patch = {};
    if (p.visible !== undefined) patch.visible = !!p.visible;
    if (p.approved !== undefined) patch.approved = !!p.approved;
    if (!update_('ProphetContent', 'item_id', p.item_id, patch)) throw new Error('العنصر غير موجود');
    return true;
  },

  deleteContent: (p) => { remove_('ProphetContent', 'item_id', p.item_id); return true; },

  reorderContent: (p) => { reorder_('ProphetContent', 'item_id', p.ids); return true; },

  // ===== تعديل المحاضرات وصورها (المرحلة 4) =====
  updateLecture: (p, me) => {
    const l = ownLecture_(me, p);
    const patch = {};
    if (p.title !== undefined) { const t = String(p.title).trim().slice(0, 120); if (!t) throw new Error('اكتبي عنوان المحاضرة'); patch.title = t; }
    if (p.date !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date))) throw new Error('تاريخ غير صحيح'); patch.date = String(p.date); }
    if (p.notes !== undefined) patch.notes = String(p.notes).slice(0, 1000);
    if (p.prophet_id !== undefined) patch.prophet_id = String(p.prophet_id || '').slice(0, 30);
    update_('Lectures', 'lecture_id', l.lecture_id, patch);
    return true;
  },

  // المسودة تحذفها المعلمة، والمنشورة تحذفها الأدمن فقط
  deleteLecture: (p, me) => {
    const l = ownLecture_(me, p);
    if (l.status === 'published' && RANK[me.role] < RANK.admin) throw new Error('المحاضرة المنشورة تحذفها الأدمن فقط');
    remove_('LectureImages', 'lecture_id', l.lecture_id);
    remove_('Lectures', 'lecture_id', l.lecture_id);
    return true;
  },

  addLectureImage: (p, me) => {
    const l = ownLecture_(me, p);
    if (!p.file_id) throw new Error('ارفعي الصورة أولًا');
    platformFile_(p.file_id);
    share_(p.file_id);
    const sort = rows_('LectureImages').filter(i => i.lecture_id === l.lecture_id).reduce((m, i) => Math.max(m, Number(i.sort) || 0), 0) + 1;
    return append_('LectureImages', { image_id: id_('I'), lecture_id: l.lecture_id, sort, file_id: String(p.file_id) }).image_id;
  },

  deleteLectureImage: (p, me) => {
    const img = rows_('LectureImages').find(i => i.image_id === p.image_id);
    if (!img) throw new Error('الصورة غير موجودة');
    ownLecture_(me, { lecture_id: img.lecture_id, class_id: p.class_id });
    remove_('LectureImages', 'image_id', p.image_id);
    return true;
  },

  reorderLectureImages: (p, me) => {
    const l = ownLecture_(me, p);
    const own = rows_('LectureImages').filter(i => i.lecture_id === l.lecture_id).map(i => i.image_id);
    if (!Array.isArray(p.ids) || p.ids.some(id => own.indexOf(id) < 0)) throw new Error('ترتيب غير صحيح');
    reorder_('LectureImages', 'image_id', p.ids);
    return true;
  },

  // تعديل اسم الطفل أو صورته الرمزية
  updateStudent: (p, me) => {
    const u = rows_('Users').find(x => x.user_id === p.user_id && x.class_id === cls_(me, p) && x.role === 'student');
    if (!u) throw new Error('الطالب غير موجود');
    const patch = {};
    if (p.name !== undefined) { const n = String(p.name).trim().slice(0, 40); if (!n) throw new Error('اكتبي اسم الطفل'); patch.name = n; }
    if (p.avatar !== undefined) patch.avatar = String(p.avatar || '🌟').slice(0, 8);
    if (p.gender !== undefined) patch.gender = cleanGender_(p.gender);
    update_('Users', 'user_id', u.user_id, patch);
    return true;
  },

  // ربط تيليجرام بدون كتابة: رمز لمرة واحدة صالح 15 دقيقة يُرسل للبوت مع زر Start
  tgLinkToken: (p, me) => {
    const tok = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
    CacheService.getScriptCache().put('tglink:' + tok, me.user_id, 900);
    return { url: 'https://t.me/' + botUsername_() + '?start=' + tok };
  },

  // ===== إدارة المعلمات (الأدمن لفصلها، والمطوّر لكل الفصول) =====
  staff: (p, me) => {
    const classes = rows_('Classes');
    return rows_('Users').filter(u => (u.role === 'teacher' || u.role === 'admin') && (me.role === 'superadmin' || u.class_id === me.class_id))
      .map(u => Object.assign(publicUser_(u, classes), { telegram: !!u.telegram_id }));
  },

  addTeacher: (p, me) => {
    const name = String(p.name || '').trim().slice(0, 40);
    const pin = normDigits_(p.pin);
    if (!name) throw new Error('اكتبي اسم المعلمة');
    if (!/^\d{6,}$/.test(pin)) throw new Error('رمز المعلمة 6 أرقام على الأقل');
    uniqueStaffName_(name, '');
    const role = p.role === 'admin' && me.role === 'superadmin' ? 'admin' : 'teacher';
    const class_id = me.role === 'superadmin' ? String(p.class_id || cls_(me, p)) : me.class_id;
    if (!rows_('Classes').some(c => c.class_id === class_id)) throw new Error('الفصل غير موجود');
    const u = append_('Users', { user_id: id_('U'), role, name, class_id, avatar: '', pin_hash: hashPin_(pin), active: true, created_at: now_() });
    return { user_id: u.user_id };
  },

  // تعديل الاسم، الرمز، التفعيل، والدور (الدور للمطوّر فقط)
  updateTeacher: (p, me) => {
    const u = staffTarget_(me, p.user_id);
    const patch = {};
    if (p.name !== undefined) { const n = String(p.name).trim().slice(0, 40); if (!n) throw new Error('اكتبي اسم المعلمة'); uniqueStaffName_(n, u.user_id); patch.name = n; }
    if (p.pin !== undefined && String(p.pin) !== '') {
      const pin = normDigits_(p.pin);
      if (!/^\d{6,}$/.test(pin)) throw new Error('رمز المعلمة 6 أرقام على الأقل');
      patch.pin_hash = hashPin_(pin);
      const key = 'login:' + staffName_(u.name);
      clearAttempts_(key, rows_('LoginAttempts').find(r => String(r.key) === key));
    }
    if (p.active !== undefined) patch.active = p.active === true || p.active === 'true';
    if (p.role !== undefined) {
      if (me.role !== 'superadmin') throw new Error('تغيير الدور للمطوّر فقط');
      if (['teacher', 'admin'].indexOf(p.role) < 0) throw new Error('الدور: معلمة أو معلمة أدمن');
      patch.role = p.role;
    }
    if (me.role === 'superadmin' && p.class_id !== undefined) {
      if (!rows_('Classes').some(c => c.class_id === p.class_id)) throw new Error('الفصل غير موجود');
      patch.class_id = p.class_id;
    }
    update_('Users', 'user_id', u.user_id, patch);
    return true;
  },

  // الحذف نهائي للحساب فقط؛ محاضراتها تبقى في الفصل
  deleteTeacher: (p, me) => {
    const u = staffTarget_(me, p.user_id);
    remove_('Users', 'user_id', u.user_id);
    return true;
  },

  // إصلاح التسجيلات القديمة: تحويل Ogg إلى WebM حتى تعمل على آيفون
  repairAudio: () => convertOldAudio_(),

  // تشغيل مضمون: الخلفية تقرأ جزءًا من ملف الصوت بصلاحية صاحب الدرايف وترسله للمتصفح (يُجمّع ويُشغّل)
  // يعمل حتى لو روابط درايف لا تعمل في المتصفح. مسموح فقط لملفات محاضرات فصل المستخدم أو محتوى الرحلة المعتمد
  audioChunk: (p, me) => {
    const id = String(p.id || '');
    if (!canHearAudio_(me, p, id)) throw new Error('التسجيل غير متاح');
    rate_('audio:' + me.user_id, 300, 3600);
    const start = Math.max(0, Number(p.start) || 0), end = start + AUDIO_CHUNK - 1;
    const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + end }, muteHttpExceptions: true });
    const code = r.getResponseCode();
    if (code === 416) return { data: '', total: start, type: '' };
    if (code !== 200 && code !== 206) throw new Error('تعذّر قراءة التسجيل (' + code + ')');
    const h = r.getHeaders(), range = String(h['Content-Range'] || h['content-range'] || '');
    const bytes = r.getContent();
    return { data: Utilities.base64Encode(bytes), total: Number((range.split('/')[1]) || bytes.length), type: String(h['Content-Type'] || h['content-type'] || 'audio/mpeg').split(';')[0] };
  },

  // فحص تشغيل الصوت لآخر المحاضرات: نوع الملف وحجمه ومشاركته، ورد رابط التنزيل المباشر ورابط Drive API كما يراه المتصفح
  audioCheck: () => {
    const key = prop_('DRIVE_API_KEY'), referer = siteOrigin_() + '/';
    const probe = (url) => {
      try {
        const r = UrlFetchApp.fetch(url, { headers: { Range: 'bytes=0-15', Referer: referer }, muteHttpExceptions: true, followRedirects: true });
        const h = r.getHeaders(), type = String(h['Content-Type'] || h['content-type'] || '');
        return { status: r.getResponseCode(), type, body: /text|json|html/.test(type) ? r.getContentText().slice(0, 160) : '' };
      } catch (e) { return { status: 0, type: '', body: String(e.message || e).slice(0, 160) }; }
    };
    return rows_('Lectures').slice(-5).reverse().map(l => {
      const out = { title: l.title, id: l.audio_file_id };
      try { const f = DriveApp.getFileById(l.audio_file_id); Object.assign(out, { mime: f.getMimeType(), size: f.getSize(), sharing: String(f.getSharingAccess()) }); }
      catch (e) { out.mime = 'خطأ: ' + String(e.message || e).slice(0, 80); }
      out.direct = probe('https://drive.usercontent.google.com/download?id=' + l.audio_file_id + '&export=download');
      out.api = key ? probe('https://www.googleapis.com/drive/v3/files/' + l.audio_file_id + '?alt=media&key=' + encodeURIComponent(key)) : { status: -1, type: '', body: 'DRIVE_API_KEY غير موجود' };
      return out;
    });
  },

  // إعدادات العرض: مفتاح Drive API (مقيّد بعنوان الموقع) لتشغيل الصوت بطريقة تدعم آيفون
  config: () => ({ driveKey: prop_('DRIVE_API_KEY') || '' }),

  // ===== كود الفصل (للمعلمات) =====
  classCode: (p, me) => {
    needTeacher_(me);
    const c = rows_('Classes').find(x => x.class_id === cls_(me, p));
    return { code: c ? String(c.join_code) : '' };
  },

  setClassCode: (p, me) => {
    needTeacher_(me);
    const code = normDigits_(p.code).toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9]{3,12}$/.test(code)) throw new Error('الكود من 3 إلى 12 حرفًا إنجليزيًا أو أرقام');
    if (rows_('Classes').some(c => String(c.join_code).toUpperCase() === code && c.class_id !== cls_(me, p))) throw new Error('هذا الكود مستخدم، اختاري غيره');
    update_('Classes', 'class_id', cls_(me, p), { join_code: code });
    return { code };
  },

  // ===== إدارة الطلاب (للمعلمات) =====
  students: (p, me) => {
    needTeacher_(me);
    const pts = {};
    rows_('Points').forEach(r => pts[r.user_id] = (pts[r.user_id] || 0) + Number(r.points));
    return rows_('Users').filter(u => u.class_id === cls_(me, p) && u.role === 'student' && u.active !== false)
      .map(u => ({ user_id: u.user_id, name: u.name, avatar: u.avatar, gender: genderOf_(u), points: pts[u.user_id] || 0 }));
  },

  addStudent: (p, me) => {
    needTeacher_(me);
    const name = String(p.name || '').trim().slice(0, 40);
    const pin = normDigits_(p.pin);
    if (!name) throw new Error('اكتبي اسم الطفل');
    if (!/^\d{4}$/.test(pin)) throw new Error('الرمز السري 4 أرقام');
    const u = append_('Users', { user_id: id_('U'), role: 'student', name, class_id: cls_(me, p), avatar: String(p.avatar || '🌟').slice(0, 8),
      pin_hash: hashPin_(pin), city: String(p.city || '').slice(0, 60), country: String(p.country || '').slice(0, 60), gender: cleanGender_(p.gender), active: true, created_at: now_() });
    return { user_id: u.user_id };
  },

  setStudentPin: (p, me) => {
    needTeacher_(me);
    const pin = normDigits_(p.pin);
    if (!/^\d{4}$/.test(pin)) throw new Error('الرمز السري 4 أرقام');
    const u = rows_('Users').find(x => x.user_id === p.user_id && x.class_id === cls_(me, p) && x.role === 'student');
    if (!u) throw new Error('الطالب غير موجود');
    update_('Users', 'user_id', u.user_id, { pin_hash: hashPin_(pin) });
    return true;
  },

  removeStudent: (p, me) => {
    needTeacher_(me);
    const u = rows_('Users').find(x => x.user_id === p.user_id && x.class_id === cls_(me, p) && x.role === 'student');
    if (!u) throw new Error('الطالب غير موجود');
    update_('Users', 'user_id', u.user_id, { active: false });
    return true;
  },

  changeMyPin: (p, me) => {
    needTeacher_(me);
    const u = rows_('Users').find(x => x.user_id === me.user_id);
    if (!u || u.pin_hash !== hashPin_(p.oldPin)) throw new Error('الرمز الحالي غير صحيح');
    const np = normDigits_(p.newPin);
    if (!/^\d{6,}$/.test(np)) throw new Error('الرمز الجديد 6 أرقام على الأقل');
    update_('Users', 'user_id', me.user_id, { pin_hash: hashPin_(np) });
    // تغيير الرمز يُنهي كل الجلسات القديمة؛ نرجع جلسة جديدة لهذا الجهاز
    const nu = Object.assign({}, u, { pin_hash: hashPin_(np) });
    return { token: makeToken_(nu), user: { user_id: nu.user_id, name: nu.name, role: nu.role, class_id: nu.class_id, avatar: nu.avatar } };
  },

  // بعد اكتمال الرفع من المتصفح: نسجل المحاضرة
  createLecture: (p, me) => {
    needTeacher_(me);
    const title = String(p.title || '').trim().slice(0, 120);
    if (!title) throw new Error('اكتبي عنوان المحاضرة');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) ? String(p.date) : now_().slice(0, 10);
    if (!p.audio_file_id) throw new Error('ارفعي التسجيل أولًا');
    const l = append_('Lectures', { lecture_id: id_('L'), class_id: cls_(me, p), title, date,
      audio_file_id: playableAudio_(platformFile_(p.audio_file_id)), duration_sec: Number(p.duration_sec) || '', status: 'draft', created_by: me.user_id, created_at: now_() });
    share_(l.audio_file_id);
    return l;
  },

  // ===== الاختبارات والواجبات (المرحلة 7) =====
  // الاختبار يُنشأ مسودة وتنشره الأدمن بعد المراجعة الشرعية (مثل المحاضرات). الإجابة الصحيحة لا تُرسل للطفل قبل الحل،
  // والتصحيح هنا في الخلفية، والنجوم على أول محاولة فقط (المحاولات بعدها للتدريب)
  quizzes: (p, me) => {
    const isT = RANK[me.role] >= RANK.teacher;
    const qs = rows_('Questions'), res = rows_('Results');
    const pid = p.prophet_id ? prophetRef_(p.prophet_id) : '';
    return rows_('Quizzes').filter(z => z.class_id === cls_(me, p) && (isT || z.status === 'published') && (!pid || z.prophet_id === pid))
      .sort(byNewest_).map(z => {
        const o = quizOut_(z); o.count = qs.filter(q => q.quiz_id === z.quiz_id).length;
        if (isT) o.results = res.filter(r => r.quiz_id === z.quiz_id).length;
        else { const r = res.find(x => x.quiz_id === z.quiz_id && x.user_id === me.user_id); o.mine = r ? { score: Number(r.score), total: Number(r.total), stars: Number(r.stars) || 0 } : null; }
        return o;
      });
  },

  quiz: (p, me) => {
    const isT = RANK[me.role] >= RANK.teacher;
    const z = ownQuiz_(me, p);
    if (!isT && z.status !== 'published') throw new Error('الاختبار غير موجود');
    const out = { quiz: quizOut_(z), questions: quizQuestions_(z.quiz_id).map(q => questionOut_(q, isT)) };
    if (!isT) { const r = rows_('Results').find(x => x.quiz_id === z.quiz_id && x.user_id === me.user_id); out.mine = r ? { score: Number(r.score), total: Number(r.total), stars: Number(r.stars) || 0 } : null; }
    return out;
  },

  saveQuiz: (p, me) => {
    const title = String(p.title || '').trim().slice(0, 120);
    if (!title) throw new Error('اكتبي عنوان الاختبار');
    const list = Array.isArray(p.questions) ? p.questions : [];
    if (!list.length) throw new Error('أضيفي سؤالًا واحدًا على الأقل');
    if (list.length > 30) throw new Error('الحد الأقصى 30 سؤالًا');
    const old = p.quiz_id ? ownQuiz_(me, p) : null;
    let solved = false;
    if (old) {
      if (old.status === 'published' && RANK[me.role] < RANK.admin) throw new Error('الاختبار منشور — تعديله للأدمن فقط');
      solved = rows_('Results').some(r => r.quiz_id === old.quiz_id);
      // بعد أن حلّه أطفال: الأدمن فقط تصحّح الأسئلة (نفس عددها)، ثم يُعاد تصحيح نتائجهم ويصلهم إشعار
      if (solved && RANK[me.role] < RANK.admin) throw new Error('حلّه أطفال بالفعل — تصحيح الأسئلة للأدمن فقط');
    }
    const oldQs = old ? quizQuestions_(old.quiz_id) : [];
    if (solved && list.length !== oldQs.length) throw new Error('حلّه أطفال بالفعل: يمكن تصحيح الأسئلة فقط، بدون إضافة أو حذف أسئلة');
    const clean = list.map((q, i) => cleanQuestion_(q, i, oldQs));
    const f = { title, prophet_id: p.prophet_id ? prophetRef_(p.prophet_id) : '', lecture_id: p.lecture_id ? ownLecture_(me, p).lecture_id : '', updated_at: now_() };
    // اختبار موجود: الفحص والتعديل وإعادة التصحيح كلها تحت نفس قفل submitQuiz، حتى لا يحل طفل
    // بالأسئلة القديمة بين الفحص والتعديل (فتضيع إجاباته أو يحتفظ بنجوم المفتاح الخاطئ)
    if (old) return withLock_(() => {
      const nowSolved = rows_('Results').some(r => r.quiz_id === old.quiz_id);
      if (nowSolved) {
        if (RANK[me.role] < RANK.admin) throw new Error('حلّه أطفال بالفعل — تصحيح الأسئلة للأدمن فقط');
        const cur = quizQuestions_(old.quiz_id);
        if (cur.length !== clean.length) throw new Error('حلّه أطفال بالفعل: يمكن تصحيح الأسئلة فقط، بدون إضافة أو حذف أسئلة');
        const nOpts = (q) => ['opt_a', 'opt_b', 'opt_c', 'opt_d'].filter(k => String(q[k] === undefined ? '' : q[k]).trim()).length;
        clean.forEach((q, i) => { if (nOpts(q) !== nOpts(cur[i])) throw new Error('السؤال ' + (i + 1) + ': حلّه أطفال، فلا يُضاف اختيار ولا يُحذف — صحّحي نص الاختيار فقط'); });
        // نفس معرّفات الأسئلة (إجابات الأطفال محفوظة بها)، ثم إعادة التصحيح والإشعار
        // لا تغيير في الأسئلة نفسها (العنوان فقط مثلًا): لا إعادة تصحيح ولا إشعارات
        const KEYS = ['text', 'opt_a', 'opt_b', 'opt_c', 'opt_d', 'correct', 'image_file_id'];
        const changed = clean.some((q, i) => KEYS.some(k => String(q[k] === undefined ? '' : q[k]) !== String(cur[i][k] === undefined ? '' : cur[i][k])));
        update_('Quizzes', 'quiz_id', old.quiz_id, f);
        if (!changed) return old.quiz_id;
        clean.forEach((q, i) => update_('Questions', 'question_id', cur[i].question_id, q));
        regradeQuiz_(old.quiz_id, title);
        return old.quiz_id;
      }
      update_('Quizzes', 'quiz_id', old.quiz_id, f);
      remove_('Questions', 'quiz_id', old.quiz_id);
      clean.forEach(q => append_('Questions', Object.assign(q, { question_id: id_('q'), quiz_id: old.quiz_id })));
      return old.quiz_id;
    });
    const id = id_('Z');
    append_('Quizzes', Object.assign(f, { quiz_id: id, class_id: cls_(me, p), status: 'draft', created_by: me.user_id, created_at: now_() }));
    clean.forEach(q => append_('Questions', Object.assign(q, { question_id: id_('q'), quiz_id: id })));
    return id;
  },

  setQuizStatus: (p, me) => {
    if (['draft', 'published'].indexOf(p.status) < 0) throw new Error('حالة غير صحيحة');
    const z = ownQuiz_(me, p);
    if (p.status === 'published' && !quizQuestions_(z.quiz_id).length) throw new Error('الاختبار بلا أسئلة');
    update_('Quizzes', 'quiz_id', z.quiz_id, { status: p.status });
    // أول نشر فقط (إعادة النشر بعد المسودة لا ترسل إشعارًا جديدًا)
    if (p.status === 'published' && z.status !== 'published' && !CacheService.getScriptCache().get('ntq:' + z.quiz_id)) {
      CacheService.getScriptCache().put('ntq:' + z.quiz_id, '1', 6 * 3600);
      notifyClassTask_(z.class_id, 'quiz', z.title);
    }
    return true;
  },

  // المسودة تحذفها المعلمة، والمنشور تحذفه الأدمن فقط (النجوم التي أخذها الأطفال تبقى لهم)
  deleteQuiz: (p, me) => {
    const z = ownQuiz_(me, p);
    if (z.status === 'published' && RANK[me.role] < RANK.admin) throw new Error('الاختبار المنشور تحذفه الأدمن فقط');
    remove_('Questions', 'quiz_id', z.quiz_id);
    remove_('Results', 'quiz_id', z.quiz_id);
    remove_('Quizzes', 'quiz_id', z.quiz_id);
    return true;
  },

  submitQuiz: (p, me) => {
    const z = ownQuiz_(me, p);
    const kid = me.role === 'student';
    if (kid && z.status !== 'published') throw new Error('الاختبار غير موجود');
    rate_('quiz:' + me.user_id, 30, 600);
    const ans = p.answers && typeof p.answers === 'object' ? p.answers : {};
    const chosen = {};
    let score = 0, review = [], total = 0, stars = 0;
    const grade = () => {
      const qs = quizQuestions_(z.quiz_id);
      review = qs.map(q => {
        const a = Number(ans[q.question_id]), c = 'abcd'.indexOf(String(q.correct));
        const pick = Number.isInteger(a) && a >= 0 && a < 4 ? a : -1;
        if (pick >= 0) chosen[q.question_id] = pick;
        if (pick === c) score++;
        return { question_id: q.question_id, chosen: pick, correct: c, ok: pick === c };
      });
      total = qs.length; stars = total ? Math.round(QUIZ_STARS * score / total) : 0;
    };
    let first = false, best = null;
    // المعلمة تجرّب الاختبار بدون تسجيل نتيجة أو نجوم
    if (!kid) grade();
    else {
      // التصحيح داخل القفل: لو عدّلت الأدمن الأسئلة (saveQuiz بعد الحل) في نفس اللحظة لا تُحسب النتيجة بالمفتاح القديم بعد إعادة التصحيح
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        grade();
        const prev = rows_('Results').find(r => r.quiz_id === z.quiz_id && r.user_id === me.user_id);
        if (prev) best = { score: Number(prev.score), total: Number(prev.total), stars: Number(prev.stars) || 0 };
        else {
          append_('Results', { quiz_id: z.quiz_id, user_id: me.user_id, score, total, at: now_(), answers: JSON.stringify(chosen), stars });
          if (stars) addPoints_(me.user_id, stars, 'اختبار: ' + String(z.title).slice(0, 60));
          first = true;
        }
      } finally { lock.releaseLock(); }
    }
    return { score, total, stars: first ? stars : 0, first, best, review };
  },

  // نتائج اختبار: كل طفل وإجاباته، ونسبة الصواب في كل سؤال
  quizResults: (p, me) => {
    const z = ownQuiz_(me, p);
    const qs = quizQuestions_(z.quiz_id);
    const res = rows_('Results').filter(r => r.quiz_id === z.quiz_id);
    const per = qs.map(() => ({ right: 0, answered: 0 }));
    const kids = rows_('Users').filter(u => u.class_id === z.class_id && u.role === 'student' && !inactive_(u)).map(k => {
      const r = res.find(x => x.user_id === k.user_id);
      const o = { user_id: k.user_id, name: k.name, avatar: k.avatar, done: !!r };
      if (!r) return o;
      let a = {}; try { a = JSON.parse(r.answers || '{}') || {}; } catch (e) {}
      o.answers = qs.map((q, i) => {
        const v = a[q.question_id] === undefined ? -1 : Number(a[q.question_id]);
        if (v >= 0) { per[i].answered++; if (v === 'abcd'.indexOf(String(q.correct))) per[i].right++; }
        return v;
      });
      return Object.assign(o, { score: Number(r.score), total: Number(r.total), stars: Number(r.stars) || 0, at: r.at });
    }).sort((a, b) => (b.done - a.done) || ((b.score || 0) - (a.score || 0)));
    return { quiz: quizOut_(z), questions: qs.map(q => questionOut_(q, true)), kids, per };
  },

  // الواجبات: المعلمة تنشرها مباشرة، والطفل يضع «أنجزت»، والمعلمة تعتمد فيأخذ نجومًا (مرة واحدة)
  assignments: (p, me) => {
    const isT = RANK[me.role] >= RANK.teacher;
    const subs = rows_('Submissions');
    const pid = p.prophet_id ? prophetRef_(p.prophet_id) : '';
    const users = isT ? rows_('Users') : [];
    const kids = users.filter(u => u.class_id === cls_(me, p) && u.role === 'student' && !inactive_(u)).length;
    const names = {}; users.forEach(u => names[u.user_id] = u.name);
    return rows_('Assignments').filter(a => a.class_id === cls_(me, p) && (!pid || a.prophet_id === pid)).sort(byNewest_).map(a => {
      const o = assignmentOut_(a), mine = subs.filter(s => s.assignment_id === a.assignment_id);
      if (isT) Object.assign(o, { kids, done: mine.filter(s => s.status === 'done').length, approved: mine.filter(s => s.status === 'approved').length,
        can_manage: canManageHw_(me, a), helpers: helpersOf_(a), created_by: a.created_by || '', created_by_name: names[a.created_by] || '' });
      else { const s = mine.find(x => x.user_id === me.user_id); o.status = s ? s.status : ''; }
      return o;
    });
  },

  saveAssignment: (p, me) => {
    const f = { title: String(p.title || '').trim().slice(0, 120), details: String(p.details || '').slice(0, 1500),
      due: String(p.due || ''), prophet_id: p.prophet_id ? prophetRef_(p.prophet_id) : '', lecture_id: p.lecture_id ? ownLecture_(me, p).lecture_id : '' };
    if (!f.title) throw new Error('اكتبي عنوان الواجب');
    if (f.due && !/^\d{4}-\d{2}-\d{2}$/.test(f.due)) throw new Error('تاريخ غير صحيح');
    if (p.assignment_id) {
      const a = manageAssignment_(me, p);
      // المشاركة تغيّرها صاحبة الواجب أو الأدمن فقط (لا المعلمة المشارَكة)
      if (p.helpers !== undefined && (a.created_by === me.user_id || RANK[me.role] >= RANK.admin)) f.helpers = cleanHelpers_(p.helpers, a.class_id, a.created_by);
      update_('Assignments', 'assignment_id', a.assignment_id, f); return a.assignment_id;
    }
    const id = id_('W'), cls = cls_(me, p);
    append_('Assignments', Object.assign(f, { assignment_id: id, class_id: cls, created_by: me.user_id, created_at: now_(), helpers: cleanHelpers_(p.helpers, cls, me.user_id) }));
    notifyClassTask_(cls, 'hw', f.title);
    return id;
  },

  // الحذف لصاحبة الواجب والأدمن فقط (المعلمة المشارَكة تتابع وتعتمد ولا تحذف)
  deleteAssignment: (p, me) => {
    const a = manageAssignment_(me, p);
    if (a.created_by && a.created_by !== me.user_id && RANK[me.role] < RANK.admin) throw new Error('حذف الواجب لصاحبته أو الأدمن فقط');
    remove_('Submissions', 'assignment_id', a.assignment_id);
    remove_('Assignments', 'assignment_id', a.assignment_id);
    return true;
  },

  markAssignment: (p, me) => {
    if (me.role !== 'student') throw new Error('للأطفال فقط');
    const a = ownAssignment_(me, p);
    rate_('mark:' + me.user_id, 60, 600); // تبديل «أنجزت» بلا حد = كتابات لا نهائية على الشيت
    const key = a.assignment_id + ':' + me.user_id;
    // قفل مع reviewAssignment: بدونه يكتب الطفل «done» (أو يحذف الصف) فوق «approved» بين قراءة المعلمة وكتابتها، فتعتمد مرة ثانية بنجوم جديدة
    return withLock_(() => {
      const s = rows_('Submissions').find(x => x.sub_id === key);
      if (s && s.status === 'approved') throw new Error('اعتمدته المعلمة بالفعل');
      if (p.done === false) { if (s) remove_('Submissions', 'sub_id', key); return ''; }
      if (s) update_('Submissions', 'sub_id', key, { status: 'done', at: now_() });
      else append_('Submissions', { sub_id: key, assignment_id: a.assignment_id, user_id: me.user_id, status: 'done', at: now_() });
      return 'done';
    });
  },

  // إشعارات الطفل غير المقروءة (أحدثها أولًا)
  notices: (p, me) => rows_('Notices').filter(n => n.user_id === me.user_id && !truthy_(n.read))
    .sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20).map(n => ({ notice_id: n.notice_id, text: n.text, at: n.at })),

  readNotice: (p, me) => {
    const n = rows_('Notices').find(x => x.notice_id === String(p.notice_id || '') && x.user_id === me.user_id);
    if (!n) throw new Error('الإشعار غير موجود');
    update_('Notices', 'notice_id', n.notice_id, { read: true });
    return true;
  },

  // معلمات الفصل (لمشاركة الواجب معهن)
  classTeachers: (p, me) => rows_('Users').filter(u => (u.role === 'teacher' || u.role === 'admin') && u.class_id === cls_(me, p) && u.user_id !== me.user_id && !inactive_(u))
    .map(u => ({ user_id: u.user_id, name: u.name, role: u.role })),

  assignmentStatus: (p, me) => {
    const a = manageAssignment_(me, p);
    const subs = rows_('Submissions').filter(s => s.assignment_id === a.assignment_id);
    const kids = rows_('Users').filter(u => u.class_id === a.class_id && u.role === 'student' && !inactive_(u)).map(k => {
      const s = subs.find(x => x.user_id === k.user_id);
      return { user_id: k.user_id, name: k.name, avatar: k.avatar, status: s ? s.status : '', at: s ? s.at : '' };
    });
    return { assignment: assignmentOut_(a), kids };
  },

  // approve=true يعتمد (ولو لم يضع الطفل «أنجزت»)، وfalse يرجعه للطفل ليعيده (ويسحب النجوم لو كان معتمدًا)
  reviewAssignment: (p, me) => {
    const a = manageAssignment_(me, p);
    const kid = rows_('Users').find(u => u.user_id === p.user_id && u.role === 'student' && u.class_id === a.class_id);
    if (!kid) throw new Error('الطالب غير موجود');
    const key = a.assignment_id + ':' + kid.user_id;
    const status = p.approve === true || p.approve === 'true' ? 'approved' : 'returned';
    // القراءة والكتابة والنجوم تحت قفل واحد: ضغطتا «اعتماد» متزامنتان كانتا تعطيان النجوم مرتين
    return withLock_(() => {
      const s = rows_('Submissions').find(x => x.sub_id === key);
      const was = s ? s.status : '';
      if (was === status) return status;
      const patch = { status, reviewed_by: me.user_id, reviewed_at: now_() };
      if (s) update_('Submissions', 'sub_id', key, patch);
      else append_('Submissions', Object.assign(patch, { sub_id: key, assignment_id: a.assignment_id, user_id: kid.user_id, at: now_() }));
      const reason = 'واجب: ' + String(a.title).slice(0, 60);
      if (status === 'approved') addPoints_(kid.user_id, ASSIGN_STARS, reason);
      else if (was === 'approved') addPoints_(kid.user_id, -ASSIGN_STARS, 'إلغاء اعتماد ' + reason);
      return status;
    });
  },

  // ===== سجل العمليات (المعلمة الأدمن تقرأ، والمطوّر) =====
  // الأدمن ترى عمليات فصلها فقط (منفّذها أو هدفها من فصلها)، والمطوّر يرى الكل
  auditLog: (p, me) => {
    const users = {}; rows_('Users').forEach(u => users[u.user_id] = u);
    const limit = Math.min(Number(p.limit) || 100, 500);
    let list = rows_('AuditLog');
    if (me.role !== 'superadmin') {
      const lec = {}; rows_('Lectures').forEach(l => lec[l.lecture_id] = l.class_id);
      const mine = (id) => !!id && ((users[id] && String(users[id].class_id) === String(me.class_id)) || lec[id] === me.class_id || id === me.class_id);
      list = list.filter(a => mine(a.user_id) || mine(a.target_id));
    }
    const nm = (id) => users[id] ? users[id].name : id;
    return list.slice(-limit).reverse().map(a => Object.assign({}, a, { name: nm(a.user_id), imp_name: a.imp_by ? nm(a.imp_by) : '' }));
  },

  // ===== المطوّر (superadmin) =====
  users: (p) => {
    const classes = rows_('Classes');
    return rows_('Users').filter(u => (!p.role || u.role === p.role) && (!p.class_id || u.class_id === p.class_id))
      .map(u => publicUser_(u, classes));
  },

  classes: () => {
    const users = rows_('Users'), lectures = rows_('Lectures');
    return rows_('Classes').map(c => ({ class_id: c.class_id, name: c.name, join_code: String(c.join_code),
      teacher: (users.find(u => u.user_id === c.teacher_id) || {}).name || '',
      kids: users.filter(u => u.class_id === c.class_id && u.role === 'student' && u.active !== false).length,
      lectures: lectures.filter(l => l.class_id === c.class_id).length,
      published: lectures.filter(l => l.class_id === c.class_id && l.status === 'published').length }));
  },

  // «عرض كـ»: توكن ساعتين لمستخدم آخر، للعرض فقط (أي حفظ يُرفض)
  viewAs: (p, me) => {
    const u = targetUser_(me, p.user_id);
    if (u.active === false) throw new Error('الحساب معطّل');
    return { token: makeToken_(u, 2 * 3600e3, me.user_id), user: { user_id: u.user_id, name: u.name, role: u.role, class_id: u.class_id, avatar: u.avatar, gender: genderOf_(u) } };
  },

  setRole: (p, me) => {
    const u = targetUser_(me, p.user_id);
    if (['teacher', 'admin'].indexOf(p.role) < 0) throw new Error('الدور: معلمة أو معلمة أدمن');
    if (u.role === 'student') throw new Error('لا يمكن تغيير دور طفل');
    update_('Users', 'user_id', u.user_id, { role: p.role });
    return true;
  },

  setUserActive: (p, me) => {
    const u = targetUser_(me, p.user_id);
    update_('Users', 'user_id', u.user_id, { active: p.active === true || p.active === 'true' });
    return true;
  },

  setUserPin: (p, me) => {
    const u = targetUser_(me, p.user_id);
    const pin = normDigits_(p.pin);
    if (u.role === 'student' ? !/^\d{4}$/.test(pin) : !/^\d{6,}$/.test(pin)) throw new Error(u.role === 'student' ? 'رمز الطفل 4 أرقام' : 'رمز المعلمة 6 أرقام على الأقل');
    update_('Users', 'user_id', u.user_id, { pin_hash: hashPin_(pin) });
    const key = 'login:' + (u.role === 'student' ? u.user_id : staffName_(u.name));
    clearAttempts_(key, rows_('LoginAttempts').find(r => String(r.key) === key));
    return true;
  },

  // صحة النظام: النسخة، عدد الصفوف، الإعدادات (موجودة أم لا فقط)، المشغّلات، حالة البوت، الحسابات المقفولة
  systemHealth: () => {
    const ss = ss_();
    const tables = Object.keys(SCHEMA).map(n => { const sh = ss.getSheetByName(n); return { name: n, rows: sh ? Math.max(0, sh.getLastRow() - 1) : -1 }; });
    const keys = ['BOT_TOKEN', 'HMAC_KEY', 'PIN_SALT', 'WEBHOOK_KEY', 'SITE_ORIGIN', 'ROOT_FOLDER', 'DRIVE_API_KEY'];
    const settings = keys.map(k => ({ key: k, set: !!prop_(k) }));
    const triggers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
    let bot = null;
    try {
      if (prop_('BOT_TOKEN')) {
        const w = tg_('getWebhookInfo', {}).result || {};
        bot = { webhook: w.url ? w.url.replace(/^(https:\/\/[^/]+).*$/, '$1/…') : '', pending: w.pending_update_count || 0,
          lastError: w.last_error_message || '', lastErrorAt: w.last_error_date ? new Date(w.last_error_date * 1000).toISOString() : '',
          updates: w.allowed_updates || ['message'], sendError: prop_('TG_LAST_ERROR') || '' };
      }
    } catch (e) { bot = { error: String(e.message || e) }; }
    const locked = rows_('LoginAttempts').filter(a => a.locked_until && new Date(a.locked_until).getTime() > Date.now()).length;
    return { version: VERSION, tables, settings, triggers, bot, lockedAccounts: locked, now: now_() };
  }
};

/* ============ منع التخمين ============
 * الدخول: 5 أخطاء على نفس الحساب ← قفل 10 دقائق، ومن 10 أخطاء ← 30 دقيقة. الدخول الصحيح يمسح العداد،
 * والعداد يبدأ من جديد بعد 24 ساعة. كود الفصل: لا قفل (حتى لا يُمنع كل الأطفال)، بل إبطاء بعد أخطاء كثيرة. */
function checkLock_(key) {
  const a = rows_('LoginAttempts').find(r => String(r.key) === key);
  if (a && a.locked_until && new Date(a.locked_until).getTime() > Date.now()) {
    const m = Math.ceil((new Date(a.locked_until).getTime() - Date.now()) / 60000);
    throw new Error('محاولات كثيرة خاطئة، حاول بعد ' + m + ' دقيقة');
  }
  return a;
}
function failAttempt_(key, a) {
  const fresh = !a || !a.first_at || Date.now() - new Date(a.first_at).getTime() > 864e5;
  const fails = (fresh ? 0 : Number(a.fails) || 0) + 1;
  const lockMin = fails >= 10 ? 30 : fails >= 5 ? 10 : 0;
  const row = { key, fails, first_at: fresh ? now_() : a.first_at, locked_until: lockMin ? new Date(Date.now() + lockMin * 60000).toISOString() : '' };
  if (a) update_('LoginAttempts', 'key', key, row); else append_('LoginAttempts', row);
  return lockMin;
}
function clearAttempts_(key, a) { if (a && Number(a.fails)) update_('LoginAttempts', 'key', key, { fails: 0, first_at: '', locked_until: '' }); }
function codeFail_(k) {
  const cache = CacheService.getScriptCache(), key = k || 'codeFails';
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 600);
  if (n > 20) Utilities.sleep(Math.min(5000, (n - 20) * 250));
}
// حد بسيط للطلبات لكل مستخدم (يحمي حصص UrlFetch وحجم الشيت من الاستنزاف)
function rate_(key, max, sec) {
  const cache = CacheService.getScriptCache(), k = 'rl:' + key;
  const n = Number(cache.get(k) || 0) + 1;
  cache.put(k, String(n), sec);
  if (n > max) throw new Error('طلبات كثيرة، حاول بعد قليل');
}
// ملف درايف يكتب معرّفه المستخدم: يجب أن يكون داخل مجلدات المنصة (رُفع من الموقع أو البوت)،
// وإلا يمكن ربط أي ملف خاص لصاحب الحساب (حتى شيت قاعدة البيانات) ثم مشاركته للعامة أو قراءته عبر audioChunk
function platformFile_(id) {
  const v = String(id || '');
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(v)) throw new Error('الملف غير صالح');
  const folders = ['audio', 'images'].map(k => prop_('FOLDER_' + k)).filter(Boolean);
  try {
    const it = DriveApp.getFileById(v).getParents();
    while (it.hasNext()) if (folders.indexOf(it.next().getId()) >= 0) return v;
  } catch (e) {}
  throw new Error('الملف ليس من ملفات المنصة — ارفعيه من الموقع');
}
// نوع الملف في جلسة الرفع: صوت/صورة فقط، وإلا النوع الافتراضي
function uploadMime_(mime, kind) {
  const m = String(mime || '').toLowerCase();
  if (kind === 'images') return /^image\/(jpeg|png|webp|gif|heic|heif)$/.test(m) ? m : 'image/jpeg';
  return /^(audio|video)\/[a-z0-9.+-]{1,40}$/.test(m) ? m : 'audio/mpeg';
}

function publicUser_(u, classes) {
  const c = classes && classes.find(x => x.class_id === u.class_id);
  return { user_id: u.user_id, role: u.role, name: u.name, class_id: u.class_id, class_name: c ? c.name : '', avatar: u.avatar,
    active: u.active !== false, last_login_at: u.last_login_at || '', created_at: u.created_at || '' };
}
// معلمة يمكن للمستخدم إدارتها: الأدمن ← معلمات فصلها فقط (لا الأدمن الأخرى)، المطوّر ← كل المعلمات والأدمن
function staffTarget_(me, user_id) {
  const u = rows_('Users').find(x => x.user_id === user_id && (x.role === 'teacher' || x.role === 'admin'));
  if (!u) throw new Error('المعلمة غير موجودة');
  if (u.user_id === me.user_id) throw new Error('لا يمكن تنفيذ هذا على حسابك');
  if (me.role !== 'superadmin' && (u.class_id !== me.class_id || u.role !== 'teacher')) throw new Error('ليس لديك صلاحية على هذا الحساب');
  return u;
}
// الدخول بالاسم، فلا يتكرر اسم بين المعلمات
function uniqueStaffName_(name, exceptId) {
  if (rows_('Users').some(u => u.role !== 'student' && u.user_id !== exceptId && staffName_(u.name) === staffName_(name))) throw new Error('يوجد حساب بنفس الاسم، اختاري اسمًا آخر');
}
function targetUser_(me, user_id) {
  const u = rows_('Users').find(x => x.user_id === user_id);
  if (!u) throw new Error('المستخدم غير موجود');
  if (u.user_id === me.user_id) throw new Error('لا يمكن تنفيذ هذا على حسابك');
  if (u.role === 'superadmin') throw new Error('لا يمكن تعديل حساب مطوّر آخر');
  return u;
}

// ===== أدوات رحلة الأنبياء =====
// أشكال المجسم المسموحة: القديمة + رموز الأنبياء المراجَعة (app/src/content/prophets-content.json)
const SYMBOLS = ['crescent', 'ark', 'staff', 'kaaba', 'whale', 'yusuf_dream', 'mushaf', 'dome', 'sword', 'book',
  'tree', 'star_high', 'wind_swirl', 'camel', 'moon_road', 'ram', 'star_tree', 'shirt', 'planets11_sun_moon', 'spring', 'scale', 'two_candles', 'hourglass', 'armor_rings', 'ant', 'single_light', 'star', 'mihrab', 'book_open', 'maidah'];
function truthy_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function bySort_(a, b) { return Number(a.sort) - Number(b.sort); }
function slug_(s) { const v = String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30); if (!v) throw new Error('معرّف غير صحيح'); return v; }
function cleanProphet_(x) {
  const sym = String(x.symbol || '');
  return { name: String(x.name || '').trim().slice(0, 40), title: String(x.title || '').slice(0, 80), tag: String(x.tag || '').slice(0, 80),
    text: String(x.text || '').slice(0, 600), symbol: SYMBOLS.indexOf(sym) >= 0 ? sym : '', symbol_name: String(x.symbol_name || '').slice(0, 60) };
}
function prophetOut_(r) { return { prophet_id: r.prophet_id, name: r.name, title: r.title, tag: r.tag, text: r.text, symbol: r.symbol, symbol_name: r.symbol_name }; }
function contentOut_(c) { return { item_id: c.item_id, kind: c.kind, title: c.title, body: c.body, file_id: c.file_id, url: c.url, visible: truthy_(c.visible), approved: truthy_(c.approved) }; }
// معرّف فيديو يوتيوب من أي شكل للرابط (watch, youtu.be, shorts, embed, live) أو المعرّف نفسه
function youtubeId_(u) {
  const s = String(u || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}
function reorder_(name, keyCol, ids) {
  if (!Array.isArray(ids)) throw new Error('ترتيب غير صحيح');
  ids.forEach((id, i) => update_(name, keyCol, id, { sort: i }));
}
// محاضرة من فصل المعلمة (أو أي فصل للمطوّر)
function ownLecture_(me, p) {
  const l = rows_('Lectures').find(x => x.lecture_id === p.lecture_id && x.class_id === cls_(me, p));
  if (!l) throw new Error('المحاضرة غير موجودة');
  return l;
}
// الاقتراحات: المعلمة والأدمن يرون اقتراحات فصلهم فقط، والمطوّر الكل
function classSuggestions_(me) {
  const all = rows_('Suggestions');
  if (me.role === 'superadmin') return all;
  const cls = {}; rows_('Users').forEach(u => cls[u.user_id] = String(u.class_id));
  return all.filter(s => cls[s.from_user] === String(me.class_id));
}
// قسم حرج على الشيت (قراءة ثم كتابة) لا يتداخل مع طلب آخر
function withLock_(fn) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function addPoints_(user_id, points, reason) { append_('Points', { user_id, points, reason, at: now_() }); }

// ===== أدوات الاختبارات والواجبات =====
const QUIZ_STARS = 20, ASSIGN_STARS = 15; // أقصى نجوم الاختبار (حسب الدرجة)، ونجوم الواجب المعتمد
function byNewest_(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }
// معرّف نبي (لا نشترط وجوده في الجدول: الرحلة قد تعمل ببياناتها الاحتياطية)
function prophetRef_(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30); }
// اختبار/واجب من فصل المستخدم (والمطوّر أي فصل)
function ownQuiz_(me, p) {
  const z = rows_('Quizzes').find(x => x.quiz_id === String(p.quiz_id || '') && (me.role === 'superadmin' || x.class_id === me.class_id));
  if (!z) throw new Error('الاختبار غير موجود');
  return z;
}
function ownAssignment_(me, p) {
  const a = rows_('Assignments').find(x => x.assignment_id === String(p.assignment_id || '') && (me.role === 'superadmin' || x.class_id === me.class_id));
  if (!a) throw new Error('الواجب غير موجود');
  return a;
}
// صاحبة الواجب، ومن شاركته معها، وأدمن الفصل، والمطوّر (الواجبات القديمة بلا صاحبة: كل معلمات الفصل)
function helpersOf_(a) { return String(a.helpers || '').split(',').map(x => x.trim()).filter(Boolean); }
function canManageHw_(me, a) {
  if (me.role === 'superadmin') return true;
  if (RANK[me.role] < RANK.teacher || a.class_id !== me.class_id) return false;
  return me.role === 'admin' || !a.created_by || a.created_by === me.user_id || helpersOf_(a).indexOf(me.user_id) >= 0;
}
function manageAssignment_(me, p) {
  const a = ownAssignment_(me, p);
  if (!canManageHw_(me, a)) throw new Error('هذا الواجب لمعلمة أخرى — اطلبي منها أن تشاركه معكِ');
  return a;
}
// معلمات من نفس الفصل فقط (لا طلاب ولا فصل آخر)
function cleanHelpers_(list, classId, owner) {
  const ids = (Array.isArray(list) ? list : []).map(String);
  const ok = {}; rows_('Users').forEach(u => { if ((u.role === 'teacher' || u.role === 'admin') && u.class_id === classId && u.user_id !== owner) ok[u.user_id] = 1; });
  return ids.filter((id, i) => ok[id] && ids.indexOf(id) === i).slice(0, 20).join(',');
}
// يحدّث كل الصفوف التي تحقق الشرط (للجداول بلا مفتاح فريد مثل Results)
function updateWhere_(name, pred, patchOf) {
  const sh = ss_().getSheetByName(name);
  const v = sh.getDataRange().getValues(), head = v[0];
  for (let i = 1; i < v.length; i++) {
    const o = {}; head.forEach((h, j) => o[h] = v[i][j]);
    if (!pred(o)) continue;
    const patch = patchOf(o); if (!patch) continue;
    Object.keys(patch).forEach(k => { const ci = head.indexOf(k); if (ci >= 0) sh.getRange(i + 1, ci + 1).setValue(cell_(patch[k])); });
  }
}
// بعد تصحيح سؤال في اختبار محلول: نعيد حساب درجة كل طفل ونجومه (الفرق فقط يُضاف أو يُخصم) ونرسل له إشعارًا
function regradeQuiz_(quizId, title) {
  const qs = quizQuestions_(quizId), total = qs.length;
  const t = String(title).slice(0, 60);
  const ar = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const after = [];
  updateWhere_('Results', r => r.quiz_id === quizId, r => {
    let a = {}; try { a = JSON.parse(r.answers || '{}') || {}; } catch (e) {}
    const score = qs.filter(q => a[q.question_id] !== undefined && Number(a[q.question_id]) === 'abcd'.indexOf(String(q.correct))).length;
    const stars = total ? Math.round(QUIZ_STARS * score / total) : 0;
    after.push({ user_id: r.user_id, score, diff: stars - (Number(r.stars) || 0) });
    return { score, total, stars };
  });
  // النجوم والإشعارات بعد حفظ النتائج: لو توقف التنفيذ في المنتصف لا تُمنح نفس النجوم مرة ثانية عند الحفظ التالي
  after.forEach(x => {
    if (x.diff) addPoints_(x.user_id, x.diff, 'تصحيح اختبار: ' + t);
    const more = x.diff > 0 ? '، وزادت نجومك بـ' + ar(x.diff) : x.diff < 0 ? '، وتغيّرت نجومك بـ' + ar(-x.diff) + ' بسبب التصحيح' : '';
    append_('Notices', { notice_id: id_('N'), user_id: x.user_id, at: now_(), read: false,
      text: 'تم تعديل سؤال في اختبار «' + t + '» لأنه كان فيه خطأ من عندنا، مش منك. نتيجتك الآن ' + ar(x.score) + ' من ' + ar(total) + more + '.' });
  });
}
function cleanGender_(g) { return g === 'f' ? 'f' : 'm'; }
function genderOf_(u) { return u && u.gender === 'f' ? 'f' : 'm'; }
function quizQuestions_(id) { return rows_('Questions').filter(q => q.quiz_id === id).sort(bySort_); }
function quizOut_(z) { return { quiz_id: z.quiz_id, title: z.title, status: z.status, prophet_id: z.prophet_id || '', lecture_id: z.lecture_id || '', created_at: z.created_at }; }
function assignmentOut_(a) { return { assignment_id: a.assignment_id, title: a.title, details: a.details, due: a.due ? day_(a.due) : '', prophet_id: a.prophet_id || '', lecture_id: a.lecture_id || '', created_at: a.created_at }; }
// السؤال للطفل بدون الإجابة الصحيحة، وللمعلمة معها
function questionOut_(q, withAnswer) {
  const o = { question_id: q.question_id, text: q.text, image_file_id: q.image_file_id || '',
    options: [q.opt_a, q.opt_b, q.opt_c, q.opt_d].map(x => String(x === undefined || x === null ? '' : x)).filter(Boolean) };
  if (withAnswer) o.correct = 'abcd'.indexOf(String(q.correct));
  return o;
}
// سؤال من المعلمة: options (2–4 نصوص) و correct رقم الإجابة الصحيحة فيها، وصورة اختيارية من ملفات المنصة
function cleanQuestion_(q, i, oldQs) {
  const n = 'السؤال ' + (i + 1) + ': ';
  q = q || {};
  const text = String(q.text || '').trim().slice(0, 300);
  if (!text) throw new Error(n + 'اكتبي نص السؤال');
  const ci = Number(q.correct), opts = [];
  let correct = '';
  (Array.isArray(q.options) ? q.options.slice(0, 4) : []).forEach((o, k) => {
    const v = String(o === undefined || o === null ? '' : o).trim().slice(0, 120);
    if (!v) return;
    if (k === ci) correct = 'abcd'[opts.length];
    opts.push(v);
  });
  if (opts.length < 2) throw new Error(n + 'اكتبي اختيارين على الأقل');
  if (!correct) throw new Error(n + 'اختاري الإجابة الصحيحة');
  const image = String(q.image_file_id || '');
  if (image && !oldQs.some(o => String(o.image_file_id) === image)) { platformFile_(image); share_(image); }
  return { text, opt_a: opts[0], opt_b: opts[1], opt_c: opts[2] || '', opt_d: opts[3] || '', correct, points: 1, image_file_id: image, sort: i };
}
function share_(fileId) { try { DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {} }

/* ============ 5) بوت تيليجرام للمعلمات ============ */
function tg_(method, payload) {
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload || {}), muteHttpExceptions: true });
  const j = JSON.parse(r.getContentText());
  // آخر خطأ من تيليجرام يظهر في «صحة النظام» للمطوّر
  if (!j.ok && method !== 'deleteMessage') { try { props_().setProperty('TG_LAST_ERROR', now_() + ' ' + method + ': ' + (j.description || '')); } catch (e) {} }
  return j;
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
  return rows_('Users').find(u => String(u.telegram_id) === String(chat) && RANK[u.role] >= RANK.teacher && u.active !== false);
}

/* البوت بالأزرار — المعلمة لا تكتب شيئًا (إلا عنوانًا مختلفًا لو أرادت).
 * أزرار لوحة المفاتيح (reply keyboard) ترسل نص الزر كرسالة عادية، فتعمل مع إعداد البوت الحالي
 * (allowed_updates: message) بدون أي تغيير في تيليجرام أو الوسيط. */
const BTN = {
  NEW: '🎙 محاضرة جديدة', MINE: '📋 محاضراتي', HELP: '❓ مساعدة', JOURNEY: '🕌 محتوى الرحلة', CANCEL: '✖ إلغاء',
  OTHER: '📝 موضوع آخر', USE: '✔ استخدمي العنوان', EDIT: '✏️ عنوان آخر', DONE_IMG: '✔ انتهيت من الصور', NO_IMG: 'بدون صور',
  SEND: '📤 إرسال للمراجعة', DONE: '✔ تم', DEL: '⌫ مسح', OK: '✔ تأكيد'
};
// الأنبياء الافتراضيون لو جدول Prophets فاضي (نفس ترتيب الرحلة)
const DEFAULT_PROPHETS = 'adam:آدم,idris:إدريس,noah:نوح,hud:هود,salih:صالح,ibrahim:إبراهيم,lut:لوط,ismail:إسماعيل,ishaq:إسحاق,yaqub:يعقوب,yusuf:يوسف,ayyub:أيوب,shuayb:شعيب,musa:موسى,harun:هارون,dhulkifl:ذو الكفل,dawud:داود,sulayman:سليمان,ilyas:إلياس,alyasa:اليسع,yunus:يونس,zakariya:زكريا,yahya:يحيى,isa:عيسى,muhammad:محمد ﷺ'
  .split(',').map(x => { const i = x.indexOf(':'); return { prophet_id: x.slice(0, i), name: x.slice(i + 1) }; });
const HELP_TEXT = 'طريقة الاستخدام 🌙\n' +
  '1) اضغطي «' + BTN.NEW + '» ثم أرسلي التسجيل الصوتي.\n' +
  '2) اختاري النبي من الأزرار، وسيُقترح العنوان تلقائيًا.\n' +
  '3) أرسلي الصور (أو «' + BTN.NO_IMG + '»)، ثم «' + BTN.SEND + '».\n' +
  'تُحفظ المحاضرة مسودةً، وتُنشر للأطفال بعد المراجعة.\n' +
  'ويمكنكِ في أي خطوة الضغط على «' + BTN.CANCEL + '».';

function kb_(rows) {
  return { reply_markup: { keyboard: rows.map(r => r.map(text => ({ text }))), resize_keyboard: true, one_time_keyboard: false, input_field_placeholder: 'اختاري من الأزرار 👇' } };
}
// زر «القائمة» بجانب خانة الكتابة في تيليجرام: أوامر تُضغط ولا تُكتب، ويعمل حتى لو اختفت الأزرار
const BOT_COMMANDS = [{ command: 'new', description: '🎙 محاضرة جديدة' }, { command: 'mine', description: '📋 محاضراتي' },
  { command: 'menu', description: '⌨️ إظهار الأزرار' }, { command: 'help', description: '❓ مساعدة' }, { command: 'cancel', description: '✖ إلغاء' }];
function ensureBotMenu_() {
  if (prop_('BOT_MENU_V') === '1') return;
  tg_('setMyCommands', { commands: BOT_COMMANDS });
  tg_('setChatMenuButton', { menu_button: { type: 'commands' } });
  props_().setProperty('BOT_MENU_V', '1');
}
function rowsOf_(list, n) { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }
function menuKb_(t) {
  const rows = [[BTN.NEW], [BTN.MINE, BTN.HELP]];
  if (RANK[t.role] >= RANK.admin) rows.splice(1, 0, [BTN.JOURNEY]);
  return kb_(rows);
}
function prophetList_() {
  const rows = rows_('Prophets').filter(r => truthy_(r.visible)).sort(bySort_).map(r => ({ prophet_id: r.prophet_id, name: String(r.name) }));
  return rows.length ? rows : DEFAULT_PROPHETS;
}
function prophetKb_(list, other) {
  const rows = rowsOf_(list.map(p => p.name), 3);
  if (other) rows.push([BTN.OTHER]);
  rows.push([BTN.CANCEL]);
  return kb_(rows);
}
// اسم النبي مع اللقب الواجب: «ﷺ» لنبينا محمد، و«عليه السلام» لباقي الأنبياء
// «أ.» (أستاذة) قبل اسم المعلمة احترامًا، إلا لو بدأ الاسم بلقب أو كان الحساب للمطوّر
function teacherTitle_(u) { const n = String(u.name || '').trim(); if (!n || /^(أ|د|م)\s*[./]/.test(n)) return n; return (u.role === 'superadmin' ? 'م. ' : 'أ. ') + n; }
function honored_(p) { const n = String(p.name).replace(/\s*(ﷺ|عليه السلام)\s*$/, ''); return p.prophet_id === 'muhammad' ? n + ' ﷺ' : n + ' عليه السلام'; }
function suggestTitle_(p) { return p.prophet_id === 'muhammad' ? 'من سيرة سيدنا محمد ﷺ' : 'قصة سيدنا ' + honored_(p); }
// SITE_ORIGIN قد يُكتب بالمسار (https://mrvoroo.github.io/Serah) كما في README: نفصل الأصل عن رابط الموقع
function siteOrigin_() { const m = String(prop_('SITE_ORIGIN') || '').match(/^https?:\/\/[^/]+/); return m ? m[0] : 'https://mrvoroo.github.io'; }
function siteUrl_() {
  if (prop_('SITE_URL')) return prop_('SITE_URL').replace(/\/$/, '');
  const s = String(prop_('SITE_ORIGIN') || '').replace(/\/$/, '');
  return /^https?:\/\/[^/]+\/./.test(s) ? s : siteOrigin_() + '/Serah';
}
// أصل الصفحة التي ترفع: الموقع نفسه أو التجربة المحلية فقط
function uploadOrigin_(o) {
  const v = String(o || '');
  return v === siteOrigin_() || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(v) ? v : siteOrigin_();
}
function botUsername_() {
  let u = prop_('BOT_USERNAME');
  if (!u) { try { const r = tg_('getMe', {}); if (r.ok) { u = r.result.username; props_().setProperty('BOT_USERNAME', u); } } catch (e) {} }
  return u || 'Serah_2026_bot';
}
// تنزيل ملف من تيليجرام إلى مجلد على درايف ومشاركته للعرض
function tgDownload_(file_id, folder, name) {
  const info = tg_('getFile', { file_id });
  if (!info.ok) return '';
  const blob = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + prop_('BOT_TOKEN') + '/' + info.result.file_path).getBlob();
  // تيليجرام يرسل الملف بدون نوع (الرسائل الصوتية .oga)؛ بدون نوع صحيح لا يشغّله المتصفح من درايف
  const ext = String(info.result.file_path).split('.').pop().toLowerCase();
  const kind = folder === 'images' ? 'image/' : 'audio/', guess = MIME_BY_EXT[ext] || '';
  const type = guess.indexOf(kind) === 0 ? guess : (kind === 'image/' ? 'image/jpeg' : 'audio/ogg');
  blob.setContentType(type);
  blob.setName(name + '.' + (type === 'audio/ogg' ? 'ogg' : type === 'image/jpeg' ? 'jpg' : ext));
  const f = DriveApp.getFolderById(prop_('FOLDER_' + folder)).createFile(type === 'audio/ogg' ? webmBlob_(blob, name) : blob);
  share_(f.getId());
  return f.getId();
}
const MIME_BY_EXT = { oga: 'audio/ogg', ogg: 'audio/ogg', opus: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const AUDIO_CHUNK = 2.5 * 1024 * 1024;
// هل يحق للمستخدم سماع هذا الملف: تسجيل محاضرة في فصله (والطفل المنشورة فقط) أو صوت معتمد في صفحة نبي
function canHearAudio_(me, p, id) {
  if (!id) return false;
  const isT = RANK[me.role] >= RANK.teacher;
  if (rows_('Lectures').some(l => l.audio_file_id === id && l.class_id === cls_(me, p) && (isT || l.status === 'published'))) return true;
  return rows_('ProphetContent').some(c => c.kind === 'audio' && c.file_id === id && (isT || (truthy_(c.approved) && truthy_(c.visible))));
}
// Ogg/Opus ← WebM/Opus (نفس الصوت). لو فشل التحويل لأي سبب نحتفظ بالملف كما هو
function webmBlob_(blob, name) {
  try {
    const out = oggOpusToWebm_(Uint8Array.from(blob.getBytes()));
    return Utilities.newBlob(Array.from(out, b => (b > 127 ? b - 256 : b)), 'audio/webm', name + '.webm');
  } catch (e) { console.error('webm', e); return blob; }
}
function isOgg_(f) { return /ogg|opus/.test(f.getMimeType()) || /\.(ogg|oga|opus)$/i.test(f.getName()); }
// ملف صوت على درايف: لو Ogg نحفظ نسخة WebM ونرجع معرّفها، وإلا نفس المعرّف
function playableAudio_(id) {
  try {
    const f = DriveApp.getFileById(id);
    if (!isOgg_(f)) return id;
    const w = webmBlob_(f.getBlob(), String(f.getName()).replace(/\.[^.]+$/, ''));
    if (w.getContentType() !== 'audio/webm') return id;
    const copy = DriveApp.getFolderById(prop_('FOLDER_audio')).createFile(w);
    share_(copy.getId());
    return copy.getId();
  } catch (e) { console.error(e); return id; }
}
// مرة واحدة: كل تسجيلات المحاضرات وصفحات الأنبياء بصيغة Ogg تتحول WebM (الأصل باقٍ على درايف)
function convertOldAudio_() {
  let n = 0;
  rows_('Lectures').forEach(l => { if (!l.audio_file_id) return; const id = playableAudio_(l.audio_file_id); if (id !== l.audio_file_id) { update_('Lectures', 'lecture_id', l.lecture_id, { audio_file_id: id }); n++; } });
  rows_('ProphetContent').filter(c => c.kind === 'audio' && c.file_id).forEach(c => { const id = playableAudio_(c.file_id); if (id !== c.file_id) { update_('ProphetContent', 'item_id', c.item_id, { file_id: id }); n++; } });
  return n;
}
// نسخة من كل تسجيل محاضرة نوعه مجهول بالنوع الصحيح، وتحديث المحاضرة لتستخدمها (الأصل يبقى كما هو)
function fixAudioTypes_() {
  let fixed = 0;
  rows_('Lectures').forEach(l => {
    if (!l.audio_file_id) return;
    try {
      const f = DriveApp.getFileById(l.audio_file_id);
      if (/^audio\//.test(f.getMimeType())) return;
      const blob = f.getBlob().setContentType('audio/ogg');
      blob.setName(String(f.getName()).replace(/\.(oga|opus|bin)$/i, '') + '.ogg');
      const copy = DriveApp.getFolderById(prop_('FOLDER_audio')).createFile(blob);
      share_(copy.getId());
      update_('Lectures', 'lecture_id', l.lecture_id, { audio_file_id: copy.getId() });
      fixed++;
    } catch (e) { console.error(e); }
  });
  return fixed;
}
function audioOf_(m) { return m.voice || m.audio || (m.document && /audio/.test(m.document.mime_type || '') ? m.document : null); }

function onTelegram_(upd) {
  const m = upd.message; if (!m) return;
  if (m.chat.type && m.chat.type !== 'private') return; // البوت للمحادثات الخاصة فقط
  const chat = m.chat.id;
  // أوامر القائمة (/new@اسم_البوت) = نفس الأزرار
  const raw = (m.text || '').trim().replace(/^(\/\w+)@\w+/, '$1');
  const text = { '/new': BTN.NEW, '/mine': BTN.MINE, '/help': BTN.HELP, '/cancel': BTN.CANCEL, '/journey': BTN.JOURNEY }[raw] || raw;
  const st = getState_(chat);
  try { ensureBotMenu_(); } catch (e) { console.error(e); }

  // /start <رمز من الموقع> يربط مباشرة؛ غير ذلك نبدأ الربط بالأزرار.
  // (كود الفصل لم يعد يربط الحساب: الأطفال يعرفونه، فكان يسمح لأي أحد بربط نفسه كمعلمة)
  if (text.indexOf('/start') === 0) {
    const tok = text.split(/\s+/)[1] || '';
    const cache = CacheService.getScriptCache();
    const uid = /^[a-f0-9]{24}$/.test(tok) ? cache.get('tglink:' + tok) : null;
    const u = uid && rows_('Users').find(x => x.user_id === uid && RANK[x.role] >= RANK.teacher && x.active !== false);
    if (u) { cache.remove('tglink:' + tok); return linkChat_(chat, u); }
    if (teacherByChat_(chat)) { setState_(chat, 'idle', {}); return say_(chat, 'أهلًا وسهلًا بكِ مجددًا 🌷', menuKb_(teacherByChat_(chat))); }
    return startLink_(chat, 'السلام عليكم ورحمة الله وبركاته 🌙\nأهلًا وسهلًا بكِ في بوت منصة «رحلة مع الأنبياء».\nلربط حسابكِ تفضّلي باختيار فصلكِ:');
  }

  const t = teacherByChat_(chat);
  if (!t) return linkFlow_(chat, m, text, st);

  if (text === BTN.CANCEL) return cancel_(chat, t, st);
  if (text === BTN.HELP) return say_(chat, HELP_TEXT, menuKb_(t));
  if (text === '/menu') return say_(chat, 'تفضّلي، الأزرار بالأسفل 👇', st.state === 'idle' ? menuKb_(t) : kb_([[BTN.CANCEL]]));
  if (text === BTN.MINE) return myLectures_(chat, t);
  if (text === BTN.NEW) { cleanup_(st); setState_(chat, 'await_audio', {}); return say_(chat, 'تفضّلي بإرسال تسجيل المحاضرة 🎙\n(رسالة صوتية أو ملف صوتي)', kb_([[BTN.CANCEL]])); }
  if (text === BTN.JOURNEY && RANK[t.role] >= RANK.admin) {
    const list = rows_('Prophets').filter(r => truthy_(r.visible)).sort(bySort_);
    if (!list.length) return say_(chat, 'يُرجى استيراد أقسام الرحلة من الموقع أولًا (رحلة الأنبياء ← استيراد).', menuKb_(t));
    cleanup_(st); setState_(chat, 'pc_prophet', {});
    return say_(chat, 'المحتوى عن أي نبي؟', prophetKb_(list.map(r => ({ prophet_id: r.prophet_id, name: String(r.name) })), false));
  }

  if (st.state === 'pc_content') {
    if (RANK[t.role] < RANK.admin) { setState_(chat, 'idle', {}); return say_(chat, 'محتوى الرحلة للمعلمة الأدمن فقط.', menuKb_(t)); }
    return prophetContent_(chat, t, m, text, st);
  }

  // تسجيل صوتي في أي وقت يبدأ محاضرة جديدة
  const file = audioOf_(m);
  if (file) {
    if (file.file_size && file.file_size > MAX_BOT_DOWNLOAD) {
      return say_(chat, 'عذرًا، حجم التسجيل أكبر من 20 ميجا فلا يستطيع البوت تنزيله 🙏\nيمكنكِ رفعه من صفحة الرفع في الموقع دون حدٍّ للحجم:\n' + siteUrl_() + '/teacher/login/?next=upload', menuKb_(t));
    }
    cleanup_(st);
    const audio = tgDownload_(file.file_id, 'audio', 'lecture_' + Date.now());
    if (!audio) return say_(chat, 'تعذّر تنزيل الملف، تفضّلي بالمحاولة مرة أخرى أو برفعه من صفحة الرفع.', menuKb_(t));
    setState_(chat, 'await_prophet', { lecture_id: id_('L'), audio_file_id: audio, duration: file.duration || '' });
    return say_(chat, 'وصل التسجيل بحمد الله ✔\nعن أي نبي تتحدث المحاضرة؟', prophetKb_(prophetList_(), true));
  }

  const d = st.data || {};
  switch (st.state) {
    case 'await_audio':
      return say_(chat, 'بانتظار تسجيل المحاضرة 🎙', kb_([[BTN.CANCEL]]));
    case 'await_prophet': {
      if (text === BTN.OTHER) { setState_(chat, 'await_title_text', d); return say_(chat, 'تفضّلي بكتابة عنوان المحاضرة ✍️', kb_([[BTN.CANCEL]])); }
      const p = prophetList_().find(x => x.name === text);
      if (!p) return say_(chat, 'تفضّلي باختيار النبي من الأزرار 👇', prophetKb_(prophetList_(), true));
      const title = suggestTitle_(p);
      setState_(chat, 'await_title_ok', Object.assign(d, { prophet_id: p.prophet_id, prophet_name: p.name, title }));
      return say_(chat, 'العنوان المقترح:\n«' + title + '»', kb_([[BTN.USE], [BTN.EDIT], [BTN.CANCEL]]));
    }
    case 'await_title_ok':
      if (text === BTN.USE) return askImages_(chat, d);
      if (text === BTN.EDIT) { setState_(chat, 'await_title_text', d); return say_(chat, 'تفضّلي بكتابة العنوان الذي تريدينه ✍️', kb_([[BTN.CANCEL]])); }
      return say_(chat, 'تفضّلي بالاختيار من الأزرار 👇', kb_([[BTN.USE], [BTN.EDIT], [BTN.CANCEL]]));
    case 'await_title_text':
      if (!text) return say_(chat, 'تفضّلي بكتابة العنوان في رسالة نصية ✍️', kb_([[BTN.CANCEL]]));
      return askImages_(chat, Object.assign(d, { title: text.slice(0, 120) }));
    case 'await_images':
      if (m.photo) {
        const best = m.photo[m.photo.length - 1];
        const fid = tgDownload_(best.file_id, 'images', 'img_' + d.lecture_id + '_' + Date.now());
        if (!fid) return say_(chat, 'تعذّر تنزيل إحدى الصور، تفضّلي بإعادة إرسالها.');
        append_('LectureImages', { image_id: id_('I'), lecture_id: d.lecture_id, sort: m.message_id, file_id: fid });
        setState_(chat, 'await_images', Object.assign(d, { n: (d.n || 0) + 1 }));
        return; // الألبوم يصل صورة صورة؛ لا نرد على كل واحدة
      }
      if (text === BTN.DONE_IMG || text === BTN.NO_IMG) {
        setState_(chat, 'await_confirm', d);
        const mins = Number(d.duration) ? Math.max(1, Math.round(Number(d.duration) / 60)) + ' دقيقة' : '—';
        return say_(chat, '📋 ملخص المحاضرة\nالعنوان: ' + d.title + '\nعن: ' + (d.prophet_name || 'موضوع آخر') + '\nالصور: ' + (d.n || 0) + '\nالمدة: ' + mins,
          kb_([[BTN.SEND], [BTN.CANCEL]]));
      }
      return say_(chat, 'أرسلي الصور، أو اضغطي «' + BTN.DONE_IMG + '» / «' + BTN.NO_IMG + '» 👇', kb_([[BTN.DONE_IMG], [BTN.NO_IMG], [BTN.CANCEL]]));
    case 'await_confirm':
      if (text === BTN.SEND) return submitLecture_(chat, t, d);
      return say_(chat, 'تفضّلي بالضغط على «' + BTN.SEND + '» أو «' + BTN.CANCEL + '» 👇', kb_([[BTN.SEND], [BTN.CANCEL]]));
    case 'pc_prophet': {
      const r = rows_('Prophets').find(x => String(x.name) === text && truthy_(x.visible));
      if (!r) return say_(chat, 'تفضّلي باختيار النبي من الأزرار 👇');
      setState_(chat, 'pc_content', { prophet_id: r.prophet_id, prophet_name: String(r.name), n: 0 });
      return say_(chat, 'تفضّلي بإرسال المحتوى عن سيدنا ' + honored_(r) + ': صوت أو صور أو نص أو رابط يوتيوب.\nيُحفظ كل عنصر «بانتظار الاعتماد»، وعند الانتهاء اضغطي «' + BTN.DONE + '».', kb_([[BTN.DONE], [BTN.CANCEL]]));
    }
  }
  return say_(chat, 'تفضّلي بالاختيار من الأزرار بالأسفل 👇', menuKb_(t));
}

function askImages_(chat, d) {
  setState_(chat, 'await_images', Object.assign(d, { n: d.n || 0 }));
  return say_(chat, 'أحسنتِ ✔ «' + d.title + '»\nأرسلي صور المحاضرة إن وُجدت (يمكن إرسالها ألبومًا)، ثم اضغطي «' + BTN.DONE_IMG + '».\nوإن لم تكن هناك صور فاضغطي «' + BTN.NO_IMG + '».',
    kb_([[BTN.DONE_IMG], [BTN.NO_IMG], [BTN.CANCEL]]));
}

function submitLecture_(chat, t, d) {
  const l = append_('Lectures', { lecture_id: d.lecture_id, class_id: cls_(t, {}), title: d.title, date: now_().slice(0, 10), audio_file_id: d.audio_file_id,
    duration_sec: d.duration, status: 'draft', created_by: t.user_id, created_at: now_(), prophet_id: d.prophet_id || '' });
  setState_(chat, 'idle', {});
  audit_(t, 'bot.createLecture', 'Lectures', l.lecture_id, { title: l.title, images: d.n || 0 });
  // إشعار الأدمن: محاضرة تنتظر المراجعة، مع زر يفتح صفحة المحاضرات
  rows_('Users').filter(u => RANK[u.role] >= RANK.admin && u.active !== false && u.telegram_id && String(u.telegram_id) !== String(chat)).forEach(a => {
    try {
      say_(a.telegram_id, '🆕 محاضرة جديدة بانتظار مراجعتكِ الكريمة\n«' + l.title + '»\nمن: ' + teacherTitle_(t),
        { reply_markup: { inline_keyboard: [[{ text: 'فتح للمراجعة', url: siteUrl_() + '/teacher/lectures/' }]] } });
    } catch (e) { console.error(e); }
  });
  return say_(chat, 'جزاكِ الله خيرًا ✨\nأُرسلت «' + l.title + '» للمراجعة، وهي محفوظة مسودةً حتى تُنشر للأطفال.', menuKb_(t));
}

// إلغاء أي خطوة: صور محاضرة لم تُرسل بعد تُحذف من الجدول
function cleanup_(st) {
  const d = st.data || {};
  if (d.lecture_id && ['await_prophet', 'await_title_ok', 'await_title_text', 'await_images', 'await_confirm'].indexOf(st.state) >= 0
      && !rows_('Lectures').some(l => l.lecture_id === d.lecture_id)) remove_('LectureImages', 'lecture_id', d.lecture_id);
}
function cancel_(chat, t, st) {
  cleanup_(st);
  setState_(chat, 'idle', {});
  return say_(chat, 'تم الإلغاء ✔', menuKb_(t));
}

function myLectures_(chat, t) {
  const list = rows_('Lectures').filter(l => l.created_by === t.user_id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);
  const lines = list.map(l => (l.status === 'published' ? '✅ منشورة' : '📝 مسودة') + ' — ' + l.title);
  return say_(chat, list.length ? 'آخر محاضراتكِ:\n' + lines.join('\n') : 'لا توجد محاضرات بعد. اضغطي «' + BTN.NEW + '» لرفع أول محاضرة 🎙', menuKb_(t));
}

// محتوى صفحة النبي من البوت (للأدمن): كل رسالة عنصر جديد غير معتمد
function prophetContent_(chat, t, m, text, st) {
  const d = st.data || {};
  if (text === BTN.DONE) {
    setState_(chat, 'idle', {});
    return say_(chat, 'حُفظ ' + (d.n || 0) + ' عنصر عن سيدنا ' + honored_({ prophet_id: d.prophet_id, name: d.prophet_name }) + ' ✨\nيمكنكِ اعتمادها من الموقع: رحلة الأنبياء ← المحتوى.', menuKb_(t));
  }
  let item = null;
  const audio = audioOf_(m);
  if (audio) {
    if (audio.file_size && audio.file_size > MAX_BOT_DOWNLOAD) return say_(chat, 'عذرًا، الملف أكبر من 20 ميجا، يمكنكِ رفعه من صفحة المحتوى في الموقع.');
    const fid = tgDownload_(audio.file_id, 'audio', 'prophet_' + d.prophet_id + '_' + Date.now());
    if (fid) item = { kind: 'audio', file_id: fid, body: m.caption || '' };
  } else if (m.photo) {
    const fid = tgDownload_(m.photo[m.photo.length - 1].file_id, 'images', 'prophet_' + d.prophet_id + '_' + Date.now());
    if (fid) item = { kind: 'image', file_id: fid, body: m.caption || '' };
  } else if (text) {
    const link = (text.match(/https?:\/\/\S+/) || [''])[0];
    const yt = link && youtubeId_(link);
    item = yt ? { kind: 'youtube', url: yt, body: text.replace(link, '').trim() } : { kind: 'text', body: text.slice(0, 5000) };
  }
  if (!item) return say_(chat, 'أرسلي صوتًا أو صورة أو نصًّا أو رابط يوتيوب، أو اضغطي «' + BTN.DONE + '».');
  const sort = rows_('ProphetContent').filter(c => c.prophet_id === d.prophet_id).length;
  append_('ProphetContent', Object.assign({ item_id: id_('c'), prophet_id: d.prophet_id, title: '', body: '', file_id: '', url: '', sort, visible: true, approved: false, created_by: t.user_id, created_at: now_() }, item));
  setState_(chat, 'pc_content', Object.assign(d, { n: (d.n || 0) + 1 }));
  return say_(chat, '✔ حُفظ (' + { audio: 'صوت', image: 'صورة', youtube: 'فيديو', text: 'نص' }[item.kind] + ')');
}

/* ===== ربط حساب المعلمة من داخل البوت: الفصل ← اسمها ← رمزها بلوحة أرقام =====
 * الأرقام تُحذف من المحادثة فورًا، ويُطبق منع التخمين نفسه المستخدم في الموقع */
function startLink_(chat, msg) {
  const classes = rows_('Classes');
  setState_(chat, 'link_class', {});
  return say_(chat, msg, kb_(rowsOf_(classes.map(c => String(c.name)), 2)));
}
function linkChat_(chat, u) {
  rows_('Users').filter(x => String(x.telegram_id) === String(chat) && x.user_id !== u.user_id).forEach(x => update_('Users', 'user_id', x.user_id, { telegram_id: '' }));
  update_('Users', 'user_id', u.user_id, { telegram_id: chat });
  setState_(chat, 'idle', {});
  audit_(u, 'bot.link', 'Users', u.user_id);
  return say_(chat, 'أهلًا وسهلًا بكِ ' + teacherTitle_(u) + ' 🌷\nيسعدنا انضمامكِ، وقد رُبط حسابكِ بالبوت بنجاح.\nلرفع محاضرة اضغطي «' + BTN.NEW + '» ثم أرسلي التسجيل.', menuKb_(u));
}
const PIN_PAD = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], [BTN.DEL, '0', BTN.OK]];
function linkFlow_(chat, m, text, st) {
  const d = st.data || {};
  if (st.state === 'link_class') {
    const c = rows_('Classes').find(x => String(x.name) === text);
    if (!c) return startLink_(chat, 'تفضّلي باختيار فصلكِ من الأزرار 👇');
    const staff = rows_('Users').filter(u => u.class_id === c.class_id && RANK[u.role] >= RANK.teacher && u.active !== false);
    if (!staff.length) return startLink_(chat, 'لا توجد معلمات في هذا الفصل. اختاري فصلًا آخر:');
    setState_(chat, 'link_teacher', { class_id: c.class_id });
    return say_(chat, 'تفضّلي باختيار اسمكِ:', kb_(rowsOf_(staff.map(u => String(u.name)), 2)));
  }
  if (st.state === 'link_teacher') {
    const u = rows_('Users').find(x => x.class_id === d.class_id && String(x.name) === text && RANK[x.role] >= RANK.teacher && x.active !== false);
    if (!u) return startLink_(chat, 'اختاري فصلكِ من الأزرار 👇');
    const r = tg_('sendMessage', Object.assign({ chat_id: chat, text: 'تفضّلي بإدخال رمزكِ السري من الأزرار:\n' + dots_('') }, kb_(PIN_PAD)));
    pinCache_(chat, '');
    setState_(chat, 'link_pin', { user_id: u.user_id, mid: r && r.ok ? r.result.message_id : '' });
    return;
  }
  if (st.state === 'link_pin') {
    try { tg_('deleteMessage', { chat_id: chat, message_id: m.message_id }); } catch (e) {} // لا يبقى أي رقم في المحادثة
    const digit = normDigits_(text);
    // الأرقام في الذاكرة المؤقتة (10 دقائق) لا في شيت BotState حتى لا يُحفظ رمز المعلمة نصًا واضحًا
    let pin = pinCache_(chat);
    if (/^\d$/.test(digit) && pin.length < 12) pin += digit;
    else if (text === BTN.DEL) pin = pin.slice(0, -1);
    else if (text === BTN.OK) { pinCache_(chat, ''); return checkLinkPin_(chat, d, pin); }
    else { pinCache_(chat, ''); return startLink_(chat, 'اختاري فصلكِ من الأزرار 👇'); }
    pinCache_(chat, pin);
    if (d.mid) tg_('editMessageText', { chat_id: chat, message_id: d.mid, text: 'تفضّلي بإدخال رمزكِ السري من الأزرار:\n' + dots_(pin) });
    return;
  }
  return startLink_(chat, 'هذا البوت مخصص للمعلمات 🌙\nلربط حسابكِ تفضّلي باختيار فصلكِ:');
}
function pinCache_(chat, v) {
  const c = CacheService.getScriptCache(), k = 'tgpin:' + chat;
  if (v === undefined) return String(c.get(k) || '');
  if (v) c.put(k, v, 600); else c.remove(k);
  return v;
}
function dots_(pin) { return pin ? '●'.repeat(pin.length) : '○○○○○○'; }
function checkLinkPin_(chat, d, pin) {
  const u = rows_('Users').find(x => x.user_id === d.user_id);
  if (!u) return startLink_(chat, 'اختاري فصلكِ من الأزرار 👇');
  const key = 'login:' + staffName_(u.name);
  let a;
  try { a = checkLock_(key); } catch (e) { setState_(chat, 'link_class', {}); return say_(chat, String(e.message || e), kb_(rowsOf_(rows_('Classes').map(c => String(c.name)), 2))); }
  if (u.active === false || u.pin_hash !== hashPin_(pin)) {
    const lockMin = failAttempt_(key, a);
    setState_(chat, 'link_pin', { user_id: d.user_id, mid: d.mid });
    if (d.mid) tg_('editMessageText', { chat_id: chat, message_id: d.mid, text: 'تفضّلي بإدخال رمزكِ السري من الأزرار:\n' + dots_('') });
    return say_(chat, lockMin ? 'الرمز غير صحيح. محاولات كثيرة، تفضّلي بالانتظار ' + lockMin + ' دقيقة' : 'الرمز غير صحيح، تفضّلي بالمحاولة مرة أخرى');
  }
  clearAttempts_(key, a);
  return linkChat_(chat, u);
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

/**
 * حساب المطوّر (م.احمد، superadmin). الرمز لا يُكتب في الكود أبدًا:
 * 1) Project Settings ← Script Properties ← أضف NEW_SUPER_PIN = رمزك (6 أرقام على الأقل)
 * 2) شغّل هذه الدالة من المحرر. تنشئ الحساب (أو تغيّر رمزه لو موجود) ثم تحذف NEW_SUPER_PIN تلقائيًا.
 */
function createSuperAdmin() {
  const pin = normDigits_(prop_('NEW_SUPER_PIN'));
  if (!/^\d{6,}$/.test(pin)) throw new Error('ضع NEW_SUPER_PIN في Script Properties (6 أرقام على الأقل) ثم شغّلها مرة أخرى');
  const NAME = 'احمد';
  ensureSheet_('Users'); ensureSheet_('AuditLog');
  const existing = rows_('Users').find(u => u.role === 'superadmin');
  let user_id;
  if (existing) {
    user_id = existing.user_id;
    update_('Users', 'user_id', user_id, { pin_hash: hashPin_(pin), active: true });
  } else {
    if (rows_('Users').some(u => u.role !== 'student' && staffName_(u.name) === staffName_(NAME))) throw new Error('يوجد حساب آخر بنفس الاسم');
    user_id = id_('U');
    append_('Users', { user_id, role: 'superadmin', name: NAME, class_id: '', avatar: '', pin_hash: hashPin_(pin), active: true, created_at: now_() });
  }
  props_().deleteProperty('NEW_SUPER_PIN');
  audit_({ user_id, role: 'superadmin' }, existing ? 'superadmin.resetPin' : 'superadmin.create', 'Users', user_id);
  Logger.log((existing ? 'تم تغيير رمز حساب ' : 'تم إنشاء حساب ') + NAME + ' ✔ — ادخل من صفحة دخول المعلمة بالاسم والرمز');
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

/* ============ المرحلة 6: جدول الصلوات والإشعارات ============ */
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
// اليوم بصيغة رقمية yyyymmdd (الشيت يحوّل نص التاريخ لكائن Date، فنخزّنه رقمًا)
function dayNum_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) throw new Error('تاريخ غير صحيح');
  return Number(m[1] + m[2] + m[3]);
}
function dayOffset_(n) { const d = new Date(Date.now() + n * 864e5); return Number(d.toISOString().slice(0, 10).replace(/-/g, '')); }

// خوادم الإشعارات المعروفة فقط (حتى لا يُستغل الخادم لإرسال طلبات لأي عنوان)
const PUSH_HOSTS = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;
const PUSH_KINDS = /^((p|pre):(fajr|dhuhr|asr|maghrib|isha)|dhikr|duha|fri)$/;
const PUSH_PRAYER = /^(p|pre):/;
const PUSH_MAX_PLAN = 400;

Object.assign(POLICY, {
  prayerLog: { min: 'student' }, markPrayer: { min: 'student', write: 1 },
  pushConfig: { min: 'student' }, pushSubscribe: { min: 'student', write: 1 }, pushUnsubscribe: { min: 'student', write: 1 },
  pullNotices: { min: null }
});

Object.assign(ACTIONS, {
  // سجل صلوات الطفل في مدى أيام (حتى ٦٣ يومًا): { days: { 'yyyy-mm-dd': ['fajr', ...] } }
  prayerLog: (p, me) => {
    const from = dayNum_(p.from), to = dayNum_(p.to);
    const utc = (n) => Date.UTC(Math.floor(n / 1e4), Math.floor(n / 100) % 100 - 1, n % 100);
    if (to < from || (utc(to) - utc(from)) / 864e5 > 63) throw new Error('المدى كبير');
    const days = {};
    rows_('PrayerLog').forEach(r => {
      const d = Number(r.day);
      if (r.user_id !== me.user_id || d < from || d > to) return;
      const s = String(d);
      days[s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8)] = String(r.prayers || '').split(',').filter(x => PRAYERS.indexOf(x) >= 0);
    });
    return { days };
  },

  // الطفل أو المعلمة تعلّم أنها صلّت (أو يلغي): اليوم أو ما قبله حتى ٣٥ يومًا، ولا يوم في المستقبل (يوم سماح لفرق التوقيت)
  markPrayer: (p, me) => {
    const day = dayNum_(p.date), prayer = String(p.prayer || '');
    if (PRAYERS.indexOf(prayer) < 0) throw new Error('صلاة غير معروفة');
    if (day > dayOffset_(1) || day < dayOffset_(-35)) throw new Error('لا يمكن تعديل هذا اليوم');
    rate_('prayer:' + me.user_id, 120, 600);
    const done = p.done === true || p.done === 'true';
    return withLock_(() => {
      const key = me.user_id + ':' + day;
      const row = rows_('PrayerLog').find(r => r.key === key);
      const set = row ? String(row.prayers || '').split(',').filter(x => PRAYERS.indexOf(x) >= 0) : [];
      const i = set.indexOf(prayer);
      if (done && i < 0) set.push(prayer);
      if (!done && i >= 0) set.splice(i, 1);
      const prayers = PRAYERS.filter(x => set.indexOf(x) >= 0).join(',');
      if (row) update_('PrayerLog', 'key', key, { prayers, updated_at: now_() });
      else append_('PrayerLog', { key, user_id: me.user_id, day, prayers, updated_at: now_() });
      return prayers ? prayers.split(',') : [];
    });
  },

  pushConfig: () => ({ publicKey: vapid_().pub }),

  // تسجيل جهاز للإشعارات مع جدول مواعيده (يحسبه التطبيق من مواقيت الصلاة وتفضيلات الطفل)
  pushSubscribe: (p, me) => {
    const endpoint = String(p.endpoint || '');
    if (endpoint.length > 1000 || !PUSH_HOSTS.test(endpoint)) throw new Error('خدمة إشعارات غير مدعومة');
    rate_('psub:' + me.user_id, 30, 3600);
    const plan = cleanPlan_(p.plan), prefs = cleanPrefs_(p.prefs);
    if (me.role !== 'student') prefs.tasks = false; // إشعارات المهام للأطفال فقط
    return withLock_(() => {
      const old = rows_('PushSubs').find(s => s.endpoint === endpoint);
      if (old) {
        if (old.user_id !== me.user_id) remove_('PushSubs', 'sub_id', old.sub_id); // نفس الجهاز لطفل آخر: يبدأ من جديد
        else { update_('PushSubs', 'sub_id', old.sub_id, { plan: JSON.stringify(plan), prefs: JSON.stringify(prefs), last_seen: now_(), fails: 0 }); pushWake_(plan); return { key: old.pull_key }; }
      }
      // حد للأجهزة لكل طفل (يُحذف الأقدم)
      const mine = rows_('PushSubs').filter(s => s.user_id === me.user_id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      while (mine.length >= 5) remove_('PushSubs', 'sub_id', mine.shift().sub_id);
      const key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
      append_('PushSubs', { sub_id: id_('PS'), user_id: me.user_id, class_id: me.class_id || '', endpoint, pull_key: key,
        plan: JSON.stringify(plan), prefs: JSON.stringify(prefs), created_at: now_(), last_seen: now_(), fails: 0 });
      pushWake_(plan);
      return { key };
    });
  },

  pushUnsubscribe: (p, me) => withLock_(() => {
    const s = rows_('PushSubs').find(x => x.endpoint === String(p.endpoint || '') && x.user_id === me.user_id);
    if (s) remove_('PushSubs', 'sub_id', s.sub_id);
    return true;
  }),

  // عامل الخدمة يسحب نص الإشعار بمفتاح خاص بالجهاز فقط (لا يحمل رمز دخول الطفل)
  pullNotices: (p) => {
    const key = String(p.key || '');
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('مفتاح غير صالح');
    rate_('pull:' + key.slice(0, 12), 60, 3600);
    const s = rows_('PushSubs').find(x => x.pull_key === key);
    if (!s) throw new Error('الجهاز غير مسجّل');
    const cache = CacheService.getScriptCache(), ck = 'pq:' + s.sub_id;
    const items = JSON.parse(cache.get(ck) || '[]');
    cache.remove(ck);
    return { items };
  }
});

function cleanPlan_(plan) {
  if (!Array.isArray(plan)) return [];
  const now = Math.floor(Date.now() / 1000), out = [];
  plan.slice(0, PUSH_MAX_PLAN * 2).forEach(e => {
    if (!Array.isArray(e)) return;
    const ts = Math.floor(Number(e[0])), kind = String(e[1] || ''), idx = Math.max(0, Math.min(99, Math.floor(Number(e[2]) || 0)));
    if (!isFinite(ts) || ts < now - 86400 || ts > now + 16 * 86400 || !PUSH_KINDS.test(kind)) return;
    out.push([ts, kind, idx]);
  });
  out.sort((a, b) => a[0] - b[0]);
  // تنبيهات الصلاة: واحد لكل نوع كل ١٢ ساعة، و«قبل الصلاة» لازم يسبق أذانها بـ٨–١٢ دقيقة
  const prayers = [], lastKind = {};
  out.forEach(e => {
    if (!PUSH_PRAYER.test(e[1]) || e[0] - (lastKind[e[1]] || -Infinity) < 12 * 3600) return;
    if (/^pre:/.test(e[1]) && !out.some(x => x[1] === 'p:' + e[1].slice(4) && x[0] - e[0] >= 480 && x[0] - e[0] <= 720)) return;
    lastKind[e[1]] = e[0]; prayers.push(e);
  });
  // باقي التذكيرات: بينها ١٠ دقائق، وبعيدة عن أي تنبيه صلاة بـ٥ دقائق، وحد يومي
  const kept = prayers.slice(), perDay = {};
  let last = -Infinity;
  out.forEach(e => {
    if (PUSH_PRAYER.test(e[1])) return;
    const day = Math.floor(e[0] / 86400);
    if (e[0] - last < 600 || (perDay[day] || 0) >= 8 || prayers.some(x => Math.abs(x[0] - e[0]) < 300)) return;
    last = e[0]; perDay[day] = (perDay[day] || 0) + 1; kept.push(e);
  });
  kept.sort((a, b) => a[0] - b[0]);
  return kept.slice(0, PUSH_MAX_PLAN);
}
function cleanPrefs_(v) { const o = v && typeof v === 'object' ? v : {}; return { tasks: o.tasks !== false && o.tasks !== 'false' }; }

// يضيف رسالة لطابور الجهاز (يسحبها عامل الخدمة عند وصول الإشعار)
function queuePush_(sub_id, item) {
  const cache = CacheService.getScriptCache(), ck = 'pq:' + sub_id;
  const items = JSON.parse(cache.get(ck) || '[]');
  items.push(item);
  cache.put(ck, JSON.stringify(items.slice(-10)), 6 * 3600);
}

// اختبار أو واجب جديد: إشعار لأطفال الفصل الذين فعّلوا إشعارات المهام (يُرسل في الدورة التالية)
function notifyClassTask_(class_id, kind, title) {
  try {
    const cache = CacheService.getScriptCache(), rk = 'ntf:' + class_id, n = Number(cache.get(rk) || 0) + 1;
    cache.put(rk, String(n), 3600);
    if (n > 10) return;
    const users = {}; rows_('Users').forEach(u => { users[u.user_id] = u; });
    const subs = rows_('PushSubs').filter(s => { const u = users[s.user_id]; return u && !inactive_(u) && u.role === 'student' && String(u.class_id) === String(class_id) && JSON.parse(s.prefs || '{}').tasks !== false; });
    const due = JSON.parse(cache.get('push:due') || '[]');
    subs.forEach(s => {
      queuePush_(s.sub_id, kind === 'quiz' ? { kind: 'quiz', title: 'اختبار جديد ✨', body: String(title).slice(0, 80), url: '/kid/tasks/' }
        : { kind: 'hw', title: 'واجب جديد 📝', body: String(title).slice(0, 80), url: '/kid/tasks/' });
      if (due.indexOf(s.sub_id) < 0) due.push(s.sub_id);
    });
    cache.put('push:due', JSON.stringify(due.slice(-500)), 6 * 3600);
  } catch (e) { console.error(e); }
}

// أقرب موعد قادم في جدول جهاز: المشغّل يصحى له بدل ما يقرأ الجداول كل دقيقة
function pushWake_(plan) {
  // أي موعد لم يُرسل بعد (حتى لو فات قبل ثوانٍ من الاشتراك) يصحّي المشغّل
  const after = Number(prop_('PUSH_LAST') || 0), nx = (plan || []).find(e => e[0] > after);
  if (!nx) return;
  const cur = Number(prop_('PUSH_NEXT') || 0);
  if (!cur || nx[0] < cur) props_().setProperty('PUSH_NEXT', String(nx[0]));
}

/** مشغّل كل دقيقة: يرسل الإشعارات التي حان وقتها (أذان الصلاة يوصل في دقيقته تقريبًا).
 * أغلب الدقائق مفيش حاجة: يخرج فورًا من غير ما يقرأ الجداول (توفيرًا لحصة جوجل المجانية). */
function pushTick() {
  const now = Math.floor(Date.now() / 1000);
  const cache0 = CacheService.getScriptCache();
  const next = Number(prop_('PUSH_NEXT') || 0);
  const pushDue = !next || now >= next || !!cache0.get('push:due');
  if (!pushDue && !prop_('LIVE_ON')) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    try { autoEndLive_(); } catch (e) { console.error(e); }
    if (!pushDue) return; // صحيان للمحاضرة فقط
    props_().setProperty('PUSH_NEXT', String(now + 300)); // لو الدورة فشلت: نعيد بعد ٥ دقائق مش كل دقيقة
    const last = Number(prop_('PUSH_LAST') || now - 300);
    props_().setProperty('PUSH_LAST', String(now));
    const cache = CacheService.getScriptCache();
    const due = JSON.parse(cache.get('push:due') || '[]'); cache.remove('push:due');
    const send = [], users = {};
    let soonest = now + 6 * 3600; // لو مفيش مواعيد: نصحى كل ٦ ساعات للاطمئنان
    rows_('Users').forEach(u => { users[u.user_id] = u; });
    rows_('PushSubs').forEach(s => {
      if (inactive_(users[s.user_id]) || Number(s.fails || 0) >= 5) { remove_('PushSubs', 'sub_id', s.sub_id); return; }
      let plan = [];
      try { plan = JSON.parse(s.plan || '[]'); } catch (e) {}
      const nx = plan.find(e => e[0] > now);
      if (nx && nx[0] < soonest) soonest = nx[0];
      // لا نرسل إلا آخر موعد فات منذ الدورة السابقة (حتى لا تتراكم الإشعارات لو توقف المشغّل)
      const hits = plan.filter(e => e[0] > Math.max(last, now - 1800) && e[0] <= now);
      if (hits.length) queuePush_(s.sub_id, { kind: hits[hits.length - 1][1], idx: hits[hits.length - 1][2] });
      if (hits.length || due.indexOf(s.sub_id) >= 0) send.push(s);
    });
    props_().setProperty('PUSH_NEXT', String(soonest));
    if (!send.length) return;
    const reqs = send.map(s => pushRequest_(s.endpoint));
    const res = UrlFetchApp.fetchAll(reqs);
    res.forEach((r, i) => {
      const code = r.getResponseCode();
      if (code === 404 || code === 410) remove_('PushSubs', 'sub_id', send[i].sub_id); // الجهاز ألغى الاشتراك
      else if (code >= 400) update_('PushSubs', 'sub_id', send[i].sub_id, { fails: Number(send[i].fails || 0) + 1 });
    });
  } finally { lock.releaseLock(); }
}

function installPushTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'pushTick').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('pushTick').timeBased().everyMinutes(1).create();
}

// إشعار بلا محتوى (لا يحتاج تشفيرًا): عامل الخدمة يسحب النص بمفتاح الجهاز
function pushRequest_(endpoint) {
  const aud = endpoint.match(/^https:\/\/[^/]+/)[0];
  return { url: endpoint, method: 'post', muteHttpExceptions: true, payload: '',
    headers: { Authorization: 'vapid t=' + vapidJwt_(aud) + ', k=' + vapid_().pub, TTL: '3600', Urgency: 'high' } };
}

/* ===== VAPID (ES256 على منحنى P-256) بدون مكتبات: Apps Script لا يوفر توقيع ECDSA =====
 * المفتاح الخاص يُولَّد هنا ويُحفظ في Script Properties فقط، ولا يخرج من الخادم. */
// محلل Apps Script يرفض صيغة 0n، فنعرّف ثوابت BigInt بالدالة
const B0_ = BigInt(0), B1_ = BigInt(1), B2_ = BigInt(2), B3_ = BigInt(3), B4_ = BigInt(4), B8_ = BigInt(8);
const P256 = {
  p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
  n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
  G: [BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'), BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5')]
};
function ecMod_(a, m) { const r = a % m; return r < B0_ ? r + m : r; }
function ecInv_(a, m) { // معكوس ضربي بخوارزمية إقليدس الموسّعة
  let [r0, r1, s0, s1] = [ecMod_(a, m), m, B1_, B0_];
  while (r1 !== B0_) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return ecMod_(s0, m);
}
// إحداثيات جاكوبي: بلا معكوس في كل خطوة (أسرع بكثير في Apps Script)
function ecDbl_(P) {
  const p = P256.p; if (!P || P[1] === B0_) return null;
  const [X, Y, Z] = P, YY = Y * Y % p, S = B4_ * X * YY % p, ZZ = Z * Z % p;
  const M = ecMod_(B3_ * (X - ZZ) * (X + ZZ), p); // a = -3
  const X3 = ecMod_(M * M - B2_ * S, p);
  return [X3, ecMod_(M * (S - X3) - B8_ * YY * YY, p), B2_ * Y * Z % p];
}
function ecAdd_(P, Q) {
  const p = P256.p; if (!P) return Q; if (!Q) return P;
  const Z1Z1 = P[2] * P[2] % p, Z2Z2 = Q[2] * Q[2] % p;
  const U1 = P[0] * Z2Z2 % p, U2 = Q[0] * Z1Z1 % p, S1 = P[1] * Q[2] % p * Z2Z2 % p, S2 = Q[1] * P[2] % p * Z1Z1 % p;
  if (U1 === U2) return S1 === S2 ? ecDbl_(P) : null;
  const H = ecMod_(U2 - U1, p), R = ecMod_(S2 - S1, p), HH = H * H % p, HHH = H * HH % p, V = U1 * HH % p;
  const X3 = ecMod_(R * R - HHH - B2_ * V, p);
  return [X3, ecMod_(R * (V - X3) - S1 * HHH, p), P[2] * Q[2] % p * H % p];
}
function ecMul_(k, A) {
  let R = null, Q = [A[0], A[1], B1_];
  while (k > B0_) { if (k & B1_) R = ecAdd_(R, Q); Q = ecDbl_(Q); k >>= B1_; }
  if (!R) throw new Error('ec');
  const zi = ecInv_(R[2], P256.p), zi2 = zi * zi % P256.p;
  return [R[0] * zi2 % P256.p, R[1] * zi2 % P256.p * zi % P256.p];
}
function bytesToBig_(b) { let h = '0x'; b.forEach(x => { h += ((x & 255) + 256).toString(16).slice(1); }); return BigInt(h === '0x' ? '0' : h); }
function bigToBytes_(v, len) { let h = v.toString(16); while (h.length < len * 2) h = '0' + h; const out = []; for (let i = 0; i < len * 2; i += 2) out.push(parseInt(h.substr(i, 2), 16)); return out; }
function signedBytes_(a) { return a.map(x => (x > 127 ? x - 256 : x)); }

function vapid_() {
  if (!prop_('VAPID_D') || !prop_('VAPID_PUB')) withLock_(() => { if (!prop_('VAPID_D') || !prop_('VAPID_PUB')) genVapid_(); });
  return { d: BigInt('0x' + prop_('VAPID_D')), pub: prop_('VAPID_PUB') };
}
// يُستدعى والقفل محجوز (من migrate_ أو vapid_)
function genVapid_() {
  let d, pub;
  {
    const seed = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid() + Date.now());
    const k = ecMod_(bytesToBig_(seed), P256.n - B1_) + B1_;
    const Q = ecMul_(k, P256.G);
    d = k.toString(16);
    pub = Utilities.base64EncodeWebSafe(signedBytes_([4].concat(bigToBytes_(Q[0], 32), bigToBytes_(Q[1], 32)))).replace(/=+$/, '');
    props_().setProperties({ VAPID_D: d, VAPID_PUB: pub }); // كتابة واحدة: المفتاحان معًا دائمًا
  }
}

function es256_(msg) {
  const { d } = vapid_(), n = P256.n;
  const h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, msg);
  const e = bytesToBig_(h);
  const dKey = signedBytes_(bigToBytes_(d, 32));
  for (let ctr = 0; ctr < 100; ctr++) {
    // nonce حتمي: HMAC بالمفتاح الخاص على بصمة الرسالة (لا يحتاج مولّد أرقام عشوائية آمن)
    const k = bytesToBig_(Utilities.computeHmacSha256Signature(signedBytes_(h.map(x => x & 255).concat([ctr])), dKey));
    if (k === B0_ || k >= n) continue;
    const r = ecMod_(ecMul_(k, P256.G)[0], n);
    if (r === B0_) continue;
    const s = ecMod_(ecInv_(k, n) * ecMod_(e + r * d, n), n);
    if (s === B0_) continue;
    return Utilities.base64EncodeWebSafe(signedBytes_(bigToBytes_(r, 32).concat(bigToBytes_(s, 32)))).replace(/=+$/, '');
  }
  throw new Error('sign');
}

function vapidJwt_(aud) {
  const cache = CacheService.getScriptCache(), ck = 'vjwt:' + aud;
  const hit = cache.get(ck); if (hit) return hit;
  const b64 = (o) => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const body = b64({ typ: 'JWT', alg: 'ES256' }) + '.' + b64({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://mrvoroo.github.io/Serah/' });
  const jwt = body + '.' + es256_(body);
  cache.put(ck, jwt, 6 * 3600);
  return jwt;
}


/* ============ المرحلة 9: المحاضرات المباشرة (سيرفر Jitsi خاص بالمنصة) ============
 * الأدمن تحدد مواعيد أسبوعية، والمعلمة تضغط «ابدئي المحاضرة» فتُنشأ غرفة عشوائية ويصل للأطفال إشعار فوري.
 * الدخول بتوكن JWT يوقّعه الخادم (JITSI_SECRET في Script Properties) فلا يدخل الغرفة إلا أطفال الفصل ومعلماته.
 * الحضور: صفحة الطفل ترسل نبضة كل دقيقة أثناء وجوده في المحاضرة، ويُحسب «حاضر/حضر جزءًا» عند الإنهاء.
 * التسجيل: صوت المعلمة من متصفحها يُرفع لدرايف أثناء المحاضرة، ويصبح محاضرة «مسودة» تعتمدها الأدمن. */
const LIVE_PRESENT_PTS = 15, LIVE_PARTIAL_PTS = 5, LIVE_MAX_SEC = 4 * 3600;

Object.assign(POLICY, {
  liveState: { min: 'student' }, liveJoin: { min: 'student' }, liveBeat: { min: 'student', write: 1 },
  liveStart: { min: 'teacher', write: 1, audit: 1 }, liveEnd: { min: 'teacher', write: 1, audit: 1 }, liveAttach: { min: 'teacher', write: 1, audit: 1 },
  liveAttendance: { min: 'teacher' }, liveSetAttend: { min: 'teacher', write: 1, audit: 1 },
  liveSlotSave: { min: 'admin', write: 1, audit: 1 }, liveSlotDelete: { min: 'admin', write: 1, audit: 1 }
});

function liveCfg_() { const d = String(prop_('JITSI_DOMAIN') || '').trim().toLowerCase(); return /^[a-z0-9.-]{3,100}$/.test(d) ? d : ''; }
function liveNow_(class_id) { return rows_('LiveSessions').find(s => s.class_id === class_id && s.status === 'live') || null; }
function liveOut_(s, users) {
  const u = users && users[s.started_by];
  return { live_id: s.live_id, title: s.title, status: s.status, started_at: s.started_at, ended_at: s.ended_at || '', lecture_id: s.lecture_id || '', teacher: u ? teacherTitle_(u) : '' };
}
function slotOut_(s) { return { slot_id: s.slot_id, title: s.title, week_min: Number(s.week_min), minutes: Number(s.minutes) || 60, tz: s.tz || 'Asia/Riyadh' }; }
function cleanTz_(v) { const t = String(v || ''); return /^[A-Za-z]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(t) && t.length <= 40 ? t : 'Asia/Riyadh'; }
function ownLive_(me, p) {
  const s = rows_('LiveSessions').find(x => x.live_id === String(p.live_id || '') && (me.role === 'superadmin' || x.class_id === me.class_id));
  if (!s) throw new Error('المحاضرة غير موجودة');
  return s;
}
// توكن دخول الغرفة (HS256) بالصيغة التي يقرؤها Jitsi (prosody token auth)
function jitsiJwt_(room, me) {
  const secret = prop_('JITSI_SECRET');
  if (!secret || String(secret).length < 32 || !liveCfg_()) throw new Error('سيرفر المحاضرات لم يُجهَّز بعد');
  const now = Math.floor(Date.now() / 1000), mod = me.role !== 'student', u = rows_('Users').find(x => x.user_id === me.user_id) || { name: '', role: me.role };
  const b64 = (o) => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const body = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({
    aud: 'jitsi', iss: prop_('JITSI_APP') || 'muntaha', sub: liveCfg_(), room, nbf: now - 60, exp: now + (mod ? LIVE_MAX_SEC : 1800), // الطفل: توكن ٣٠ دقيقة (يُفحص عند الدخول فقط) حتى لا يُستعمل بعد انتهاء المحاضرة
   
    moderator: mod, context: { user: { id: me.user_id, name: mod ? teacherTitle_(u) : String(u.name || ''), moderator: mod, affiliation: mod ? 'owner' : 'member' } }
  });
  return body + '.' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, secret)).replace(/=+$/, '');
}
// إشعار فوري (بدون انتظار مشغّل الخمس دقائق) لأطفال الفصل
function pushClassNow_(class_id, item) {
  try {
    const users = {}; rows_('Users').forEach(u => { users[u.user_id] = u; });
    const subs = rows_('PushSubs').filter(s => { const u = users[s.user_id]; return u && !inactive_(u) && u.role === 'student' && String(u.class_id) === String(class_id); });
    if (!subs.length) return;
    subs.forEach(s => queuePush_(s.sub_id, item));
    UrlFetchApp.fetchAll(subs.map(s => pushRequest_(s.endpoint)));
  } catch (e) { console.error(e); }
}
// ينهي الجلسة ويحسب الحضور والنجوم (يُستدعى والقفل محجوز)
function closeLive_(s, at) {
  const end = at || new Date(), len = Math.max(60, (end - new Date(s.started_at)) / 1000);
  update_('LiveSessions', 'live_id', s.live_id, { status: 'ended', ended_at: end.toISOString() });
  rows_('LiveAttend').filter(a => a.live_id === s.live_id && !truthy_(a.override)).forEach(a => {
    const sec = Number(a.seconds) || 0, st = sec >= len * 0.5 ? 'present' : sec >= 60 ? 'partial' : 'absent';
    // محاضرة أقل من ١٠ دقائق (بدء خاطئ أو تجربة): الحضور يتسجل بدون نجوم
    const pts = len < 600 ? 0 : st === 'present' ? LIVE_PRESENT_PTS : st === 'partial' ? LIVE_PARTIAL_PTS : 0;
    update_('LiveAttend', 'key', a.key, { status: st, points: pts });
    if (pts) addPoints_(a.user_id, pts, 'حضور محاضرة مباشرة');
  });
}
// تسجيل المعلمة يصبح محاضرة «مسودة» تراجعها الأدمن وتنشرها
function liveLecture_(s0, me, fileId, dur) {
  const f = platformFile_(fileId);
  return withLock_(() => {
  const s = rows_('LiveSessions').find(x => x.live_id === s0.live_id);
  if (s.lecture_id) return s.lecture_id; // ضغطتان متزامنتان لا تنشئان مسودتين
  const l = append_('Lectures', { lecture_id: id_('L'), class_id: s.class_id, title: String(s.title).slice(0, 120), date: String(s.started_at).slice(0, 10),
    audio_file_id: playableAudio_(f), duration_sec: Math.max(0, Math.min(LIVE_MAX_SEC, Math.floor(Number(dur) || 0))) || '',
    status: 'draft', notes: 'تسجيل محاضرة مباشرة', created_by: me.user_id, created_at: now_() });
  share_(l.audio_file_id);
  update_('LiveSessions', 'live_id', s.live_id, { lecture_id: l.lecture_id });
  return l.lecture_id;
  });
}

Object.assign(ACTIONS, {
  // حالة المحاضرات للفصل: الجارية الآن والمواعيد الأسبوعية، وللمعلمات آخر المحاضرات
  liveState: (p, me) => {
    const c = cls_(me, p), users = {}; rows_('Users').forEach(u => { users[u.user_id] = u; });
    const live = liveNow_(c);
    const out = { ready: !!(liveCfg_() && prop_('JITSI_SECRET')), domain: liveCfg_(), live: live ? liveOut_(live, users) : null,
      slots: rows_('LiveSlots').filter(s => s.class_id === c).map(slotOut_).sort((a, b) => a.week_min - b.week_min) };
    if (RANK[me.role] >= RANK.teacher) {
      const att = rows_('LiveAttend');
      out.recent = rows_('LiveSessions').filter(s => s.class_id === c && s.status === 'ended').sort((a, b) => String(b.started_at).localeCompare(String(a.started_at))).slice(0, 20)
        .map(s => Object.assign(liveOut_(s, users), { present: att.filter(a => a.live_id === s.live_id && a.status === 'present').length, partial: att.filter(a => a.live_id === s.live_id && a.status === 'partial').length }));
    } else if (live) {
      const a = att_(live.live_id, me.user_id); out.mine = a ? Number(a.seconds) || 0 : 0;
    }
    return out;
  },

  // المعلمة تبدأ المحاضرة (لو فيه محاضرة جارية في الفصل ترجعها بدل إنشاء غرفة ثانية)
  liveStart: (p, me) => {
    if (!liveCfg_() || !prop_('JITSI_SECRET')) throw new Error('سيرفر المحاضرات لم يُجهَّز بعد');
    const c = cls_(me, p);
    if (!rows_('Classes').some(x => x.class_id === c)) throw new Error('الفصل غير موجود');
    const res = withLock_(() => {
      const cur = liveNow_(c);
      if (!cur) rate_('ls:' + c, 6, 3600); // ٦ محاضرات في الساعة كحد (كل بدء يرسل إشعارًا لكل الفصل)
      if (cur) return { s: cur, fresh: false };
      const title = String(p.title || '').trim().slice(0, 120) || 'محاضرة مباشرة';
      const room = 'muntaha' + Utilities.getUuid().replace(/-/g, '').slice(0, 20);
      props_().setProperty('LIVE_ON', '1');
      return { s: append_('LiveSessions', { live_id: id_('V'), class_id: c, title, room, status: 'live', started_at: now_(), ended_at: '', started_by: me.user_id, lecture_id: '', teacher_seen: now_() }), fresh: true };
    });
    if (res.fresh) pushClassNow_(c, { kind: 'live', title: 'المحاضرة بدأت الآن 🎙️', body: res.s.title + ' — اضغط للدخول', url: '/kid/live/' });
    return { live_id: res.s.live_id, domain: liveCfg_(), room: res.s.room, jwt: jitsiJwt_(res.s.room, me), title: res.s.title, fresh: res.fresh, started_at: res.s.started_at, mine: res.s.started_by === me.user_id };
  },

  // دخول الغرفة: أطفال الفصل ومعلماته فقط، وأثناء المحاضرة فقط
  liveJoin: (p, me) => {
    const s = ownLive_(me, p);
    if (s.status !== 'live') throw new Error('المحاضرة انتهت');
    if (me.role === 'student') {
      rate_('lj:' + me.user_id, 30, 3600);
      if (!att_(s.live_id, me.user_id)) withLock_(() => { if (!att_(s.live_id, me.user_id)) append_('LiveAttend', { key: s.live_id + ':' + me.user_id, live_id: s.live_id, user_id: me.user_id, first_at: now_(), last_at: now_(), seconds: 0, status: '', points: 0, override: '' }); });
    }
    return { live_id: s.live_id, domain: liveCfg_(), room: s.room, jwt: jitsiJwt_(s.room, me), title: s.title, started_at: s.started_at, mine: s.started_by === me.user_id };
  },

  // نبضة حضور كل دقيقة تقريبًا: تضيف الوقت الفعلي منذ النبضة السابقة (بحد ٩٠ ثانية حتى لا يُحسب الانقطاع)
  liveBeat: (p, me) => {
    const s = ownLive_(me, p);
    if (me.role !== 'student') {
      if (s.status === 'live') update_('LiveSessions', 'live_id', s.live_id, { teacher_seen: now_() });
      return s.status === 'live' ? { seconds: 0 } : { ended: true };
    }
    if (s.status !== 'live') return { ended: true };
    rate_('lb:' + me.user_id, 90, 3600);
    const key = s.live_id + ':' + me.user_id, a0 = att_(s.live_id, me.user_id);
    if (!a0) throw new Error('ادخل المحاضرة أولًا'); // الحضور لمن دخل الغرفة عبر liveJoin فقط
    if ((Date.now() - new Date(a0.last_at).getTime()) / 1000 < 40) return { seconds: Number(a0.seconds) || 0 }; // بدون قفل
    return withLock_(() => {
      const a = att_(s.live_id, me.user_id), gap = (Date.now() - new Date(a.last_at).getTime()) / 1000;
      if (gap < 40) return { seconds: Number(a.seconds) || 0 };
      const sec = Math.min(LIVE_MAX_SEC, (Number(a.seconds) || 0) + Math.round(Math.min(gap, 90)));
      update_('LiveAttend', 'key', key, { last_at: now_(), seconds: sec });
      return { seconds: sec };
    });
  },

  // إنهاء المحاضرة (أي معلمة في الفصل) مع ربط التسجيل إن وُجد
  liveEnd: (p, me) => {
    const s = ownLive_(me, p);
    const out = withLock_(() => {
      const cur = ownLive_(me, p);
      if (cur.status === 'live') closeLive_(cur);
      return { ended: true };
    });
    if (p.audio_file_id && !s.lecture_id) out.lecture_id = liveLecture_(s, me, p.audio_file_id, p.duration_sec);
    return out;
  },

  // ربط التسجيل بعد الإنهاء (لو اكتمل رفعه متأخرًا)
  liveAttach: (p, me) => {
    const s = ownLive_(me, p);
    if (s.status !== 'ended') throw new Error('المحاضرة لم تنتهِ بعد');
    if (s.lecture_id) return { lecture_id: s.lecture_id };
    return { lecture_id: liveLecture_(s, me, p.audio_file_id, p.duration_sec) };
  },

  // كشف الحضور: كل أطفال الفصل (من لم يدخل = غائب)
  liveAttendance: (p, me) => {
    const s = ownLive_(me, p), att = rows_('LiveAttend').filter(a => a.live_id === s.live_id);
    return rows_('Users').filter(u => u.class_id === s.class_id && u.role === 'student' && !inactive_(u)).map(u => {
      const a = att.find(x => x.user_id === u.user_id);
      return { user_id: u.user_id, name: u.name, avatar: u.avatar, seconds: a ? Number(a.seconds) || 0 : 0,
        status: a && a.status ? a.status : (s.status === 'live' ? (a && Date.now() - new Date(a.last_at).getTime() < 150000 ? 'here' : 'absent') : 'absent'), override: !!(a && truthy_(a.override)) };
    }).sort((x, y) => y.seconds - x.seconds);
  },

  // تعديل حالة طفل يدويًا بعد الإنهاء (النجوم تتعدل بالفرق)
  liveSetAttend: (p, me) => {
    const s = ownLive_(me, p);
    if (s.status !== 'ended') throw new Error('عدّلي الحضور بعد انتهاء المحاضرة');
    if (['present', 'partial', 'absent'].indexOf(p.status) < 0) throw new Error('حالة غير صحيحة');
    const kid = rows_('Users').find(u => u.user_id === String(p.user_id || '') && u.class_id === s.class_id && u.role === 'student');
    if (!kid) throw new Error('الطفل غير موجود');
    return withLock_(() => {
      const key = s.live_id + ':' + kid.user_id, a = att_(s.live_id, kid.user_id);
      const pts = p.status === 'present' ? LIVE_PRESENT_PTS : p.status === 'partial' ? LIVE_PARTIAL_PTS : 0, old = a ? Number(a.points) || 0 : 0;
      if (a) update_('LiveAttend', 'key', key, { status: p.status, points: pts, override: true });
      else append_('LiveAttend', { key, live_id: s.live_id, user_id: kid.user_id, first_at: '', last_at: '', seconds: 0, status: p.status, points: pts, override: true });
      if (pts !== old) addPoints_(kid.user_id, pts - old, 'تعديل حضور محاضرة مباشرة');
      return true;
    });
  },

  // مواعيد أسبوعية: week_min = الدقيقة من بداية الأسبوع (الأحد ٠٠:٠٠) بتوقيت منطقة tz — كل جهاز يحسب اللحظة ويعرضها بتوقيته
  liveSlotSave: (p, me) => {
    const c = cls_(me, p), wm = Math.floor(Number(p.week_min)), minutes = Math.floor(Number(p.minutes) || 60);
    const title = String(p.title || '').trim().slice(0, 80);
    if (!title) throw new Error('اكتبي عنوان المحاضرة');
    if (!(wm >= 0 && wm < 10080)) throw new Error('الموعد غير صحيح');
    if (!(minutes >= 15 && minutes <= 240)) throw new Error('المدة بين ١٥ و٢٤٠ دقيقة');
    const own = rows_('LiveSlots').filter(s => s.class_id === c);
    if (p.slot_id) {
      if (!own.some(s => s.slot_id === String(p.slot_id))) throw new Error('الموعد غير موجود');
      update_('LiveSlots', 'slot_id', String(p.slot_id), { title, week_min: wm, minutes, tz: cleanTz_(p.tz) });
      return true;
    }
    if (own.length >= 14) throw new Error('الحد ١٤ موعدًا في الأسبوع');
    append_('LiveSlots', { slot_id: id_('W'), class_id: c, title, week_min: wm, minutes, created_by: me.user_id, created_at: now_(), tz: cleanTz_(p.tz) });
    return true;
  },
  liveSlotDelete: (p, me) => {
    const c = cls_(me, p);
    if (!rows_('LiveSlots').some(s => s.slot_id === String(p.slot_id || '') && s.class_id === c)) throw new Error('الموعد غير موجود');
    remove_('LiveSlots', 'slot_id', String(p.slot_id));
    return true;
  }
});
function att_(live_id, user_id) { return rows_('LiveAttend').find(a => a.key === live_id + ':' + user_id) || null; }
// محاضرة نسيت المعلمة إنهاءها: تنتهي تلقائيًا بعد ٤ ساعات (يُستدعى من مشغّل الإشعارات)
// وتنتهي أيضًا بعد ١٥ دقيقة من آخر ظهور لصفحة المعلمة (أغلقت الجهاز بدون «إنهاء»)، ومدتها حتى آخر ظهور
function autoEndLive_() {
  if (!prop_('LIVE_ON')) return;
  const live = rows_('LiveSessions').filter(s => s.status === 'live');
  if (!live.length) { props_().deleteProperty('LIVE_ON'); return; }
  live.forEach(s => {
    const seen = new Date(s.teacher_seen || s.started_at).getTime(), age = Date.now() - new Date(s.started_at).getTime();
    if (Date.now() - seen > 15 * 60000) closeLive_(s, new Date(Math.max(seen, new Date(s.started_at).getTime() + 60000)));
    else if (age > LIVE_MAX_SEC * 1000) closeLive_(s);
  });
}

/* ============ 7) تحويل رسائل تيليجرام الصوتية (Ogg/Opus) إلى WebM/Opus ============
 * سفاري (آيفون) لا يشغّل Opus داخل Ogg إطلاقًا، لكنه يشغّله داخل WebM. نعيد تغليف نفس الصوت بدون إعادة ترميز:
 * نقرأ حزم Opus من صفحات Ogg ونكتبها كتلًا في ملف WebM (مع CodecPrivate = OpusHead وجدول Cues للتقديم). */
function oggOpusToWebm_(src) {
  // 1) حزم Ogg: كل صفحة = ترويسة 27 بايت + جدول أطوال + بيانات؛ الحزمة تستمر عبر المقاطع 255
  const packets = [];
  let cur = [], pos = 0;
  while (pos + 27 <= src.length) {
    if (src[pos] !== 0x4F || src[pos + 1] !== 0x67 || src[pos + 2] !== 0x67 || src[pos + 3] !== 0x53) throw new Error('ليس ملف Ogg');
    const nseg = src[pos + 26];
    let data = pos + 27 + nseg;
    for (let i = 0; i < nseg; i++) {
      const len = src[pos + 27 + i];
      cur.push(src.subarray(data, data + len));
      data += len;
      if (len < 255) { packets.push(concatBytes_(cur)); cur = []; }
    }
    pos = data;
  }
  if (packets.length < 3) throw new Error('ملف صوتي فارغ');
  const head = packets[0];
  if (String.fromCharCode.apply(null, Array.from(head.subarray(0, 8))) !== 'OpusHead') throw new Error('ليس Opus');
  const channels = head[9], preSkip = head[10] | (head[11] << 8);

  // 2) مدة كل حزمة من بايت TOC (بالـ 48 كيلوهرتز)
  const FRAME = [480, 960, 1920, 2880, 480, 960, 1920, 2880, 480, 960, 1920, 2880, 480, 960, 480, 960, 120, 240, 480, 960, 120, 240, 480, 960, 120, 240, 480, 960, 120, 240, 480, 960];
  const samplesOf = (p) => { if (!p.length) return 0; const c = p[0] & 3; return FRAME[p[0] >> 3] * (c === 0 ? 1 : c === 3 ? (p[1] & 0x3F) : 2); };

  // 3) الكتل: عنقود كل ~5 ثوانٍ (التوقيت داخل العنقود 16 بت)
  const clusters = [];
  let t = 0, cl = null;
  for (let i = 2; i < packets.length; i++) {
    const p = packets[i], ms = Math.round(t / 48);
    if (!cl || ms - cl.ms > 5000) { cl = { ms, blocks: [] }; clusters.push(cl); }
    const rel = ms - cl.ms;
    cl.blocks.push(ebml_(0xA3, concatBytes_([new Uint8Array([0x81, (rel >> 8) & 0xFF, rel & 0xFF, 0x80]), p])));
    t += samplesOf(p);
  }
  const durationMs = Math.max(0, (t - preSkip) / 48);
  const clusterBytes = clusters.map(c => ebml_(0x1F43B675, concatBytes_([ebmlUint_(0xE7, c.ms)].concat(c.blocks))));

  // 4) الترويسة والمسارات
  const header = ebml_(0x1A45DFA3, concatBytes_([ebmlUint_(0x4286, 1), ebmlUint_(0x42F7, 1), ebmlUint_(0x42F2, 4), ebmlUint_(0x42F3, 8),
    ebml_(0x4282, strBytes_('webm')), ebmlUint_(0x4287, 4), ebmlUint_(0x4285, 2)]));
  const info = ebml_(0x1549A966, concatBytes_([ebmlUint_(0x2AD7B1, 1000000), ebml_(0x4D80, strBytes_('serah')), ebml_(0x5741, strBytes_('serah')), ebmlFloat_(0x4489, durationMs)]));
  const tracks = ebml_(0x1654AE6B, ebml_(0xAE, concatBytes_([ebmlUint_(0xD7, 1), ebmlUint_(0x73C5, 1), ebmlUint_(0x83, 2), ebml_(0x86, strBytes_('A_OPUS')),
    ebml_(0x63A2, head), ebmlUint_(0x56AA, Math.round(preSkip * 1e9 / 48000)), ebmlUint_(0x56BB, 80000000),
    ebml_(0xE1, concatBytes_([ebmlFloat_(0xB5, 48000), ebmlUint_(0x9F, channels)]))])));

  // 5) جدول Cues قبل العناقيد (مواضعها بطول ثابت 8 بايت فيُحسب الحجم مرة واحدة)
  const cueFor = (c, at) => ebml_(0xBB, concatBytes_([ebmlUint_(0xB3, c.ms, 8), ebml_(0xB7, concatBytes_([ebmlUint_(0xF7, 1), ebmlUint_(0xF1, at, 8)]))]));
  const cuesSize = ebml_(0x1C53BB6B, concatBytes_(clusters.map(c => cueFor(c, 0)))).length;
  let at = info.length + tracks.length + cuesSize;
  const cues = ebml_(0x1C53BB6B, concatBytes_(clusters.map((c, i) => { const cue = cueFor(c, at); at += clusterBytes[i].length; return cue; })));
  return concatBytes_([header, ebml_(0x18538067, concatBytes_([info, tracks, cues].concat(clusterBytes)))]);
}
function concatBytes_(list) {
  let n = 0; list.forEach(a => n += a.length);
  const out = new Uint8Array(n); let o = 0;
  list.forEach(a => { out.set(a, o); o += a.length; });
  return out;
}
function strBytes_(s) { return Uint8Array.from(String(s).split('').map(c => c.charCodeAt(0))); }
// عنصر EBML: المعرّف + الحجم (8 بايت دائمًا للتبسيط) + البيانات
function ebml_(id, data) {
  const idBytes = []; for (let v = id; v > 0; v = Math.floor(v / 256)) idBytes.unshift(v & 0xFF);
  const size = new Uint8Array(8); let n = data.length;
  for (let i = 7; i > 0; i--) { size[i] = n & 0xFF; n = Math.floor(n / 256); }
  size[0] = 0x01;
  return concatBytes_([Uint8Array.from(idBytes), size, data]);
}
function ebmlUint_(id, v, width) {
  const b = []; let n = Math.round(v);
  do { b.unshift(n & 0xFF); n = Math.floor(n / 256); } while (n > 0);
  while (width && b.length < width) b.unshift(0);
  return ebml_(id, Uint8Array.from(b));
}
function ebmlFloat_(id, v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v); return ebml_(id, b); }

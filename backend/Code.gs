/**
 * منصة رحلة مع الأنبياء — الخلفية (Google Apps Script)
 * قاعدة البيانات: Google Sheets | الملفات: Google Drive
 * الأسرار (توكن البوت وغيره) تُحفظ في Script Properties فقط ولا تُكتب هنا أبدًا.
 */

// رقم النسخة: يزيده سكربت النشر (deploy.ps1) تلقائيًا، ويرجع مع ping للتأكد أن الموقع على أحدث نسخة
const VERSION = 17;

/* ============ 1) هيكل الجداول ============ */
const SCHEMA = {
  Classes:      ['class_id', 'name', 'teacher_id', 'join_code', 'created_at'],
  Users:        ['user_id', 'role', 'name', 'class_id', 'avatar', 'pin_hash', 'city', 'country', 'telegram_id', 'active', 'created_at', 'last_login_at'],
  Lectures:     ['lecture_id', 'class_id', 'title', 'date', 'audio_file_id', 'duration_sec', 'status', 'notes', 'created_by', 'created_at', 'prophet_id'],
  LectureImages:['image_id', 'lecture_id', 'sort', 'file_id'],
  Attendance:   ['lecture_id', 'user_id', 'at'],
  Quizzes:      ['quiz_id', 'class_id', 'lecture_id', 'title', 'status', 'created_at'],
  Questions:    ['question_id', 'quiz_id', 'text', 'opt_a', 'opt_b', 'opt_c', 'opt_d', 'correct', 'points'],
  Results:      ['quiz_id', 'user_id', 'score', 'total', 'at'],
  Assignments:  ['assignment_id', 'class_id', 'lecture_id', 'title', 'details', 'due', 'created_at'],
  Points:       ['user_id', 'points', 'reason', 'at'],
  Suggestions:  ['id', 'from_user', 'role', 'text', 'audio_file_id', 'status', 'at'],
  BotState:     ['chat_id', 'state', 'data', 'at'],
  AuditLog:     ['at', 'user_id', 'role', 'action', 'target_type', 'target_id', 'details_json', 'imp_by'],
  LoginAttempts:['key', 'fails', 'first_at', 'locked_until'],
  // رحلة الأنبياء: الأقسام (sort ترتيب، symbol شكل المجسم 3D) وعناصر صفحة كل نبي (نص/صوت/صورة/يوتيوب)
  Prophets:     ['prophet_id', 'sort', 'name', 'title', 'tag', 'text', 'symbol', 'symbol_name', 'visible', 'updated_at'],
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
      target_type: target_type || '', target_id: target_id || '', details_json: details ? JSON.stringify(details) : '', imp_by: me && me.imp || '' });
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
  audioCheck: { min: 'superadmin' }
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
      audit_(me, action, '', p.user_id || p.lecture_id || p.class_id || p.item_id || p.prophet_id || p.image_id || '', details);
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
    const key = 'login:' + (p.user_id ? String(p.user_id) : normName_(p.name));
    const users = rows_('Users');
    // الطفل بالمعرّف، والمعلمة بالاسم فقط (حتى لا يكون لها عدادا تخمين منفصلان)
    let u = p.user_id ? users.find(x => x.user_id === String(p.user_id) && x.role === 'student')
                      : users.find(x => x.role !== 'student' && normName_(x.name) === normName_(p.name));
    // حساب غير موجود: لا نكتب صفًا في LoginAttempts (يكبر الشيت بلا حد)، بل إبطاء عام
    if (!u) { codeFail_('loginFails'); throw new Error('الرمز غير صحيح'); }
    const a = checkLock_(key);
    if (u.active === false || u.pin_hash !== hashPin_(p.pin)) {
      const lockMin = failAttempt_(key, a);
      throw new Error(lockMin ? 'الرمز غير صحيح. محاولات كثيرة، انتظر ' + lockMin + ' دقيقة' : 'الرمز غير صحيح');
    }
    clearAttempts_(key, a);
    update_('Users', 'user_id', u.user_id, { last_login_at: now_() });
    return { token: makeToken_(u), user: { user_id: u.user_id, name: u.name, role: u.role, class_id: u.class_id, avatar: u.avatar } };
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
    return { points: pts[me.user_id] || 0, attended, rank: kids.findIndex(k => k.id === me.user_id) + 1, total: kids.length };
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
      const key = 'login:' + normName_(u.name);
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
      .map(u => ({ user_id: u.user_id, name: u.name, avatar: u.avatar, points: pts[u.user_id] || 0 }));
  },

  addStudent: (p, me) => {
    needTeacher_(me);
    const name = String(p.name || '').trim().slice(0, 40);
    const pin = normDigits_(p.pin);
    if (!name) throw new Error('اكتبي اسم الطفل');
    if (!/^\d{4}$/.test(pin)) throw new Error('الرمز السري 4 أرقام');
    const u = append_('Users', { user_id: id_('U'), role: 'student', name, class_id: cls_(me, p), avatar: String(p.avatar || '🌟').slice(0, 8),
      pin_hash: hashPin_(pin), city: String(p.city || '').slice(0, 60), country: String(p.country || '').slice(0, 60), active: true, created_at: now_() });
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
    return { token: makeToken_(u, 2 * 3600e3, me.user_id), user: { user_id: u.user_id, name: u.name, role: u.role, class_id: u.class_id, avatar: u.avatar } };
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
    const key = 'login:' + (u.role === 'student' ? u.user_id : normName_(u.name));
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
  if (rows_('Users').some(u => u.role !== 'student' && u.user_id !== exceptId && normName_(u.name) === normName_(name))) throw new Error('يوجد حساب بنفس الاسم، اختاري اسمًا آخر');
}
function targetUser_(me, user_id) {
  const u = rows_('Users').find(x => x.user_id === user_id);
  if (!u) throw new Error('المستخدم غير موجود');
  if (u.user_id === me.user_id) throw new Error('لا يمكن تنفيذ هذا على حسابك');
  if (u.role === 'superadmin') throw new Error('لا يمكن تعديل حساب مطوّر آخر');
  return u;
}

// ===== أدوات رحلة الأنبياء =====
const SYMBOLS = ['crescent', 'ark', 'staff', 'kaaba', 'whale', 'yusuf_dream', 'mushaf', 'dome', 'sword', 'book'];
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
function addPoints_(user_id, points, reason) { append_('Points', { user_id, points, reason, at: now_() }); }
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
      say_(a.telegram_id, '🆕 محاضرة جديدة بانتظار مراجعتكِ الكريمة\n«' + l.title + '»\nمن: ' + t.name,
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
  return say_(chat, 'أهلًا وسهلًا بكِ ' + u.name + ' 🌷\nيسعدنا انضمامكِ، وقد رُبط حسابكِ بالبوت بنجاح.\nلرفع محاضرة اضغطي «' + BTN.NEW + '» ثم أرسلي التسجيل.', menuKb_(u));
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
  const key = 'login:' + normName_(u.name);
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
  const NAME = 'م.احمد';
  ensureSheet_('Users'); ensureSheet_('AuditLog');
  const existing = rows_('Users').find(u => u.role === 'superadmin');
  let user_id;
  if (existing) {
    user_id = existing.user_id;
    update_('Users', 'user_id', user_id, { pin_hash: hashPin_(pin), active: true });
  } else {
    if (rows_('Users').some(u => u.role !== 'student' && normName_(u.name) === normName_(NAME))) throw new Error('يوجد حساب آخر بنفس الاسم');
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

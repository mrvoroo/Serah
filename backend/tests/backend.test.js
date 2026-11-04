// اختبارات الخلفية على جدول وهمي (بدون جوجل): node backend/tests/backend.test.js
// يشغّل Code.gs كما هو داخل Node مع بدائل لـ SpreadsheetApp و PropertiesService وغيرها.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert');
const code = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const VOICE = fs.readFileSync(path.join(__dirname, 'fixtures', 'voice.ogg'));
const signed = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));

function boot() {
  const sheets = {};
  const props = { PIN_SALT: 'salt', HMAC_KEY: 'hmac', SHEET_ID: 'x', BOT_TOKEN: 'set' };
  const cache = {};
  let slept = 0;
  const tg = [], saved = [], fetches = [];
  let mid = 1000, drv = 0;
  function mkSheet(name) {
    const data = [];
    const sh = {
      getLastRow: () => data.length,
      getLastColumn: () => Math.max(0, ...data.map(r => r.length)),
      getRange: (r, c, nr, nc) => ({
        setValues: (v) => { while (data.length < r) data.push([]); v[0].forEach((x, i) => { data[r - 1][c - 1 + i] = x; }); return { setFontWeight() {} }; },
        getValues: () => [Array.from({ length: nc }, (_, i) => (data[r - 1] || [])[c - 1 + i] ?? '')],
        setValue: (x) => { data[r - 1][c - 1] = x; }
      }),
      setFrozenRows() {},
      appendRow: (row) => data.push(row.slice()),
      deleteRow: (i) => { data.splice(i - 1, 1); },
      getDataRange: () => ({ getValues: () => { const w = sh.getLastColumn(); return data.map(r => Array.from({ length: w }, (_, i) => r[i] ?? '')); } }),
      _data: data
    };
    return (sheets[name] = sh);
  }
  const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: mkSheet, getId: () => 'x', getSheets: () => Object.values(sheets) };
  const env = {
    SpreadsheetApp: { openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 1 },
      computeDigest: (_, s) => [...crypto.createHash('sha256').update(s).digest()].map(b => (b > 127 ? b - 256 : b)),
      computeHmacSha256Signature: (s, k) => [...crypto.createHmac('sha256', k).update(s).digest()],
      base64EncodeWebSafe: (x) => Buffer.from(typeof x === 'string' ? x : Uint8Array.from(x.map(b => b & 255))).toString('base64url'),
      base64DecodeWebSafe: (s) => [...Buffer.from(s, 'base64url')],
      base64Encode: (x) => Buffer.from(Uint8Array.from(x, (b) => b & 255)).toString('base64'),
      newBlob: (b, type, name) => ({ getDataAsString: () => Buffer.from(b).toString(), getContentType: () => type, getBytes: () => b, _b: { type, name, size: b.length } }),
      formatDate: (d) => d.toISOString().slice(0, 10),
      sleep: (ms) => { slept += ms; }
    },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 1 } },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [{ getHandlerFunction: () => 'pollTelegram' }], getOAuthToken: () => 't', getService: () => ({ getUrl: () => 'u' }) },
    UrlFetchApp: { fetch: (url, opts) => {
      fetches.push({ url, opts });
      if (/api\.telegram\.org\/file\//.test(url)) { const b = { type: 'application/octet-stream', name: '' }; return { getBlob: () => ({ setName(n) { b.name = n; return this; }, setContentType(t) { b.type = t; return this; }, getBytes: () => signed(VOICE), getContentType: () => b.type, _b: b }) }; }
      if (/googleapis\.com\/upload\/drive/.test(url)) return { getResponseCode: () => 200, getHeaders: () => ({ Location: 'https://upload/session' }) };
      if (/googleapis\.com\/drive\/v3\/files\//.test(url)) {
        const [, a, b] = /bytes=(\d+)-(\d+)/.exec(opts.headers.Range);
        if (Number(a) >= VOICE.length) return { getResponseCode: () => 416, getHeaders: () => ({}), getContent: () => [] };
        const part = VOICE.subarray(Number(a), Math.min(Number(b) + 1, VOICE.length));
        return { getResponseCode: () => 206, getHeaders: () => ({ 'Content-Type': 'audio/webm', 'Content-Range': 'bytes ' + a + '-' + (Number(a) + part.length - 1) + '/' + VOICE.length }), getContent: () => signed(part) };
      }
      const m = String(url).match(/api\.telegram\.org\/bot[^/]*\/(\w+)/);
      if (m) {
        const payload = JSON.parse((opts && opts.payload) || '{}');
        tg.push({ method: m[1], ...payload });
        const result = m[1] === 'getFile' ? { file_path: 'voice/f.oga' } : m[1] === 'sendMessage' ? { message_id: ++mid } : m[1] === 'getMe' ? { username: 'Serah_2026_bot' }
          : { url: 'https://relay.example.workers.dev/hook?x', pending_update_count: 0 };
        return { getContentText: () => JSON.stringify({ ok: true, result }) };
      }
      return { getContentText: () => JSON.stringify({ ok: true, result: { url: 'https://relay.example.workers.dev/hook?x', pending_update_count: 0 } }) };
    } },
    DriveApp: { getFileById: () => ({ setSharing() {} }), getFolderById: () => ({ createFile: (blob) => { saved.push({ ...(blob && blob._b) }); return { getId: () => 'drv' + (++drv) }; } }), Access: {}, Permission: {} }, Logger: { log() {} }, console: { error() {}, log() {} }
  };
  const g = new Function(...Object.keys(env), code + '\nreturn { handle_, createSuperAdmin, ensureSheet_, rows_, SCHEMA, hashPin_, VERSION, onTelegram_, BTN, oggOpusToWebm_ };')(...Object.values(env));
  return { g, sheets, props, mkSheet, slept: () => slept, tg, saved, fetches };
}

// بيانات بالشكل القديم (قبل أعمدة last_login_at وجدول LoginAttempts) كما في الشيت الحقيقي
function seed(t) {
  const { g, mkSheet } = t;
  const old = { ...g.SCHEMA, Users: g.SCHEMA.Users.filter(c => c !== 'last_login_at') };
  Object.keys(old).filter(n => n !== 'LoginAttempts' && n !== 'AuditLog').forEach(n => mkSheet(n).appendRow(old[n]));
  t.sheets.Classes.appendRow(['C1', 'الفصل الأول', 'T1', 'SERAH1', 'x']);
  const U = t.sheets.Users;
  U.appendRow(['T1', 'admin', 'المعلمة', 'C1', '', g.hashPin_('482615'), '', '', '', true, 'x']);
  U.appendRow(['T2', 'teacher', 'معلمة ثانية', 'C1', '', g.hashPin_('222222'), '', '', '', true, 'x']);
  U.appendRow(['S1', 'student', 'يوسف', 'C1', '🌟', g.hashPin_('1111'), '', '', '', true, 'x']);
  U.appendRow(['S2', 'student', 'مريم', 'C1', '🌙', g.hashPin_('2222'), '', '', '', true, 'x']);
  t.sheets.Lectures.appendRow(['L1', 'C1', 'قصة نوح', '2026-11-01', 'f1', 60, 'draft', '', 'T1', 'x']);
  t.props.NEW_SUPER_PIN = '٩٨٧٦٥٤';
  g.createSuperAdmin();
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
function setup() { const t = boot(); seed(t); const call = (a, p, tok) => t.g.handle_(a, p || {}, tok); return { ...t, call,
  login: (p) => { const r = call('login', p); assert.ok(r.ok, JSON.stringify(r)); return r.data.token; } }; }

test('الترحيل التلقائي: أعمدة وجداول جديدة بدون لمس البيانات', () => {
  const t = setup();
  t.call('ping');
  assert.ok(t.sheets.LoginAttempts, 'LoginAttempts created');
  assert.ok(t.sheets.Users._data[0].includes('last_login_at'));
  assert.strictEqual(t.g.rows_('Users').find(u => u.user_id === 'S1').name, 'يوسف');
  assert.strictEqual(t.props.SCHEMA_VERSION, String(t.g.VERSION));
});

test('ping يرجع النسخة', () => { const t = setup(); const r = t.call('ping'); assert.ok(r.ok && r.data.version === t.g.VERSION); });

test('إجراء غير معروف يُرفض', () => { const t = setup(); assert.strictEqual(t.call('dropTables').error, 'إجراء غير معروف'); });

test('الدخول يسجّل last_login_at', () => {
  const t = setup(); t.login({ user_id: 'S1', pin: '1111' });
  assert.ok(t.g.rows_('Users').find(u => u.user_id === 'S1').last_login_at);
});

test('مصفوفة الصلاحيات: كل دور يصل لما يخصه فقط', () => {
  const t = setup();
  const tok = { student: t.login({ user_id: 'S1', pin: '1111' }), teacher: t.login({ name: 'معلمة ثانية', pin: '222222' }),
    admin: t.login({ name: 'المعلمة', pin: '482615' }), superadmin: t.login({ name: 'م.احمد', pin: '987654' }) };
  const allowed = {
    lectures: ['student', 'teacher', 'admin', 'superadmin'],
    students: ['teacher', 'admin', 'superadmin'],
    dashboard: ['teacher', 'admin', 'superadmin'],
    auditLog: ['admin', 'superadmin'],
    users: ['superadmin'], classes: ['superadmin'], systemHealth: ['superadmin']
  };
  for (const [action, roles] of Object.entries(allowed)) for (const role of Object.keys(tok)) {
    const r = t.call(action, {}, tok[role]);
    assert.strictEqual(r.ok, roles.includes(role), `${action} as ${role}: ${JSON.stringify(r).slice(0, 120)}`);
  }
  // النشر (الاعتماد الشرعي) للأدمن فقط
  assert.ok(!t.call('setLectureStatus', { lecture_id: 'L1', status: 'published' }, tok.teacher).ok);
  assert.ok(t.call('setLectureStatus', { lecture_id: 'L1', status: 'published' }, tok.admin).ok);
  assert.ok(!t.call('students', {}).ok, 'no token');
  assert.ok(!t.call('students', {}, tok.student + 'x').ok, 'tampered token');
});

test('كل إجراء له سياسة صلاحيات (لا يوجد إجراء مكشوف بالخطأ)', () => {
  const t = setup();
  const unknown = ['__proto__', 'constructor', 'toString'].map(a => t.call(a));
  unknown.forEach(r => assert.strictEqual(r.ok, false));
});

test('منع التخمين: 5 أخطاء تقفل 10 دقائق، والقفل يمنع حتى الرمز الصحيح', () => {
  const t = setup();
  for (let i = 1; i <= 4; i++) assert.strictEqual(t.call('login', { user_id: 'S1', pin: '0000' }).error, 'الرمز غير صحيح');
  assert.match(t.call('login', { user_id: 'S1', pin: '0000' }).error, /انتظر 10 دقيقة/);
  assert.match(t.call('login', { user_id: 'S1', pin: '1111' }).error, /محاولات كثيرة خاطئة/);
  // طفل آخر غير متأثر
  assert.ok(t.call('login', { user_id: 'S2', pin: '2222' }).ok);
  // بعد انتهاء القفل: الدخول الصحيح يمسح العداد
  const row = t.sheets.LoginAttempts._data.findIndex(r => r[0] === 'login:S1');
  t.sheets.LoginAttempts._data[row][3] = new Date(Date.now() - 1000).toISOString();
  assert.ok(t.call('login', { user_id: 'S1', pin: '1111' }).ok);
  assert.strictEqual(Number(t.g.rows_('LoginAttempts').find(r => r.key === 'login:S1').fails), 0);
});

test('منع التخمين: من 10 أخطاء القفل 30 دقيقة', () => {
  const t = setup();
  for (let i = 0; i < 9; i++) { t.call('login', { name: 'المعلمة', pin: '000000' });
    const r = t.sheets.LoginAttempts._data.find(x => x[0] === 'login:المعلمه'); if (r) r[3] = ''; }
  assert.match(t.call('login', { name: 'المعلمة', pin: '000000' }).error, /انتظر 30 دقيقة/);
});

test('كود الفصل الخاطئ: إبطاء بعد 20 خطأ بدل القفل', () => {
  const t = setup();
  for (let i = 0; i < 25; i++) t.call('classInfo', { code: 'WRONG' + i });
  assert.ok(t.slept() > 0);
  assert.ok(t.call('classInfo', { code: 'serah1' }).ok, 'الكود الصحيح يعمل دائمًا');
});

test('عرض كـ: يعمل للمطوّر فقط، ويرى بعين المستخدم، ويمنع الحفظ', () => {
  const t = setup();
  const sa = t.login({ name: 'م.احمد', pin: '987654' });
  const admin = t.login({ name: 'المعلمة', pin: '482615' });
  assert.ok(!t.call('viewAs', { user_id: 'S1' }, admin).ok, 'admin cannot viewAs');
  const v = t.call('viewAs', { user_id: 'S1' }, sa); assert.ok(v.ok, JSON.stringify(v));
  assert.strictEqual(v.data.user.name, 'يوسف');
  const kid = v.data.token;
  assert.ok(t.call('lectures', {}, kid).ok, 'reading works');
  assert.ok(t.call('me', {}, kid).ok);
  for (const [a, p] of [['markAttendance', { lecture_id: 'L1' }], ['suggest', { text: 'x' }]])
    assert.strictEqual(t.call(a, p, kid).error, 'وضع المعاينة للعرض فقط — لا يمكن الحفظ');
  assert.strictEqual(t.g.rows_('Attendance').length, 0);
  assert.strictEqual(t.g.rows_('Points').length, 0);
  const vt = t.call('viewAs', { user_id: 'T1' }, sa).data.token;
  assert.ok(t.call('students', {}, vt).ok);
  assert.ok(!t.call('addStudent', { name: 'x', pin: '1234' }, vt).ok);
  assert.ok(!t.call('viewAs', { user_id: 'S2' }, vt).ok, 'cannot chain viewAs');
  const log = t.g.rows_('AuditLog').filter(a => a.action === 'viewAs');
  assert.strictEqual(log.length, 2);
});

test('إدارة المستخدمين للمطوّر: دور، تعطيل، رمز جديد، وحماية حسابه', () => {
  const t = setup();
  const sa = t.login({ name: 'م.احمد', pin: '987654' });
  const users = t.call('users', {}, sa).data;
  assert.strictEqual(users.length, 5);
  assert.ok(users.every(u => !('pin_hash' in u)), 'no pin hashes leaked');
  assert.strictEqual(users.find(u => u.user_id === 'S1').class_name, 'الفصل الأول');
  assert.ok(t.call('setRole', { user_id: 'T2', role: 'admin' }, sa).ok);
  assert.strictEqual(t.g.rows_('Users').find(u => u.user_id === 'T2').role, 'admin');
  assert.ok(!t.call('setRole', { user_id: 'T2', role: 'superadmin' }, sa).ok, 'cannot grant superadmin');
  assert.ok(!t.call('setRole', { user_id: 'S1', role: 'teacher' }, sa).ok, 'student stays student');
  const self = users.find(u => u.role === 'superadmin').user_id;
  assert.ok(!t.call('setRole', { user_id: self, role: 'teacher' }, sa).ok, 'not self');
  assert.ok(!t.call('setUserActive', { user_id: self, active: false }, sa).ok, 'not self');
  assert.ok(t.call('setUserActive', { user_id: 'S2', active: false }, sa).ok);
  assert.ok(!t.call('login', { user_id: 'S2', pin: '2222' }).ok, 'disabled cannot login');
  assert.ok(t.call('setUserActive', { user_id: 'S2', active: true }, sa).ok);
  assert.ok(t.call('login', { user_id: 'S2', pin: '2222' }).ok, 'restored');
  assert.ok(!t.call('setUserPin', { user_id: 'T1', pin: '1234' }, sa).ok, 'teacher pin >= 6');
  assert.ok(t.call('setUserPin', { user_id: 'T1', pin: '٥٥٥٥٥٥' }, sa).ok);
  assert.ok(t.call('login', { name: 'المعلمة', pin: '555555' }).ok);
  assert.ok(!t.call('setUserPin', { user_id: 'S1', pin: '12345' }, sa).ok, 'kid pin = 4');
});

test('الرمز الجديد يفك قفل الحساب', () => {
  const t = setup();
  for (let i = 0; i < 5; i++) t.call('login', { user_id: 'S1', pin: '0000' });
  const sa = t.login({ name: 'م.احمد', pin: '987654' });
  assert.ok(t.call('setUserPin', { user_id: 'S1', pin: '3333' }, sa).ok);
  assert.ok(t.call('login', { user_id: 'S1', pin: '3333' }).ok);
});

test('سجل العمليات: الكتابات الإدارية تُسجَّل بدون رموز سرية', () => {
  const t = setup();
  const admin = t.login({ name: 'المعلمة', pin: '482615' });
  t.call('addStudent', { name: 'علي', pin: '4444' }, admin);
  t.call('setLectureStatus', { lecture_id: 'L1', status: 'published' }, admin);
  const log = t.call('auditLog', {}, admin).data;
  const add = log.find(a => a.action === 'addStudent');
  assert.ok(add && add.name === 'المعلمة');
  assert.ok(!add.details_json.includes('4444'), 'pin not logged');
  assert.ok(log.find(a => a.action === 'setLectureStatus' && a.target_id === 'L1'));
});

test('صحة النظام', () => {
  const t = setup();
  const sa = t.login({ name: 'م.احمد', pin: '987654' });
  const h = t.call('systemHealth', {}, sa).data;
  assert.strictEqual(h.version, t.g.VERSION);
  assert.ok(h.tables.find(x => x.name === 'Users').rows === 5);
  assert.ok(h.settings.find(s => s.key === 'BOT_TOKEN').set);
  assert.ok(!JSON.stringify(h).includes('hmac'), 'no secret values');
  assert.strictEqual(h.bot.webhook, 'https://relay.example.workers.dev/…');
  assert.deepStrictEqual(h.triggers, ['pollTelegram']);
});

test('المطوّر يعمل على الفصل الأول تلقائيًا أو الفصل المطلوب', () => {
  const t = setup();
  const sa = t.login({ name: 'م.احمد', pin: '987654' });
  assert.deepStrictEqual(t.call('students', {}, sa).data.map(s => s.name).sort(), ['مريم', 'يوسف']);
  assert.deepStrictEqual(t.call('students', { class_id: 'C9' }, sa).data, []);
  const c = t.call('classes', {}, sa).data[0];
  assert.deepStrictEqual([c.kids, c.lectures, c.teacher], [2, 1, 'المعلمة']);
});

let failed = 0;
// ===== رحلة الأنبياء (المرحلة 3) =====
const SEED = [
  { prophet_id: 'adam', name: 'آدم', title: 'سيدنا آدم عليه السلام', tag: 'المحطة ١', text: 'أول البشر', symbol: '' },
  { prophet_id: 'noah', name: 'نوح', title: 'سيدنا نوح عليه السلام', tag: 'المحطة ٣', text: 'صبر سنين', symbol: 'ark', symbol_name: 'السفينة' },
  { prophet_id: 'yusuf', name: 'يوسف', title: 'سيدنا يوسف عليه السلام', tag: 'المحطة ١١', text: 'صبر', symbol: 'yusuf_dream' }
];
function journeySetup() {
  const t = setup();
  const tok = { student: t.login({ user_id: 'S1', pin: '1111' }), teacher: t.login({ name: 'معلمة ثانية', pin: '222222' }),
    admin: t.login({ name: 'المعلمة', pin: '482615' }), superadmin: t.login({ name: 'م.احمد', pin: '987654' }) };
  return { t, tok };
}

test('الرحلة: الجدول الفاضي يرجع [] (الموقع يستخدم الاحتياطي)، والاستيراد مرة واحدة للأدمن فقط', () => {
  const { t, tok } = journeySetup();
  const j = t.call('journey', {}, tok.student);
  assert.ok(j.ok); assert.deepStrictEqual(j.data, []);
  assert.ok(!t.call('seedProphets', { list: SEED }, tok.teacher).ok, 'teacher cannot seed');
  const r = t.call('seedProphets', { list: SEED }, tok.admin);
  assert.ok(r.ok && r.data === 3, JSON.stringify(r));
  assert.strictEqual(t.call('seedProphets', { list: SEED }, tok.admin).error, 'الأقسام موجودة بالفعل');
  const list = t.call('journey', {}, tok.student).data;
  assert.deepStrictEqual(list.map(p => p.prophet_id), ['adam', 'noah', 'yusuf']);
  assert.strictEqual(list[1].symbol, 'ark');
  assert.strictEqual(list[2].symbol, 'yusuf_dream');
});

test('الرحلة: إخفاء وترتيب وتعديل وإضافة وحذف قسم', () => {
  const { t, tok } = journeySetup();
  t.call('seedProphets', { list: SEED }, tok.admin);
  assert.ok(t.call('saveProphet', { prophet_id: 'noah', name: 'نوح', title: 'سيدنا نوح', text: 'نص جديد', symbol: 'rocket', visible: false }, tok.admin).ok);
  let list = t.call('journey', {}, tok.student).data;
  assert.deepStrictEqual(list.map(p => p.prophet_id), ['adam', 'yusuf'], 'hidden prophet not shown');
  const all = t.call('journeyAdmin', {}, tok.admin).data;
  const noah = all.find(p => p.prophet_id === 'noah');
  assert.strictEqual(noah.visible, false); assert.strictEqual(noah.text, 'نص جديد'); assert.strictEqual(noah.symbol, '', 'unknown symbol dropped');
  assert.ok(t.call('reorderProphets', { ids: ['yusuf', 'adam', 'noah'] }, tok.admin).ok);
  assert.deepStrictEqual(t.call('journey', {}, tok.student).data.map(p => p.prophet_id), ['yusuf', 'adam']);
  const add = t.call('saveProphet', { name: 'هود', new_id: 'hud', title: 'سيدنا هود عليه السلام' }, tok.admin);
  assert.ok(add.ok && add.data === 'hud');
  assert.strictEqual(t.call('journey', {}, tok.student).data.at(-1).prophet_id, 'hud');
  assert.ok(!t.call('saveProphet', { name: '' }, tok.admin).ok, 'name required');
  t.call('saveContent', { prophet_id: 'hud', kind: 'text', body: 'نص' }, tok.admin);
  assert.ok(t.call('deleteProphet', { prophet_id: 'hud' }, tok.admin).ok);
  assert.ok(!t.call('journeyAdmin', {}, tok.admin).data.some(p => p.prophet_id === 'hud'));
  assert.ok(!t.g.rows_('ProphetContent').some(c => c.prophet_id === 'hud'), 'content removed with prophet');
  assert.ok(!t.call('saveProphet', { prophet_id: 'adam', name: 'x' }, tok.teacher).ok, 'teacher cannot edit');
});

test('صفحة النبي: العناصر الجديدة تنتظر الاعتماد، والطفل يرى المعتمد الظاهر فقط', () => {
  const { t, tok } = journeySetup();
  t.call('seedProphets', { list: SEED }, tok.admin);
  const a = t.call('saveContent', { prophet_id: 'noah', kind: 'text', title: 'القصة', body: 'بنى السفينة' }, tok.admin).data;
  const b = t.call('saveContent', { prophet_id: 'noah', kind: 'youtube', title: 'فيديو', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10' }, tok.admin).data;
  const c = t.call('saveContent', { prophet_id: 'noah', kind: 'image', file_id: 'img1' }, tok.admin).data;
  assert.deepStrictEqual(t.call('prophet', { id: 'noah' }, tok.student).data.items, [], 'nothing approved yet');
  assert.strictEqual(t.call('prophet', { id: 'noah', preview: true }, tok.admin).data.items.length, 3, 'admin preview sees all');
  assert.strictEqual(t.call('prophet', { id: 'noah', preview: true }, tok.student).data.items.length, 0, 'student cannot preview');
  [a, b, c].forEach(id => assert.ok(t.call('setContentFlags', { item_id: id, approved: true }, tok.admin).ok));
  t.call('setContentFlags', { item_id: c, visible: false }, tok.admin);
  const items = t.call('prophet', { id: 'noah' }, tok.student).data.items;
  assert.deepStrictEqual(items.map(i => i.kind), ['text', 'youtube']);
  assert.strictEqual(items[1].url, 'dQw4w9WgXcQ', 'stored as video id');
  assert.ok(t.call('reorderContent', { ids: [b, a, c] }, tok.admin).ok);
  assert.deepStrictEqual(t.call('prophet', { id: 'noah' }, tok.student).data.items.map(i => i.item_id), [b, a]);
  assert.ok(t.call('deleteContent', { item_id: a }, tok.admin).ok);
  assert.deepStrictEqual(t.call('prophet', { id: 'noah' }, tok.student).data.items.map(i => i.item_id), [b]);
  assert.ok(!t.call('saveContent', { prophet_id: 'noah', kind: 'text', body: 'x' }, tok.teacher).ok, 'teacher cannot add');
});

test('روابط يوتيوب: كل الأشكال المعروفة، ورفض غيرها', () => {
  const { t, tok } = journeySetup();
  t.call('seedProphets', { list: SEED }, tok.admin);
  const ok = ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?feature=x&v=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'https://youtube.com/live/dQw4w9WgXcQ?si=1'];
  for (const url of ok) {
    const r = t.call('saveContent', { prophet_id: 'adam', kind: 'youtube', url }, tok.admin);
    assert.ok(r.ok, url + ' ' + JSON.stringify(r));
  }
  for (const url of ['https://vimeo.com/123', 'javascript:alert(1)', 'https://evil.com/watch?v=dQw4w9WgXcQ', '', 'https://youtube.com/watch?v=short']) {
    assert.strictEqual(t.call('saveContent', { prophet_id: 'adam', kind: 'youtube', url }, tok.admin).error, 'رابط يوتيوب غير صحيح', url);
  }
  assert.ok(t.g.rows_('ProphetContent').every(c => c.url === 'dQw4w9WgXcQ'));
  assert.strictEqual(t.call('saveContent', { prophet_id: 'adam', kind: 'html', body: '<script>' }, tok.admin).error, 'نوع غير صحيح');
  assert.strictEqual(t.call('saveContent', { prophet_id: 'adam', kind: 'audio' }, tok.admin).error, 'ارفع الملف أولًا');
  assert.strictEqual(t.call('saveContent', { prophet_id: 'none', kind: 'text', body: 'x' }, tok.admin).error, 'القسم غير موجود');
});

test('الرحلة في وضع «عرض كـ»: القراءة مسموحة والكتابة مرفوضة', () => {
  const { t, tok } = journeySetup();
  t.call('seedProphets', { list: SEED }, tok.admin);
  const imp = t.call('viewAs', { user_id: 'T1' }, tok.superadmin).data.token;
  assert.ok(t.call('journeyAdmin', {}, imp).ok);
  assert.strictEqual(t.call('saveProphet', { prophet_id: 'adam', name: 'x' }, imp).error, 'وضع المعاينة للعرض فقط — لا يمكن الحفظ');
});

// ===== المرحلة 4: المحاضرات والبوت بالأزرار =====
function botSetup() {
  const { t, tok } = journeySetup();
  t.call('ping'); // الترحيل: جداول وأعمدة جديدة
  let uid = 1;
  const send = (chat, msg) => t.g.onTelegram_({ update_id: uid++, message: Object.assign({ message_id: 500 + uid, chat: { id: chat, type: 'private' } }, typeof msg === 'string' ? { text: msg } : msg) });
  const last = (chat) => [...t.tg].reverse().find(x => x.method === 'sendMessage' && String(x.chat_id) === String(chat));
  const buttons = (chat) => (last(chat).reply_markup.keyboard || []).flat().map(b => b.text);
  return { t, tok, send, last, buttons, B: t.g.BTN };
}

test('المحاضرات: تعديل العنوان والتاريخ والنبي، وحذف المسودة، والمنشورة للأدمن فقط', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  assert.ok(t.call('updateLecture', { lecture_id: 'L1', title: 'قصة سيدنا نوح', date: '2026-11-02', prophet_id: 'noah' }, tok.teacher).ok);
  const l = t.call('lectures', {}, tok.teacher).data.find(x => x.lecture_id === 'L1');
  assert.strictEqual(l.title, 'قصة سيدنا نوح'); assert.strictEqual(l.prophet_id, 'noah'); assert.strictEqual(l.date, '2026-11-02');
  assert.strictEqual(t.call('updateLecture', { lecture_id: 'L1', title: '  ' }, tok.teacher).error, 'اكتبي عنوان المحاضرة');
  assert.strictEqual(t.call('updateLecture', { lecture_id: 'L1', date: 'غدًا' }, tok.teacher).error, 'تاريخ غير صحيح');
  assert.ok(!t.call('updateLecture', { lecture_id: 'L1', title: 'x' }, tok.student).ok, 'student cannot edit');
  t.call('setLectureStatus', { lecture_id: 'L1', status: 'published' }, tok.admin);
  assert.strictEqual(t.call('deleteLecture', { lecture_id: 'L1' }, tok.teacher).error, 'المحاضرة المنشورة تحذفها الأدمن فقط');
  assert.ok(t.call('deleteLecture', { lecture_id: 'L1' }, tok.admin).ok);
  assert.strictEqual(t.call('lectures', {}, tok.admin).data.length, 0);
});

test('صور المحاضرة: إضافة وترتيب وحذف، ولا تلمس محاضرات فصل آخر', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  const a = t.call('addLectureImage', { lecture_id: 'L1', file_id: 'f-a' }, tok.teacher).data;
  const b = t.call('addLectureImage', { lecture_id: 'L1', file_id: 'f-b' }, tok.teacher).data;
  let l = t.call('lectures', {}, tok.teacher).data[0];
  assert.deepStrictEqual(l.images, ['f-a', 'f-b']);
  assert.deepStrictEqual(l.imageItems.map(i => i.image_id), [a, b]);
  assert.ok(!t.call('lectures', {}, tok.student).data.length || !('imageItems' in t.call('lectures', {}, tok.student).data[0]), 'kids get no ids');
  assert.ok(t.call('reorderLectureImages', { lecture_id: 'L1', ids: [b, a] }, tok.teacher).ok);
  assert.deepStrictEqual(t.call('lectures', {}, tok.teacher).data[0].images, ['f-b', 'f-a']);
  assert.strictEqual(t.call('reorderLectureImages', { lecture_id: 'L1', ids: [b, 'Ixx'] }, tok.teacher).error, 'ترتيب غير صحيح');
  assert.ok(t.call('deleteLectureImage', { image_id: a }, tok.teacher).ok);
  assert.deepStrictEqual(t.call('lectures', {}, tok.teacher).data[0].images, ['f-b']);
  t.sheets.Lectures.appendRow(['L9', 'C2', 'فصل آخر', '2026-11-01', 'f9', 1, 'draft', '', 'X', 'x', '']);
  assert.strictEqual(t.call('addLectureImage', { lecture_id: 'L9', file_id: 'f' }, tok.teacher).error, 'المحاضرة غير موجودة');
});

test('تعديل اسم الطفل وصورته الرمزية', () => {
  const { t, tok } = journeySetup();
  assert.ok(t.call('updateStudent', { user_id: 'S1', name: 'يوسف أحمد', avatar: '🚀' }, tok.teacher).ok);
  const u = t.g.rows_('Users').find(x => x.user_id === 'S1');
  assert.strictEqual(u.name, 'يوسف أحمد'); assert.strictEqual(u.avatar, '🚀');
  assert.strictEqual(t.call('updateStudent', { user_id: 'T1', name: 'x' }, tok.teacher).error, 'الطالب غير موجود', 'cannot rename staff');
  assert.strictEqual(t.call('updateStudent', { user_id: 'S1', name: ' ' }, tok.teacher).error, 'اكتبي اسم الطفل');
});

test('البوت: كود الفصل لم يعد يربط الحساب (ثغرة)، والربط من الموقع بضغطة Start', () => {
  const { t, tok, send, last, buttons } = botSetup();
  send(77, '/start SERAH1');
  assert.ok(!t.g.rows_('Users').some(u => String(u.telegram_id) === '77'), 'class code must not link');
  assert.deepStrictEqual(buttons(77), ['الفصل الأول']);
  const url = t.call('tgLinkToken', {}, tok.teacher).data.url;
  assert.match(url, /^https:\/\/t\.me\/Serah_2026_bot\?start=[a-f0-9]{24}$/);
  send(77, '/start ' + url.split('=')[1]);
  assert.strictEqual(String(t.g.rows_('Users').find(u => u.user_id === 'T2').telegram_id), '77');
  assert.match(last(77).text, /أهلًا وسهلًا بكِ معلمة ثانية/);
  // الرمز لمرة واحدة
  send(78, '/start ' + url.split('=')[1]);
  assert.ok(!t.g.rows_('Users').some(u => String(u.telegram_id) === '78'));
  assert.ok(!t.call('tgLinkToken', {}, tok.student).ok, 'students cannot link');
});

test('البوت: الربط بالأزرار — الفصل ثم الاسم ثم الرمز بلوحة أرقام تُحذف أرقامها، ومنع التخمين', () => {
  const { t, send, last, buttons, B } = botSetup();
  send(55, 'مرحبا');
  assert.deepStrictEqual(buttons(55), ['الفصل الأول']);
  send(55, 'الفصل الأول');
  assert.deepStrictEqual(buttons(55).sort(), ['المعلمة', 'معلمة ثانية'].sort());
  send(55, 'المعلمة');
  assert.ok(buttons(55).includes('5') && buttons(55).includes(B.OK));
  for (const d of '000000') send(55, d);
  const deleted = t.tg.filter(x => x.method === 'deleteMessage' && x.chat_id === 55).length;
  assert.strictEqual(deleted, 6, 'every digit deleted from chat');
  assert.match([...t.tg].reverse().find(x => x.method === 'editMessageText').text, /●●●●●●/);
  send(55, B.OK);
  assert.match(last(55).text, /الرمز غير صحيح/);
  for (const d of '482615') send(55, d);
  send(55, B.OK);
  assert.strictEqual(String(t.g.rows_('Users').find(u => u.user_id === 'T1').telegram_id), '55');
  assert.ok(buttons(55).includes(B.NEW) && buttons(55).includes(B.JOURNEY), 'admin menu');
});

test('البوت: محاضرة كاملة بالأزرار — صوت، نبي، عنوان مقترح، صور، ملخص، إرسال، وإشعار الأدمن', () => {
  const { t, tok, send, last, buttons, B } = botSetup();
  t.call('seedProphets', { list: SEED }, tok.admin);
  send(1, '/start ' + t.call('tgLinkToken', {}, tok.admin).data.url.split('=')[1]);   // الأدمن للإشعار
  send(2, '/start ' + t.call('tgLinkToken', {}, tok.teacher).data.url.split('=')[1]); // المعلمة
  send(2, B.NEW);
  assert.deepStrictEqual(buttons(2), [B.CANCEL]);
  send(2, { voice: { file_id: 'v1', duration: 600, file_size: 1000 } });
  assert.deepStrictEqual(buttons(2), ['آدم', 'نوح', 'يوسف', B.OTHER, B.CANCEL]);
  send(2, 'نوح');
  assert.match(last(2).text, /«قصة سيدنا نوح»/);
  send(2, B.USE);
  send(2, { photo: [{ file_id: 'p-small' }, { file_id: 'p1' }] });
  send(2, { photo: [{ file_id: 'p2' }] });
  send(2, B.DONE_IMG);
  assert.match(last(2).text, /العنوان: قصة سيدنا نوح\nعن: نوح\nالصور: 2\nالمدة: 10 دقيقة/);
  send(2, B.SEND);
  const l = t.g.rows_('Lectures').find(x => x.title === 'قصة سيدنا نوح');
  assert.ok(l && l.status === 'draft' && l.prophet_id === 'noah' && l.created_by === 'T2' && l.class_id === 'C1');
  assert.strictEqual(t.g.rows_('LectureImages').filter(i => i.lecture_id === l.lecture_id).length, 2);
  const note = last(1);
  assert.match(note.text, /محاضرة جديدة بانتظار مراجعتكِ الكريمة/);
  assert.strictEqual(note.reply_markup.inline_keyboard[0][0].url, 'https://mrvoroo.github.io/Serah/teacher/lectures/');
  assert.ok(buttons(2).includes(B.NEW), 'back to main menu');
  send(2, B.MINE);
  assert.match(last(2).text, /📝 مسودة — قصة سيدنا نوح/);
});

test('البوت: «موضوع آخر» بعنوان مكتوب، والإلغاء يحذف صور المحاضرة غير المرسلة', () => {
  const { t, tok, send, last, B } = botSetup();
  send(2, '/start ' + t.call('tgLinkToken', {}, tok.teacher).data.url.split('=')[1]);
  send(2, { audio: { file_id: 'a1', duration: 60 } });
  send(2, B.OTHER);
  send(2, 'أذكار الصباح');
  send(2, { photo: [{ file_id: 'p1' }] });
  const before = t.g.rows_('LectureImages').length;
  send(2, B.CANCEL);
  assert.match(last(2).text, /تم الإلغاء/);
  assert.strictEqual(t.g.rows_('LectureImages').length, before - 1, 'orphan image removed');
  assert.ok(!t.g.rows_('Lectures').some(l => l.title === 'أذكار الصباح'));
  // ملف أكبر من 20 ميجا → رابط صفحة الرفع
  send(2, { voice: { file_id: 'big', file_size: 30 * 1024 * 1024 } });
  assert.match(last(2).text, /teacher\/login\/\?next=upload/);
});

test('البوت: الأدمن ترفع محتوى صفحة النبي (صوت، صورة، يوتيوب، نص) غير معتمد', () => {
  const { t, tok, send, last, buttons, B } = botSetup();
  t.call('seedProphets', { list: SEED }, tok.admin);
  send(1, '/start ' + t.call('tgLinkToken', {}, tok.admin).data.url.split('=')[1]);
  send(1, B.JOURNEY);
  assert.deepStrictEqual(buttons(1), ['آدم', 'نوح', 'يوسف', B.CANCEL]);
  send(1, 'يوسف');
  send(1, { voice: { file_id: 'v', duration: 5 } });
  send(1, { photo: [{ file_id: 'p' }], caption: 'رؤيا يوسف' });
  send(1, 'شاهدوا https://youtu.be/dQw4w9WgXcQ');
  send(1, 'قصة جميلة عن الصبر');
  send(1, B.DONE);
  assert.match(last(1).text, /حُفظ 4 عنصر/);
  const items = t.call('prophet', { id: 'yusuf', preview: true }, tok.admin).data.items;
  assert.deepStrictEqual(items.map(i => i.kind), ['audio', 'image', 'youtube', 'text']);
  assert.strictEqual(items[2].url, 'dQw4w9WgXcQ');
  assert.ok(items.every(i => !i.approved));
  assert.strictEqual(t.call('prophet', { id: 'yusuf' }, tok.student).data.items.length, 0);
  // المعلمة العادية لا ترى زر محتوى الرحلة ولا تصل له
  send(2, '/start ' + t.call('tgLinkToken', {}, tok.teacher).data.url.split('=')[1]);
  assert.ok(!buttons(2).includes(B.JOURNEY));
  send(2, B.JOURNEY);
  assert.match(last(2).text, /تفضّلي بالاختيار من الأزرار/);
});

// ===== إصلاحات بعد تجربة م. أحمد =====
test('إدارة المعلمات: الأدمن تضيف وتعدّل وتعطّل وتحذف معلمات فصلها فقط', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  const add = t.call('addTeacher', { name: 'د. سارة', pin: '135790', role: 'admin' }, tok.admin);
  assert.ok(add.ok, JSON.stringify(add));
  const sara = t.g.rows_('Users').find(u => u.user_id === add.data.user_id);
  assert.strictEqual(sara.role, 'teacher', 'admin cannot create admins'); assert.strictEqual(sara.class_id, 'C1');
  assert.ok(t.login({ name: 'د. سارة', pin: '135790' }));
  assert.strictEqual(t.call('addTeacher', { name: 'د. سارة', pin: '135790' }, tok.admin).error, 'يوجد حساب بنفس الاسم، اختاري اسمًا آخر');
  assert.strictEqual(t.call('addTeacher', { name: 'أ. منى', pin: '123' }, tok.admin).error, 'رمز المعلمة 6 أرقام على الأقل');
  const list = t.call('staff', {}, tok.admin).data;
  assert.ok(list.some(u => u.name === 'د. سارة') && list.every(u => u.class_id === 'C1'));
  assert.ok(t.call('updateTeacher', { user_id: sara.user_id, name: 'د. سارة علي', pin: '246802' }, tok.admin).ok);
  assert.ok(t.login({ name: 'د. سارة علي', pin: '246802' }));
  assert.ok(t.call('updateTeacher', { user_id: sara.user_id, active: false }, tok.admin).ok);
  assert.ok(!t.call('login', { name: 'د. سارة علي', pin: '246802' }).ok, 'inactive cannot log in');
  assert.strictEqual(t.call('updateTeacher', { user_id: sara.user_id, role: 'admin' }, tok.admin).error, 'تغيير الدور للمطوّر فقط');
  assert.strictEqual(t.call('updateTeacher', { user_id: 'T1', name: 'x' }, tok.admin).error, 'لا يمكن تنفيذ هذا على حسابك');
  assert.ok(!t.call('addTeacher', { name: 'x', pin: '123456' }, tok.teacher).ok, 'teacher cannot add');
  assert.ok(t.call('deleteTeacher', { user_id: sara.user_id }, tok.admin).ok);
  assert.ok(!t.g.rows_('Users').some(u => u.user_id === sara.user_id));
});

test('إدارة المعلمات: المطوّر يدير الأدمن ويغيّر الأدوار، والأدمن لا تلمس أدمن أخرى', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  const id = t.call('addTeacher', { name: 'أ. هدى', pin: '111222', role: 'admin', class_id: 'C1' }, tok.superadmin).data.user_id;
  assert.strictEqual(t.g.rows_('Users').find(u => u.user_id === id).role, 'admin');
  assert.strictEqual(t.call('updateTeacher', { user_id: id, active: false }, tok.admin).error, 'ليس لديك صلاحية على هذا الحساب');
  assert.strictEqual(t.call('deleteTeacher', { user_id: id }, tok.admin).error, 'ليس لديك صلاحية على هذا الحساب');
  assert.ok(t.call('updateTeacher', { user_id: id, role: 'teacher' }, tok.superadmin).ok);
  assert.ok(t.call('updateTeacher', { user_id: id, active: false }, tok.admin).ok, 'now a teacher in her class');
  assert.ok(t.call('staff', {}, tok.superadmin).ok);
  assert.ok(!t.call('addTeacher', { name: 'y', pin: '123456' }, t.call('viewAs', { user_id: 'T1' }, tok.superadmin).data.token).ok, 'view-as cannot write');
});

test('الرفع من الموقع: Origin لدرايف هو أصل الصفحة بدون /Serah حتى لا يرفض المتصفح الرفع', () => {
  const { t, tok } = journeySetup();
  t.props.SITE_ORIGIN = 'https://mrvoroo.github.io/Serah';
  const origin = () => t.fetches.filter(f => /upload\/drive/.test(f.url)).pop().opts.headers.Origin;
  assert.ok(t.call('startUpload', { name: 'a.jpg', mime: 'image/jpeg', kind: 'image', origin: 'https://mrvoroo.github.io' }, tok.admin).ok);
  assert.strictEqual(origin(), 'https://mrvoroo.github.io');
  t.call('startUpload', { name: 'a.jpg', kind: 'image', origin: 'http://localhost:3123' }, tok.admin);
  assert.strictEqual(origin(), 'http://localhost:3123');
  t.call('startUpload', { name: 'a.jpg', kind: 'image', origin: 'https://evil.example' }, tok.admin);
  assert.strictEqual(origin(), 'https://mrvoroo.github.io', 'unknown origins fall back to the site');
  t.call('startUpload', { name: 'a.jpg', kind: 'image' }, tok.admin);
  assert.strictEqual(origin(), 'https://mrvoroo.github.io');
});

test('البوت: الرسالة الصوتية (Ogg) تُحفظ WebM ليشغّلها آيفون، والصور image/jpeg', () => {
  const { t, tok, send, B } = botSetup();
  send(2, '/start ' + t.call('tgLinkToken', {}, tok.teacher).data.url.split('=')[1]);
  send(2, { voice: { file_id: 'v1', duration: 30 } });
  assert.strictEqual(t.saved.at(-1).type, 'audio/webm');
  assert.match(t.saved.at(-1).name, /\.webm$/);
  assert.ok(t.saved.at(-1).size > 30000, 'whole recording kept');
  send(2, 'نوح'); send(2, B.USE);
  send(2, { photo: [{ file_id: 'p1' }] });
  assert.strictEqual(t.saved.at(-1).type, 'image/jpeg');
});

test('البوت: زر «القائمة» بالأوامر، والأوامر تعمل مثل الأزرار، ورابط المراجعة صحيح مع SITE_ORIGIN بمسار', () => {
  const { t, tok, send, last, buttons, B } = botSetup();
  t.props.SITE_ORIGIN = 'https://mrvoroo.github.io/Serah';
  send(1, '/start ' + t.call('tgLinkToken', {}, tok.admin).data.url.split('=')[1]);
  assert.ok(t.tg.some(x => x.method === 'setMyCommands' && x.commands.some(c => c.command === 'new')));
  assert.ok(t.tg.some(x => x.method === 'setChatMenuButton'));
  send(1, '/menu');
  assert.ok(buttons(1).includes(B.NEW), 'menu shows the buttons again');
  send(1, '/new');
  assert.match(last(1).text, /تفضّلي بإرسال تسجيل المحاضرة/);
  send(1, '/cancel');
  assert.match(last(1).text, /تم الإلغاء/);
  send(2, '/start ' + t.call('tgLinkToken', {}, tok.teacher).data.url.split('=')[1]);
  send(2, { voice: { file_id: 'v', duration: 60 } }); send(2, 'نوح'); send(2, B.USE); send(2, B.NO_IMG); send(2, B.SEND);
  assert.strictEqual(last(1).reply_markup.inline_keyboard[0][0].url, 'https://mrvoroo.github.io/Serah/teacher/lectures/');
});

// يقرأ ملف WebM: يتأكد من الترويسة، الترميز، المدة، وعدد الحزم = حزم Ogg
function readWebm(u8) {
  const out = { ids: [], blocks: 0 };
  const vint = (i) => { let len = 1, m = 0x80; while (!(u8[i] & m)) { m >>= 1; len++; } let v = u8[i] & (m - 1); for (let k = 1; k < len; k++) v = v * 256 + u8[i + k]; return [v, len]; };
  const id = (i) => { let len = 1, m = 0x80; while (!(u8[i] & m)) { m >>= 1; len++; } let v = 0; for (let k = 0; k < len; k++) v = v * 256 + u8[i + k]; return [v, len]; };
  const MASTER = new Set([0x18538067, 0x1654AE6B, 0xAE, 0xE1, 0x1C53BB6B, 0xBB, 0xB7, 0x1F43B675, 0x1549A966, 0x1A45DFA3]);
  const walk = (start, end) => {
    let i = start;
    while (i < end) {
      const [eid, il] = id(i); const [size, sl] = vint(i + il); const body = i + il + sl;
      out.ids.push(eid);
      if (eid === 0x86) out.codec = Buffer.from(u8.subarray(body, body + size)).toString();
      if (eid === 0x4489) out.duration = new DataView(u8.buffer, u8.byteOffset + body, 8).getFloat64(0);
      if (eid === 0xA3) out.blocks++;
      if (MASTER.has(eid)) walk(body, body + size);
      i = body + size;
    }
    if (i !== end) throw new Error('bad element sizes');
  };
  walk(0, u8.length);
  return out;
}

test('تحويل Ogg/Opus إلى WebM/Opus: ملف سليم بنفس الصوت والمدة', () => {
  const t = boot();
  const webm = t.g.oggOpusToWebm_(new Uint8Array(VOICE));
  const w = readWebm(webm);
  assert.strictEqual(w.ids[0], 0x1A45DFA3, 'EBML header');
  assert.strictEqual(w.codec, 'A_OPUS');
  assert.ok(Math.abs(w.duration - 3000) < 60, 'duration ~3s: ' + w.duration);
  assert.ok(w.ids.includes(0x1C53BB6B), 'has cues for seeking');
  assert.ok(w.blocks > 100, 'all opus packets: ' + w.blocks);
  assert.throws(() => t.g.oggOpusToWebm_(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28])), /ليس ملف Ogg/);
});

test('مفتاح تشغيل الصوت يصل للمستخدم المسجل فقط', () => {
  const { t, tok } = journeySetup();
  t.props.DRIVE_API_KEY = 'AIza-test';
  assert.strictEqual(t.call('config', {}, tok.student).data.driveKey, 'AIza-test');
  assert.ok(!t.call('config', {}).ok, 'needs login');
});

test('التشغيل المضمون: الخلفية ترسل التسجيل على أجزاء، ويتجمّع مطابقًا للملف تمامًا', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  const r = t.call('audioChunk', { id: 'f1', start: 0 }, tok.teacher);
  assert.ok(r.ok, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(r.data.total, VOICE.length);
  assert.strictEqual(r.data.type, 'audio/webm');
  assert.ok(Buffer.from(r.data.data, 'base64').equals(VOICE), 'bytes identical');
  const mid = t.call('audioChunk', { id: 'f1', start: 1000 }, tok.teacher).data;
  assert.ok(Buffer.from(mid.data, 'base64').equals(VOICE.subarray(1000)), 'range from offset');
  assert.strictEqual(t.call('audioChunk', { id: 'f1', start: VOICE.length }, tok.teacher).data.data, '', 'past the end');
});

test('التشغيل المضمون: لا يقرأ إلا ملفات المنصة المسموحة (لا ملفات درايف عشوائية)', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  assert.strictEqual(t.call('audioChunk', { id: 'some-private-drive-file' }, tok.admin).error, 'التسجيل غير متاح');
  assert.strictEqual(t.call('audioChunk', { id: 'f1' }, tok.student).error, 'التسجيل غير متاح', 'kids: drafts are hidden');
  t.call('setLectureStatus', { lecture_id: 'L1', status: 'published' }, tok.admin);
  assert.ok(t.call('audioChunk', { id: 'f1' }, tok.student).ok, 'kids hear published lectures');
  t.sheets.Lectures.appendRow(['L9', 'C2', 'فصل آخر', '2026-11-01', 'f9', 1, 'published', '', 'X', 'x', '']);
  assert.strictEqual(t.call('audioChunk', { id: 'f9' }, tok.student).error, 'التسجيل غير متاح', 'other class');
  assert.ok(!t.call('audioChunk', { id: 'f1' }).ok, 'needs login');
  // صوت صفحة النبي: المعتمد فقط للأطفال
  t.call('seedProphets', { list: SEED }, tok.admin);
  const c = t.call('saveContent', { prophet_id: 'noah', kind: 'audio', file_id: 'pa1' }, tok.admin).data;
  assert.strictEqual(t.call('audioChunk', { id: 'pa1' }, tok.student).error, 'التسجيل غير متاح');
  t.call('setContentFlags', { item_id: c, approved: true }, tok.admin);
  assert.ok(t.call('audioChunk', { id: 'pa1' }, tok.student).ok);
});

test('فحص الصوت للمطوّر فقط', () => {
  const { t, tok } = journeySetup();
  t.call('ping');
  assert.ok(!t.call('audioCheck', {}, tok.admin).ok);
  const r = t.call('audioCheck', {}, tok.superadmin);
  assert.ok(r.ok && Array.isArray(r.data), JSON.stringify(r).slice(0, 200));
});

for (const [name, fn] of tests) {
  try { fn(); console.log('✔', name); } catch (e) { failed++; console.log('✘', name, '\n   ', e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);

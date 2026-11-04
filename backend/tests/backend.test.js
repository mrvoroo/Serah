// اختبارات الخلفية على جدول وهمي (بدون جوجل): node backend/tests/backend.test.js
// يشغّل Code.gs كما هو داخل Node مع بدائل لـ SpreadsheetApp و PropertiesService وغيرها.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert');
const code = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');

function boot() {
  const sheets = {};
  const props = { PIN_SALT: 'salt', HMAC_KEY: 'hmac', SHEET_ID: 'x', BOT_TOKEN: 'set' };
  const cache = {};
  let slept = 0;
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
      newBlob: (b) => ({ getDataAsString: () => Buffer.from(b).toString() }),
      formatDate: (d) => d.toISOString().slice(0, 10),
      sleep: (ms) => { slept += ms; }
    },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 1 } },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [{ getHandlerFunction: () => 'pollTelegram' }], getOAuthToken: () => 't', getService: () => ({ getUrl: () => 'u' }) },
    UrlFetchApp: { fetch: () => ({ getContentText: () => JSON.stringify({ ok: true, result: { url: 'https://relay.example.workers.dev/hook?x', pending_update_count: 0 } }) }) },
    DriveApp: {}, Logger: { log() {} }, console: { error() {}, log() {} }
  };
  const g = new Function(...Object.keys(env), code + '\nreturn { handle_, createSuperAdmin, ensureSheet_, rows_, SCHEMA, hashPin_, VERSION };')(...Object.values(env));
  return { g, sheets, props, mkSheet, slept: () => slept };
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
for (const [name, fn] of tests) {
  try { fn(); console.log('✔', name); } catch (e) { failed++; console.log('✘', name, '\n   ', e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);

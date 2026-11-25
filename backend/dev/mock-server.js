// خادم تجريبي محلي: يشغّل backend/Code.gs كما هو داخل Node (جداول في الذاكرة) ببيانات تجريبية جاهزة،
// حتى تُجرَّب المنصة على localhost قبل النشر. لا يتصل بجوجل ولا بالشيت الحقيقي، وكل شيء يُمسح عند إيقافه.
// التشغيل: node backend/dev/mock-server.js  (المنفذ 3124) — والموقع: NEXT_PUBLIC_API_URL=http://localhost:3124/exec
const fs = require('fs'), path = require('path'), crypto = require('crypto'), http = require('http');
const code = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const PORT = Number(process.env.MOCK_PORT || 3124);

function boot() {
  const sheets = {}, props = { PIN_SALT: 'demo-salt', HMAC_KEY: 'demo-hmac', SHEET_ID: 'demo', FOLDER_audio: 'fa', FOLDER_images: 'fi' }, cache = {};
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
      setFrozenRows() {}, appendRow: (row) => data.push(row.slice()), deleteRow: (i) => { data.splice(i - 1, 1); },
      getDataRange: () => ({ getValues: () => { const w = sh.getLastColumn(); return data.map(r => Array.from({ length: w }, (_, i) => r[i] ?? '')); } })
    };
    return (sheets[name] = sh);
  }
  const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: mkSheet, getId: () => 'demo', getSheets: () => Object.values(sheets) };
  const signed = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
  // ملفات التلاوة في الذاكرة (تُسمع عبر audioChunk كأنها على درايف)
  const files = {}; let fileN = 0;
  const env = {
    SpreadsheetApp: { openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, setProperties: (o) => { Object.keys(o).forEach(k => { props[k] = String(o[k]); }); }, deleteProperty: (k) => { delete props[k]; } }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 1 },
      computeDigest: (_, s) => signed(crypto.createHash('sha256').update(s).digest()),
      computeHmacSha256Signature: (s, k) => { const b = (x) => (Array.isArray(x) ? Buffer.from(Uint8Array.from(x, (v) => v & 255)) : x); return signed(crypto.createHmac('sha256', b(k)).update(b(s)).digest()); },
      base64EncodeWebSafe: (x) => Buffer.from(typeof x === 'string' ? x : Uint8Array.from(x.map(b => b & 255))).toString('base64url'),
      base64DecodeWebSafe: (s) => [...Buffer.from(s, 'base64url')],
      base64Encode: (x) => Buffer.from(Uint8Array.from(x, (b) => b & 255)).toString('base64'),
      base64Decode: (s) => signed(Buffer.from(s, 'base64')),
      newBlob: (b, type, name) => ({ getDataAsString: () => Buffer.from(b).toString(), getContentType: () => type, getBytes: () => b, setName() { return this; }, _b: b, _t: type }),
      formatDate: (d) => d.toISOString().slice(0, 10), sleep() {}
    },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }), MimeType: { JSON: 1 } },
    CacheService: { getScriptCache: () => ({ get: (k) => { const e = cache[k]; if (!e) return null; if (e.t < Date.now()) { delete cache[k]; return null; } return e.v; }, put: (k, v, sec) => { cache[k] = { v: String(v), t: Date.now() + (sec || 600) * 1000 }; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create() {} }), onWeekDay: () => ({ atHour: () => ({ create() {} }) }) }) }), WeekDay: {}, getOAuthToken: () => 't', getService: () => ({ getUrl: () => 'u' }), deleteTrigger() {} },
    // لا اتصالات خارجية: الإشعارات والرفع ترجع نجاحًا وهميًا
    UrlFetchApp: { fetchAll: (reqs) => reqs.map(() => ({ getResponseCode: () => 201 })), fetch: (url, opts) => {
      const m = /drive\/v3\/files\/([^?]+)/.exec(String(url)), f = m && files[decodeURIComponent(m[1])];
      if (f) {
        const [, a, b] = /bytes=(\d+)-(\d+)/.exec((opts && opts.headers && opts.headers.Range) || 'bytes=0-0');
        if (Number(a) >= f.bytes.length) return { getResponseCode: () => 416, getHeaders: () => ({}), getContent: () => [] };
        const part = f.bytes.slice(Number(a), Math.min(Number(b) + 1, f.bytes.length));
        return { getResponseCode: () => 206, getHeaders: () => ({ 'Content-Type': f.mime, 'Content-Range': 'bytes ' + a + '-' + (Number(a) + part.length - 1) + '/' + f.bytes.length }), getContent: () => part };
      }
      return { getResponseCode: () => 500, getHeaders: () => ({}), getContentText: () => '{"ok":false}' };
    } },
    DriveApp: { getFileById: (id) => ({ setSharing() {}, setTrashed() { delete files[id]; }, getMimeType: () => (files[id] ? files[id].mime : 'image/png'), getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, { getId: () => (files[id] ? 'fa' : 'fi') }) }; } }),
      getFolderById: () => ({ createFile: (blob) => { const id = 'rec' + (++fileN); files[id] = { bytes: blob._b, mime: blob._t }; return { getId: () => id }; } }), Access: {}, Permission: {} },
    Logger: { log() {} }, console: { error() {}, log() {} }
  };
  const g = new Function(...Object.keys(env), code + '\nreturn { handle_, append_, rows_, hashPin_, ensureSheet_, normName_, SCHEMA };')(...Object.values(env));
  return { g, props };
}

// ===== البيانات التجريبية =====
const { g } = boot();
Object.keys(g.SCHEMA).forEach(g.ensureSheet_);
const now = new Date().toISOString();
const day = (n) => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
const ACC = {
  dev: { id: 'DEV1', role: 'superadmin', name: 'مطور تجريبي', pin: '920417', cls: 'C1' },
  admin: { id: 'ADM1', role: 'admin', name: 'أدمن تجريبية', pin: '730581', cls: 'C1' },
  teacher: { id: 'TCH1', role: 'teacher', name: 'معلمة تجريبية', pin: '648203', cls: 'C2' },
  zaid: { id: 'KID1', role: 'student', name: 'زيد', pin: '4826', cls: 'C1', gender: 'm', avatar: '3d:rocket' },
  habiba: { id: 'KID2', role: 'student', name: 'حبيبة', pin: '7351', cls: 'C1', gender: 'f', avatar: '3d:sparkles' },
  omar: { id: 'KID3', role: 'student', name: 'عمر', pin: '9264', cls: 'C2', gender: 'm', avatar: '3d:star' },
  parent: { id: 'PAR1', role: 'parent', name: 'أم زيد', pin: '582914', cls: '', gender: 'f', avatar: 'mother' }
};
g.append_('Classes', { class_id: 'C1', name: 'فصل البراعم', teacher_id: 'ADM1', join_code: 'DEMO1', created_at: now });
g.append_('Classes', { class_id: 'C2', name: 'فصل النور', teacher_id: 'TCH1', join_code: 'DEMO2', created_at: now });
Object.values(ACC).forEach(a => g.append_('Users', { user_id: a.id, role: a.role, name: a.name, class_id: a.cls, avatar: a.avatar || '', pin_hash: g.hashPin_(a.pin),
  city: '', country: '', telegram_id: '', active: true, created_at: day(-10), last_login_at: '', gender: a.gender || '' }));
g.append_('ParentLinks', { key: 'PAR1:KID1', parent_id: 'PAR1', kid_id: 'KID1', created_at: now, created_by: 'ADM1' });
g.append_('ParentLinks', { key: 'PAR1:KID2', parent_id: 'PAR1', kid_id: 'KID2', created_at: now, created_by: 'ADM1' });
// أول ٦ أنبياء ظاهرون في الرحلة (المستوى الثالث من ألعاب الأنبياء يحتاج ٧ فيبقى مقفولًا للتجربة)
[['adam', 'آدم'], ['idris', 'إدريس'], ['noah', 'نوح'], ['hud', 'هود'], ['salih', 'صالح'], ['ibrahim', 'إبراهيم'], ['lut', 'لوط'], ['ismail', 'إسماعيل']]
  .forEach(([id, name], i) => g.append_('Prophets', { prophet_id: id, sort: i, name, title: '', tag: '', text: '', symbol: '', symbol_name: '', visible: i < 6, updated_at: now }));
g.append_('Lectures', { lecture_id: 'L1', class_id: 'C1', title: 'قصة سيدنا نوح عليه السلام', date: day(-3), audio_file_id: '', duration_sec: 600, status: 'published', notes: '', created_by: 'ADM1', created_at: day(-3), prophet_id: 'noah' });
g.append_('Lectures', { lecture_id: 'L2', class_id: 'C1', title: 'قصة سيدنا هود عليه السلام', date: day(-1), audio_file_id: '', duration_sec: 540, status: 'published', notes: '', created_by: 'ADM1', created_at: day(-1), prophet_id: 'hud' });
g.append_('Attendance', { lecture_id: 'L1', user_id: 'KID1', at: day(-2) });
[['KID1', 25, 'حضور محاضرة'], ['KID2', 18, 'حضور محاضرة'], ['KID3', 12, 'حضور محاضرة']].forEach(([u, p, r]) => g.append_('Points', { user_id: u, points: p, reason: r, at: now }));
g.append_('StarLog', { key: 'su:KID1:سوره الفاتحه', user_id: 'KID1', kind: 'surah', ref: 'سورة الفاتحة', stars: 10, at: day(-4), by: 'ADM1' });
[-1, -2, -3].forEach(n => g.append_('PrayerLog', { key: 'KID1:' + day(n).replace(/-/g, ''), user_id: 'KID1', day: Number(day(n).replace(/-/g, '')), prayers: n === -1 ? 'fajr,dhuhr,asr' : 'fajr,dhuhr,asr,maghrib,isha', updated_at: now }));
// أذكار مفتوحة لفصل البراعم فقط (فصل النور بلا أذكار لتجربة الحالة الفاضية)
g.append_('AzkarRelease', { zikr_id: 'falaq', classes: 'C1', note: '', file_id: '', file_kind: '', file_name: '', released_at: day(-7), updated_by: 'ADM1', updated_at: now });
g.append_('AzkarRelease', { zikr_id: 'ikhlas', classes: 'C1', note: 'نحفظها هذا الأسبوع إن شاء الله ونقولها ٣ مرات', file_id: '', file_kind: '', file_name: '', released_at: day(-1), updated_by: 'ADM1', updated_at: now });

// ===== الأفكار الثمانية =====
const dn = (n) => Number(day(n).replace(/-/g, ''));
const rel = (sheet, id, cls, note, n) => g.append_(sheet, { zikr_id: id, classes: cls, note: note || '', file_id: '', file_kind: '', file_name: '', released_at: day(n), updated_by: 'ADM1', updated_at: now });
rel('DuaRelease', 'eat-before', 'C1', 'نقولها قبل كل أكلة هذا الأسبوع', -3); rel('DuaRelease', 'sleep', 'C1', '', -2); rel('DuaRelease', 'leave-home', 'C1', '', -1);
rel('HadithRelease', 'kalima', 'C1', 'نحفظه ونسمّعه يوم الخميس', -2); rel('HadithRelease', 'niyyah', 'C1', '', -1);
g.append_('StarLog', { key: 'hd:KID1:' + g.normName_('الكلمة الطيبة صدقة'), user_id: 'KID1', kind: 'hadith', ref: 'الكلمة الطيبة صدقة', stars: 2, at: day(-1), by: 'ADM1' });
// حديقة زيد: الناس مؤكدة (شهادة)، والفلق شجرة، والإخلاص نبتة
g.append_('StarLog', { key: 'su:KID1:' + g.normName_('سورة الناس'), user_id: 'KID1', kind: 'surah', ref: 'سورة الناس', stars: 10, at: day(-2), by: 'ADM1' });
[[114, 9, 'ADM1'], [113, 7, ''], [112, 2, ''], [111, 4, '']].forEach(([n, r, by]) => g.append_('Garden', { key: 'KID1:' + n, user_id: 'KID1', surah: n, reviews: r, last_day: dn(-1), confirmed_by: by, confirmed_at: by ? day(-2) : '' }));
// حبيبة أكملت المرحلة الأولى من الرحلة (حضرت محاضرة لكل نبي من آدم إلى صالح) ← شهادة مرحلة
[['L3', 'adam', 'آدم'], ['L4', 'idris', 'إدريس'], ['L5', 'salih', 'صالح']].forEach(([id, pid, n], i) => g.append_('Lectures', { lecture_id: id, class_id: 'C1', title: 'قصة سيدنا ' + n + ' عليه السلام', date: day(-6 + i), audio_file_id: '', duration_sec: 500, status: 'published', notes: '', created_by: 'ADM1', created_at: day(-6 + i), prophet_id: pid }));
['L1', 'L2', 'L3', 'L4', 'L5'].forEach((l, i) => g.append_('Attendance', { lecture_id: l, user_id: 'KID2', at: day(-5 + i) }));
// تحدي رمضاني لفصل البراعم (قرب الهدف: ١٢ من ٢٠)
g.append_('Challenges', { ch_id: 'CH1', class_id: 'C1', title: 'ختمة الفصل الصغيرة', season: 'ramadan', unit: 'صفحة', goal: 20, starts: dn(-3), ends: dn(10), active: true, created_by: 'ADM1', created_at: now });
g.append_('ChallengeLog', { key: 'CH1:KID2:' + dn(-1), ch_id: 'CH1', user_id: 'KID2', day: dn(-1), count: 7, at: now });
g.append_('ChallengeLog', { key: 'CH1:KID1:' + dn(-2), ch_id: 'CH1', user_id: 'KID1', day: dn(-2), count: 5, at: now });
// ملصقات أعمال صالحة من أم زيد
[['birr', -1, 'قبّل يد جدته'], ['help', -2, ''], ['sadaqa', -4, 'أعطى من مصروفه']].forEach(([d, n, note], i) => g.append_('FamilyDeeds', { deed_id: 'D' + i, parent_id: 'PAR1', kid_id: 'KID1', deed: d, note, day: dn(n), stars: 1, at: day(n) }));

// كود ولي أمر جديد (لتجربة «حساب جديد بكود») لعمر — يصدره حساب المعلمة كما في المنصة
const login = (name, pin) => JSON.parse(g.handle_('login', { name, pin })).data.token;
const tTok = login(ACC.teacher.name, ACC.teacher.pin);
const fresh = JSON.parse(g.handle_('parentCode', { user_id: 'KID3' }, tTok)).data.code;
const fmt = (c) => c.slice(0, 4) + '-' + c.slice(4);

const md = `# حسابات تجريبية (localhost فقط)

> خادم تجريبي على جهازك (\`backend/dev/mock-server.js\`) — **ليست حسابات حقيقية** ولا تصل للشيت. كل شيء يرجع لأوله عند إعادة تشغيله، والكود الجديد يتغير كل تشغيل.
> الموقع: http://localhost:3123/Serah/

| الحساب | أين يدخل | الاسم / الكود | الرمز |
|---|---|---|---|
| المطوّر | /teacher/login/ | ${ACC.dev.name} | ${ACC.dev.pin} |
| معلمة أدمن (فصل البراعم) | /teacher/login/ | ${ACC.admin.name} | ${ACC.admin.pin} |
| معلمة (فصل النور) | /teacher/login/ | ${ACC.teacher.name} | ${ACC.teacher.pin} |
| طفل: زيد (فصل البراعم) | الصفحة الرئيسية ← كود الفصل **DEMO1** ← زيد | زيد | ${ACC.zaid.pin} |
| طفلة: حبيبة (فصل البراعم) | كود الفصل **DEMO1** ← حبيبة | حبيبة | ${ACC.habiba.pin} |
| طفل: عمر (فصل النور، بلا أذكار مفتوحة) | كود الفصل **DEMO2** ← عمر | عمر | ${ACC.omar.pin} |
| ولي أمر (أم زيد وحبيبة) | /parent/login/ ← دخول | ${ACC.parent.name} | ${ACC.parent.pin} |
| ولي أمر جديد | /parent/login/ ← حساب جديد بكود | الكود: **${fmt(fresh)}** (لعمر) | اختر اسمًا ورمزًا من ٦ أرقام |

ما الموجود للتجربة:
- فصل البراعم: ذكرا «الفلق» و«الإخلاص» مفتوحان (الإخلاص «ذكر الأسبوع» بملاحظة)، ومحاضرتان منشورتان، وزيد حضر واحدة وله «سورة الفاتحة» وصلوات آخر ٣ أيام.
- رحلة الأنبياء: ٦ أنبياء ظاهرون، فألعاب الأنبياء: المستوى ١ و٢ متاحان، و٣ مقفول (يحتاج ٧).
- الأفكار الثمانية: ٣ أدعية وحديثان مفتوحة لفصل البراعم، وحديقة زيد (الناس مثمرة وعليها شهادة)، وحبيبة عندها شهادة «المرحلة الأولى» من الرحلة، وتحدي «ختمة الفصل الصغيرة» (١٢ من ٢٠)، و٣ ملصقات أعمال صالحة لزيد.
- تسجيل التلاوة يعمل هنا (الصوت محفوظ في الذاكرة فقط) — يحتاج إذن الميكروفون في المتصفح.
- لا يعمل هنا: رفع الملفات للأذكار/المحاضرات (يحتاج جوجل درايف)، والإشعارات الحقيقية على الجوال.
`;
fs.writeFileSync(path.join(__dirname, 'DEMO-ACCOUNTS.md'), md);

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let out;
    try {
      const p = req.method === 'GET' ? Object.fromEntries(new URL(req.url, 'http://x').searchParams) : JSON.parse(body || '{}');
      out = g.handle_(p.action, p, p.token);
    } catch (e) { out = JSON.stringify({ ok: false, error: String(e.message || e) }); }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(out);
  });
}).listen(PORT, () => console.log(`Mock backend on http://localhost:${PORT}/exec — accounts in backend/dev/DEMO-ACCOUNTS.md`));

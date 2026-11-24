# Azkar + Parents + Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, owner chose to start immediately). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Morning/evening azkar for all roles with per-class release for kids, a parent role with code login, Asma/azkar for teachers, open games with sequential levels, and a stars engine.

**Architecture:** Google Apps Script backend (`backend/Code.gs`), new sheets added via SCHEMA + `migrate_`, actions in `POLICY`/`ACTIONS` via `Object.assign` sections. Next.js static frontend; content JSON in `app/src/content`. Push stays payload-less: new plan kinds `am`/`pm`, texts in the SW texts cache.

**Tech Stack:** Apps Script (V8), Next.js 16, React, Tailwind/shadcn, Playwright, node test harness `backend/tests/backend.test.js`.

**Spec:** `docs/superpowers/specs/2026-11-24-azkar-parents-games-design.md`

## Global Constraints
- Stars: azkar period 2 (once per day per period), game level first completion 2, hadith 2, surah/juz certificate 10 (once per surah per kid).
- Parent code: 8 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, valid 14 days, single use, new code revokes unused old ones; max 4 parents per kid; parent PIN 6 digits.
- Parent RANK = -1; parent may only call actions with `parent: 1` or `roles` containing `parent`.
- Game levels: 3 per game; pass = score ≥ 60; min seconds per level: 8/12/16; prophet games need visible prophets ≥ 3/5/7 per level.
- Push times: am = fajr + 45 min, pm = asr + 45 min; kids only if class has ≥1 released zikr.
- Religious text only from sheikh-reviewed JSON. No secrets in repo. Backend deploy only with owner approval.

## Review Focus
- Double tap / two devices calling `gameDone` or `azkarDone` together → stars awarded once (lock + key check) — tested in Task 2/6.
- Parent token calling a student/teacher action (e.g. `lectures`, `students`) → rejected — tested in Task 3.
- Expired / used / revoked parent code, or code for an inactive kid → rejected with clear Arabic error — Task 3.
- Admin unreleases a zikr after kids read it → kid page hides it; `azkarDone` with nothing released gives no stars — Task 1/2.
- Fewer visible prophets than a level needs → level shows locked hint; `gameStart` rejects — Task 6.

---

### Task 1: Azkar release backend + kid/admin API
**Files:** Modify `backend/Code.gs` (new section «أذكار الصباح والمساء»), `backend/tests/backend.test.js`
**Produces:** sheet `AzkarRelease[zikr_id, classes, note, file_id, file_kind, file_name, released_at, updated_by]`; actions `azkarReleases` (admin: all rows), `saveAzkarRelease {zikr_id, classes[], note, file_id, file_kind, file_name}` (admin, audit, push «new» to newly added classes), `kidAzkar` (student: rows released to my class, sorted by released_at), `azkarDone {period:'am'|'pm', date}` (student).
- [ ] Tests: admin saves release for class A → kid in A sees it, kid in B doesn't; teacher (non-admin) save rejected; invalid zikr_id (not `^[a-z0-9-]{2,40}$`) rejected; classes filtered to existing ids; file_id must be a platform file (`platformFile_`) when given.
- [ ] Implement, run `node.exe backend/tests/backend.test.js` → all pass. Commit.

### Task 2: Stars engine hooks
**Files:** `backend/Code.gs`, tests
**Produces:** `StarLog[key, user_id, kind, ref, stars, at]` (key unique, e.g. `az:<user>:<yyyymmdd>:am`); helper `awardOnce_(key, user_id, stars, reason)` → bool (inside `withLock_`); actions `azkarDone`, `kidAchievement {user_id, kind:'hadith'|'surah', title}` (teacher, same class, audit; surah once per title), `kidAchievements {user_id}`.
- [ ] Tests: azkarDone twice same day → +2 once; no release → error «لم تُفتح أذكار بعد»; date outside ±1 day rejected; surah twice same title → second rejected; hadith adds 2.
- [ ] Implement, run tests, commit.

### Task 3: Parent role backend
**Files:** `backend/Code.gs`, tests
**Produces:** RANK.parent=-1; POLICY flags `parent:1`, `roles`; sheets `ParentCodes`, `ParentLinks`; actions `parentCode {user_id}` (teacher), `parentLinks {user_id}` (teacher), `unlinkParent {user_id, parent_id}` (teacher), `parentRegister {code,name,pin,gender}` (public), `parentLink {code}`, `parentKids`, `parentKid {kid_id}` (parent). `login` returns role parent; `publicUser_` etc. unaffected.
- [ ] Tests: register with valid code → token role parent, linked; reuse code fails; expired fails; new code revokes old; parent calling `lectures`/`students`/`me` rejected; parent calling `prayerLog`, `journey` ok; parentKid for unlinked kid rejected; 5th parent rejected; name collision with teacher rejected.
- [ ] Implement, run tests, commit.

### Task 4: Push kinds am/pm
**Files:** `backend/Code.gs` (PUSH_KINDS, pushTick skip kids w/o release), `app/src/lib/prayer.ts` (`NotifyPrefs.azkar`, `buildPlan(..., opts:{azkar:boolean})`), `app/public/sw.js` (`azkarText`), `notify-card.tsx` (save reminders + who.girl/staff), tests.
- [ ] Test: cleanPlan_ keeps `am`/`pm`; pushTick drops `am` for kid of class without release.
- [ ] Implement, run tests, commit.

### Task 5: Azkar frontend
**Files:** Create `app/src/lib/azkar.ts` (types, `currentPeriod(now, times)`, `forPeriod(z, period)` picks variant text), `components/azkar/azkar-page.tsx` (adults: full/short toggle, period toggle, deck, virtue sheet), `components/azkar/kid-azkar.tsx`, pages `app/teacher/(app)/azkar/page.tsx`, `app/teacher/(app)/azkar-release/page.tsx`, `app/kid/azkar/page.tsx`, `app/parent/azkar/page.tsx`; nav entries; kid home tile.
- [ ] e2e `e2e/azkar.spec.ts`: teacher sees full list & short toggle reduces to 10/11; admin toggles class chip → saved call; kid sees only released + «ذكر الأسبوع»; finishing kid deck calls azkarDone.
- [ ] Implement, run spec on 3 projects, commit.

### Task 6: Games
**Files:** backend section «الألعاب» (`GameProgress`, `games`, `gameStart`, `gameDone`), tests; frontend `lib/games.ts` (level builders, deterministic shuffles), `components/games/*` (match, order, who-am-i shells), `app/kid/games/page.tsx`, `app/kid/games/[game]` via query param page `app/kid/games/play/page.tsx`.
- [ ] Backend tests: level 2 before level 1 → rejected; done without start → rejected; done too fast → rejected; done twice → stars once; prophet game level needing 5 with 3 visible → rejected.
- [ ] e2e `e2e/games.spec.ts`: asma match level 1 playable and completes; level 2 locked until 1 done; prophet games show locked hint when few prophets.
- [ ] Implement, run, commit.

### Task 7: Parents frontend + characters
**Files:** `components/family.tsx` (`Father`, `Mother` SVG with `Mood`), `app/parent/login/page.tsx` (register/login tabs, family scene), `app/parent/(app)/layout.tsx` + shell, `app/parent/(app)/page.tsx` (kids switcher + progress), `prayer`, `quran`, `names`, `azkar` pages reusing components; teacher students page «كود ولي الأمر» dialog + achievements dialog; privacy section; `lib/api.ts` role type.
- [ ] e2e `e2e/parents.spec.ts`: register with code → parent home shows kid; teacher issues code dialog shows code; parent cannot open /teacher/.
- [ ] Implement, run, commit.

### Task 8: Teachers Asma + verification
- [ ] Add `/teacher/names/` reusing `AsmaHusna`; nav.
- [ ] Full touched e2e on desktop/mobile/iphone; build; 3 review agents; fix; commit; ask owner before deploy.

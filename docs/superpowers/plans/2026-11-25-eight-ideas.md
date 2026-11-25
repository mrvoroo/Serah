# Eight Ideas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Daily duas, weekly parent digest, recitation recording, Juz ʿAmma garden, family good-deeds board, seasonal class challenges, certificates, and short hadith memorization.

**Architecture:** Apps Script backend (`backend/Code.gs`), new sheets via SCHEMA + `migrate_`, new sections at the end with `Object.assign(POLICY/ACTIONS)`. Generic per-class release (`DuaRelease`, `HadithRelease`) reusing the azkar release helpers. Static Next.js frontend; reviewed content JSON in `app/src/content`.

**Tech Stack:** Apps Script (V8), Next.js 16, React 19, Tailwind/shadcn, Playwright, node harness `backend/tests/backend.test.js`.

**Spec:** `docs/superpowers/specs/2026-11-25-eight-ideas-design.md`

## Global Constraints
- Stars: dua day 1; recitation reviewed 2 (once per rec); garden confirm 10 (same `su:` key as manual surah); juz 10 once; family deed 1 (≤3/day/kid); challenge goal 5 (once per challenge per contributor); hadith 2 (existing).
- Recitation: mime in `audio/(webm|ogg|mp4|mpeg|aac|wav)`, magic bytes checked, ≤2.5MB decoded, ≤120s, ≤6/day/kid, ≤3 pending; not shared publicly.
- Garden: 1 review per surah per day, ≤40/day; stages 0 / 1–2 / 3–6 / 7+ / confirmed.
- Deeds: fixed ids, ≤10/day/kid, delete same day only by its parent.
- Challenges: ≤3 active per class, goal 10..100000, ≤60 days, kid count 0..20 per day, date within ±1 day of today and inside the range.
- Digest: Friday 16:00 trigger; ≤4 kids per parent; opt-out via `prefs.digest=false`.
- Religious text only from reviewed JSON with refs. No secrets in repo. Backend VERSION bumped, not deployed.

## Review Focus
- Kid uploads a non-audio file renamed `.webm` / huge payload / wrong mime → rejected (Task 3).
- Another class's teacher or an unlinked parent asks `audioChunk` for a recitation → rejected (Task 3).
- Double `confirmSurah` / manual surah + garden confirm → 10 stars once (Task 4).
- Parent spamming deeds → capped at 3 stars/day; parent of another kid → rejected (Task 5).
- Kid logs challenge for a future day or another class's challenge → rejected; goal crossing awards once (Task 6).
- Certificates for an unlinked kid → rejected (Task 7).

---

### Task 1: Generic releases + duas + hadith backend
**Files:** `backend/Code.gs` (section «أدعية اليوم والأحاديث»), tests.
**Produces:** sheets `DuaRelease`, `HadithRelease`; actions `releases {kind}`, `saveRelease {kind, item_id, classes, note, file…}` (admin), `kidReleases {kind}` (student), `duaDone {date}` (student, 1 star/day), `myAchievements` (student). `canHearAudio_` covers dua/hadith audio.
- [ ] Tests: release per class visibility; teacher save rejected; bad kind/id rejected; duaDone once/day, rejected without release; push «new dua» to class.
- [ ] Implement, run tests, commit.

### Task 2: Weekly parent digest
**Files:** `backend/Code.gs`, tests.
**Produces:** `digestFor_(kid, from)`, `weeklyDigest()`, `installDigestTrigger()`, action `parentDigest {kid_id}`; `cleanPrefs_` keeps `digest`.
- [ ] Tests: parentDigest numbers; unlinked kid rejected; weeklyDigest queues one item per linked kid to parent devices only, skips `digest:false`.
- [ ] Implement, run, commit.

### Task 3: Recitations
**Files:** `backend/Code.gs`, tests (mock `Utilities.base64Decode`).
**Produces:** sheet `Recitations`; actions `submitRecitation`, `myRecitations`, `recitations`, `reviewRecitation`, `deleteRecitation`; `canHearAudio_` covers recitations.
- [ ] Tests from Review Focus + review stars once + pending cap.
- [ ] Implement, run, commit.

### Task 4: Juz ʿAmma garden
**Files:** `backend/Code.gs` (`JUZ_AMMA`), `app/src/content/juz-amma.json`, tests.
**Produces:** sheet `Garden`; actions `garden {user_id?}`, `gardenReview {surah}`, `confirmSurah {user_id, surah, on}`.
- [ ] Tests: JSON matches `JUZ_AMMA`; review once/day; confirm 10 stars once and shared with `kidAchievement`; unconfirm removes; juz completion awards once.
- [ ] Implement, run, commit.

### Task 5: Family deeds
**Produces:** sheet `FamilyDeeds`; `addDeed`, `deleteDeed`, `parentDeeds {kid_id}`, `kidDeeds`.
- [ ] Tests: cap 3 stars/day; unlinked rejected; delete next day rejected; delete returns star.
- [ ] Implement, run, commit.

### Task 6: Seasonal challenges
**Produces:** sheets `Challenges`, `ChallengeLog`; `challenges`, `saveChallenge`, `endChallenge`, `deleteChallenge`, `challengeLog`.
- [ ] Tests from Review Focus; max 3 active; teacher other class rejected.
- [ ] Implement, run, commit.

### Task 7: Certificates
**Produces:** `certificates {kid_id?}` (student self / parent linked), journey stages from attendance.
- [ ] Tests: surah cert after confirm; stage cert after attending 5 prophets' lectures; parent unlinked rejected; cert code stable.
- [ ] Implement, run, commit. Bump VERSION.

### Task 8: Frontend
**Files:** content JSON (`daily-duas.json`, `hadith-kids.json`, `juz-amma.json`, `seasons.json`), `lib/duas.ts`, `lib/hifz.ts`, `components/release-board.tsx`, `components/kid/*` pages, teacher pages (`duas-release`, `hadith-release`, `recitations`, `hifz`, `challenges`), parent pages (`deeds`, `certificates`, digest card), kid home tiles, nav entries.
- [ ] e2e `e2e/eight-ideas.spec.ts` on desktop/mobile/iphone: dua release + kid deck + duaDone; recitation review flow (teacher); garden review + confirm; parent deed + kid board; challenge create + log; certificate print page; hadith page; parent digest card.
- [ ] Implement, run, commit.

### Task 9: Reviews + verification
- [ ] Sheikh, security, QA review agents; fix; full touched e2e + `npm run build`; PR (Arabic) with items for the owner's religious confirmation. No merge, no deploy.

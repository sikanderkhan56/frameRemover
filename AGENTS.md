# AGENTS.md — Frame Remover

Instructions for **AI coding agents** (and humans) working in this repository.

Read this before making non-trivial changes. For product requirements and full architecture, use the docs linked below—do not invent parallel product rules.

---

## Project in one paragraph

Frame Remover is a **React Native** app that plays **local videos** and auto-skips **cut scenes** stored in a **FastAPI** backend. Movies can get **AI suggestions** (Gemini via backend); users confirm them in a review sheet before save. Video files never leave the device for playback.

---

## Read these docs (in order)

| Doc | When |
|-----|------|
| [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) | Always — critical decisions cheat sheet |
| [PRD.md](./PRD.md) | Changing behavior, UX, or acceptance criteria |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Deep design, models, API surface |
| [README.md](./README.md) | Product overview |
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Run / install / API host config |

---

## Repo map (where to edit)

| Task | Start here |
|------|------------|
| Wizard steps / API wiring | `src/screens/VideoPlayerScreen.tsx` |
| Presentational setup screens | `src/screens/*.tsx` |
| Player UI | `src/screens/PlayerScreen.tsx`, `src/components/VideoPlayerPanel.tsx`, `VideoControls.tsx` |
| Video engine / seek | `src/components/AppVideoSurface.tsx` |
| Auto-skip | `src/hooks/useFrameSkipper.ts` |
| Cut scene list / open review | `src/components/CutSceneEditor.tsx` |
| AI Use → confirm UI | `src/components/SceneReviewSheet.tsx`, `SceneTimeline.tsx` |
| AI list UI | `src/screens/EditCutScenesScreen.tsx` |
| RTK Query endpoints | `src/store/api/contentApi.ts` |
| API base URL | `src/config/api.ts` |
| Reason enums + mapping | `src/constants/skipReasons.ts` |
| Draft validation | `src/utils/cutSceneValidation.ts` |
| API payload mapping | `src/utils/cutSceneApi.ts` |
| AI time/category helpers | `src/utils/aiPreview.ts` |
| Zoomed timeline window | `src/utils/reviewWindow.ts` |
| Types | `src/types/content.ts`, `flow.ts`, `player.ts` |

**Entry:** `App.tsx` → Redux `Provider` → `VideoPlayerScreen`.

---

## Non-negotiable architecture rules

1. **Orchestrator pattern** — Keep step machine and major side effects in `VideoPlayerScreen`. New screens should be mostly props-in / callbacks-out.
2. **RTK Query only for HTTP** — Add endpoints in `contentApi.ts`. Do not sprinkle raw `fetch` in UI.
3. **UI state ≠ Redux** — Wizard/player ephemeral state stays in React state. Store is for RTK Query.
4. **Dual video engine** — All seek/play goes through `AppVideoSurface` / `SeekablePlayerHandle.seek(seconds)`. No direct VLC/native calls from screens.
5. **One decoder when reviewing** — When scene review sheet is open, do not keep the hidden duration-probe player mounted on the same URI.
6. **Reason mapping mandatory** — UI: `violence | language | sexual_content | other`. API: `violence | inappropriate | eighteen_plus | unknown`. Use `toApiSkipReason` / `normalizeSkipReason`. Wrong values → **422**.
7. **AI is human-in-the-loop** — Use opens prefilled `SceneReviewSheet`; Confirm updates drafts; Save persists. Never write AI suggestions straight to the API as committed cut scenes without confirm + save flow.
8. **AI UI** — Suggestion cards: **reason label + estimated time only** (no description text).
9. **Movies get AI; episodes don’t** — unless PRD/scope explicitly changes.
10. **Local video, cloud metadata** — Do not upload the video file for normal playback.

---

## Coding conventions

- **TypeScript** throughout; prefer existing types in `src/types/`.
- Match nearby file style (imports, StyleSheet patterns, naming).
- Prefer small focused utils over bloating `VideoPlayerScreen`.
- UI brand accent: `#FF6B00` (setup + player). Don’t introduce a new palette without intent.
- After substantive TS changes, run `npx tsc --noEmit` when practical.
- Do **not** create commits unless the user asks.
- Do **not** add markdown docs the user didn’t ask for; when docs *are* requested, keep README / PRD / ARCHITECTURE in sync if contracts change.
- Avoid drive-by refactors unrelated to the task.

---

## Common change recipes

### Add an API endpoint
1. Types in `src/types/content.ts` if needed  
2. Endpoint in `contentApi.ts` + export hook  
3. Call from `VideoPlayerScreen` (or a focused hook)  
4. Update PRD/ARCHITECTURE if the contract is user-facing  

### Add a wizard step
1. Extend `SetupStep` in `types/flow.ts`  
2. Add screen under `src/screens/`  
3. Wire render + transitions in `VideoPlayerScreen`  
4. Update PRD flows  

### Change skip reasons
1. Update `SKIP_REASONS` + `ApiSkipReason` + both maps in `skipReasons.ts`  
2. Ensure create/update still use `cutScenesToApiPayload`  
3. Update PRD + ARCHITECTURE + ESSENTIALS tables  

### Touch playback / VLC
1. Prefer changes inside `AppVideoSurface`  
2. Treat pause/resume blank frames and dual-instance decode as known hazards  
3. Test on a real device with MKV when possible  

### Touch scene review / AI Use
1. Keep prefilled Use → Confirm path  
2. Keep zoomed `reviewWindow` behavior for short scenes  
3. Don’t remount probe + preview together  

---

## Verification checklist (agent)

Before finishing a task, confirm:

- [ ] No raw UI reason strings sent on create/update  
- [ ] No second video instance fighting the review preview  
- [ ] New API calls go through RTK Query  
- [ ] Presentational screens don’t own network orchestration  
- [ ] Docs updated if behavior/contracts changed  
- [ ] `tsc --noEmit` clean if types/API changed  

---

## What not to do

- Don’t replace the step machine with a navigation library unless explicitly requested.  
- Don’t auto-save AI suggestions on **Use**.  
- Don’t show AI `description` on suggestion cards.  
- Don’t assume iOS Simulator API host works on a physical device (use LAN IP).  
- Don’t commit secrets; API URL config is intentional in `api.ts`—change host flags carefully.  
- Don’t expand scope into auth, cloud video upload, or episode AI without product direction.

---

## Quick mental model

```
Local file → AppVideoSurface (native|VLC)
     +
Backend cut_scenes → SkipInterval[] → useFrameSkipper → seek(end)

AI estimated_scenes → Use → SceneReviewSheet → CutSceneDraft[]
                                 → Save → ApiCutScene[] → POST/PUT
```

When unsure, prefer **ARCHITECTURE-ESSENTIALS.md**, then ask the user before large structural changes.

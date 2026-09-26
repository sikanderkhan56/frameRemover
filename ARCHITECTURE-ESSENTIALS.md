# Architecture Essentials — Frame Remover

**Purpose:** Quick reference for critical decisions.  
**Full detail:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## System boundary

| Stays on device | Goes to backend |
|-----------------|-----------------|
| Video file bytes / local URI | Title identity, duration, cut scenes |
| Playback engines | AI preview requests (movies) |

AI **proposes** → user **confirms** into drafts → **Save** persists. Never auto-apply AI skips.

---

## Stack (minimum you need)

- **RN 0.86 + TS + React 19**
- **RTK Query** for all API (`store/api/contentApi.ts`)
- **Dual video:** `react-native-video` (native) + VLC (MKV / hard formats) via `AppVideoSurface`
- **Backend:** FastAPI (Railway prod / local `:8000`) — config in `src/config/api.ts`

---

## Core pattern

**One orchestrator:** `VideoPlayerScreen` owns step machine + side effects.  
Screens/components are presentational.

```
App → VideoPlayerScreen → (wizard screens | EditCutScenes | Player)
```

Steps:  
`welcome → choose_content_type → identify → checking → already_exists|not_found → edit_cut_scenes → saving → playing`

---

## Critical modules

| Concern | Where |
|---------|--------|
| API | `store/api/contentApi.ts` |
| Seek surface | `components/AppVideoSurface.tsx` |
| Auto-skip | `hooks/useFrameSkipper.ts` |
| Draft → API | `utils/cutSceneValidation.ts` + `utils/cutSceneApi.ts` |
| Reason map | `constants/skipReasons.ts` |
| AI parse/map | `utils/aiPreview.ts` |
| Review zoom window | `utils/reviewWindow.ts` + `SceneReviewSheet` / `SceneTimeline` |

---

## Data models (short)

```
CutSceneDraft  →  CutScene (UI reason, seconds)  →  ApiCutScene (API reason)
```

| UI reason | API reason |
|-----------|------------|
| `violence` | `violence` |
| `language` | `inappropriate` |
| `sexual_content` | `eighteen_plus` |
| `other` | `unknown` |

Always map with `toApiSkipReason` / `normalizeSkipReason` — never send UI enums raw.

**Player runtime:** `CutScene[]` → `SkipInterval[]` → `useFrameSkipper` (lead time `0.25s`).

---

## Decisions that matter

1. **Local video, cloud metadata** — don’t upload the file for playback.  
2. **Orchestrator state in React** — Redux holds RTK Query only, not wizard UI.  
3. **Dual engine behind one handle** — `seek(seconds)` only; no VLC calls outside `AppVideoSurface`.  
4. **One decoder at a time in review** — unmount duration probe when review sheet is open.  
5. **Zoomed review timeline** — short AI ranges are uneditable on a full-movie scrubber.  
6. **Human-in-the-loop AI** — Use → prefilled sheet → Confirm → draft; Save later.  
7. **Movies get AI; episodes don’t** (current scope).  
8. **Reason enum mismatch causes 422** — mapping is mandatory on create/update.

---

## Key flows (outline)

**Play existing:** exists → load cut scenes → `playing` + auto-skip  

**Create movie:** not found → force AI preview → Use/confirm drafts → `POST /api/movie`  

**Edit movie:** load scenes + AI → edit/Use → `PUT /api/movie/{id}`  

**Auto-skip:** `onProgress` → active interval? → `seek(end)` + notice  

---

## Do / don’t

| Do | Don’t |
|----|--------|
| Add endpoints in `contentApi` | Call fetch ad hoc from screens |
| Put parsing/mapping in `utils/` | Grow orchestrator with domain logic |
| Update PRD + ARCHITECTURE when contracts change | Invent new reason strings without mapping |
| Gate VLC quirks inside `AppVideoSurface` / review sheet | Assume pause/resume always paints a frame |

---

## Risks (watch list)

- Dual players on same URI → blank / failed preview  
- VLC pause → play → blank frame (re-seek on resume)  
- UI/API reason drift → 422 on save  
- Short scenes on full timeline → overlapping markers  

---

*For diagrams, full API tables, and extension guidelines → [ARCHITECTURE.md](./ARCHITECTURE.md)*

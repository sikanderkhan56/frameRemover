# Product Requirements Document (PRD) — Frame Remover

**Document type:** Product Requirements Document (for engineers & product collaborators)  
**Product:** Frame Remover (mobile)  
**Platforms:** iOS, Android (React Native)  
**Status:** Active development (`0.0.1`)  
**Related docs:** [README.md](./README.md) · [GETTING_STARTED.md](./GETTING_STARTED.md)

---

## 1. Overview

### 1.1 Product summary
Frame Remover lets users play **local video files** while automatically skipping **cut scenes**—timed intervals tagged with a reason (violence, language, sexual content, other). Cut-scene metadata is stored in a backend so titles can be reused. For movies, **AI suggestions** can propose candidate scenes; users must confirm them before they become skips.

### 1.2 Problem
Watching movies/shows often means manually scrubbing past unwanted moments. That is imprecise, repetitive, and hard to reuse across sessions or devices. There is no simple local-playback flow that combines:

- Device-local media (privacy / offline file access)
- Shared, structured skip metadata
- Optional AI assistance with human confirmation

### 1.3 Goals
1. Skip cut scenes automatically during local playback.
2. Make creating/editing cut scenes accurate and low-friction.
3. Reuse cut scenes for the same movie/episode via a backend.
4. Use AI to accelerate discovery of candidate scenes without auto-committing them.
5. Support common formats plus harder ones (e.g. MKV) via a dual playback engine.

### 1.4 Non-goals (current scope)
- Streaming remote video catalogs (Netflix-style)
- Editing or re-encoding the source video file
- Cloud storage of the video itself
- Social/community cut-scene sharing UI (backend may store data; app is single-user oriented)
- Episode AI suggestions (AI preview is **movie-only** today)
- Accounts / auth / multi-user profiles

---

## 2. Users & use cases

### 2.1 Primary user
Someone who watches local video files and wants certain moments skipped consistently (content filtering for comfort, family viewing, etc.).

### 2.2 Primary use cases

| ID | Use case | Outcome |
|----|----------|---------|
| UC-1 | Play known movie with existing cut scenes | Auto-skip during playback |
| UC-2 | Create cut scenes for a new movie | Persist scenes; play with skips |
| UC-3 | Edit cut scenes for an existing title | Update backend; play with new set |
| UC-4 | Use AI suggestion for a movie scene | Confirm via review sheet; scene added to draft list |
| UC-5 | Play without skips | Playback with empty skip list |
| UC-6 | Identify episode and manage cut scenes | Same create/edit/play path without AI suggestions |

---

## 3. Product principles

1. **Local-first media** — Video never leaves the device for playback.
2. **Cloud metadata** — Cut scenes and content identity live on the API.
3. **Human-in-the-loop AI** — AI proposes; user confirms/adjusts.
4. **Minimum taps to accept good AI** — Ideal path: Use → Confirm Scene.
5. **Editable precision** — Short scenes must be trimmable (zoomed timeline, not full-movie scrubber only).
6. **Format resilience** — Prefer native player; fall back to VLC when needed.

---

## 4. Functional requirements

### 4.1 Content setup wizard

| ID | Requirement |
|----|-------------|
| FR-S1 | User can pick a local video file (MP4, MOV, MKV, and other supported types). |
| FR-S2 | User chooses content type: **Movie** or **Episode**. |
| FR-S3 | Movie identify: title + release year; optional title suggestions from API. |
| FR-S4 | Episode identify: series title + season + episode number. |
| FR-S5 | App checks whether content exists in the backend (`exists` endpoints). |
| FR-S6 | If exists: offer Play, Edit cut scenes, Edit details. |
| FR-S7 | If not found: offer Add cut scenes, Play without skips, Edit details. |
| FR-S8 | Setup is a discrete step state machine (not a single mega-screen). |

**Setup steps (app):**  
`welcome` → `choose_content_type` → `identify` → `checking` → `already_exists` \| `not_found` → `edit_cut_scenes` → `saving` → `playing`

### 4.2 Cut scenes CRUD

| ID | Requirement |
|----|-------------|
| FR-C1 | A cut scene has `start` (seconds), `end` (seconds), and `reason`. |
| FR-C2 | UI reasons: Violence, Language, Sexual Content, Other. |
| FR-C3 | User can add, edit, delete scenes in a draft list before save. |
| FR-C4 | Add/Edit opens a **scene review sheet** with video preview + timeline. |
| FR-C5 | Validation: start &lt; end; valid times; reason required. |
| FR-C6 | Save creates or updates movie/episode including full cut_scenes payload. |
| FR-C7 | On save, map UI reasons → API reasons (see §6.2). |
| FR-C8 | Video duration is probed from the local file and sent with create/update. |

### 4.3 AI suggestions (movies only)

| ID | Requirement |
|----|-------------|
| FR-A1 | When entering add-cut-scenes for a **new** movie, fetch AI preview (force). |
| FR-A2 | When editing an **existing** movie, also fetch AI suggestions. |
| FR-A3 | Suggestion card shows **mapped reason label + estimated time only** (no description text). |
| FR-A4 | **Use** opens review sheet pre-filled with parsed start/end, reason, playhead at start. |
| FR-A5 | Timeline is **zoomed** to the scene window (padding + minimum span) so short ranges are editable. |
| FR-A6 | User can Adjust Start/End, Clear, Reset to AI, Widen window, Fit to scene. |
| FR-A7 | Confirm adds/updates the draft list; does not save to API until main Save. |
| FR-A8 | User can Refresh AI suggestions. |
| FR-A9 | If time range cannot be parsed, show an error; allow manual add. |
| FR-A10 | Episodes do not show AI suggestion UI (out of scope). |

### 4.4 Playback

| ID | Requirement |
|----|-------------|
| FR-P1 | Play local URI with appropriate engine (native vs VLC). |
| FR-P2 | Convert saved cut scenes to skip intervals; auto-seek past active interval (with lead time). |
| FR-P3 | Show a skip notice when a cut is applied. |
| FR-P4 | Controls: play/pause, ±5s, scrub, volume, fit/fill, fullscreen. |
| FR-P5 | Controls should remain usable but not oversized (compact control sizing). |
| FR-P6 | Support portrait/landscape and safe areas. |
| FR-P7 | Play without skips uses an empty cut-scene list. |

### 4.5 API / sync

| ID | Requirement |
|----|-------------|
| FR-B1 | App can switch local FastAPI vs production Railway URL via config. |
| FR-B2 | Movie: exists, suggestions, get by id, create, update, preview-scenes (GET/POST). |
| FR-B3 | Episode: exists, search/get, create, update. |
| FR-B4 | Surface actionable errors (network, 409 conflict, 422 validation). |
| FR-B5 | Dev logging of failed requests via base query interceptors. |

---

## 5. User flows (required behavior)

### 5.1 Existing movie → play
1. Pick video → Movie → enter title/year → exists  
2. **Play** → load cut scenes → `playing` with auto-skip  

### 5.2 Existing movie → edit (+ AI)
1. Exists → **Edit cut scenes**  
2. Load existing scenes into draft list  
3. Fetch AI suggestions in parallel/after navigation  
4. User may Use AI scenes or edit/delete existing  
5. **Save** → update movie → `playing`  

### 5.3 New movie → add (+ AI)
1. Not found → **Add cut scenes**  
2. Force AI preview  
3. Use / manual add → **Create** → `playing`  

### 5.4 AI Use → confirm
1. Tap **Use**  
2. Sheet opens with start/end/reason/preview at start  
3. Optional trim on zoomed timeline  
4. **Confirm Scene** → draft updated  
5. Later: Save to persist  

**Acceptance (happy path):** From a correct AI suggestion, user can add a scene with two primary taps (Use, Confirm).

---

## 6. Data model & contracts

### 6.1 Cut scene (app)
```ts
{
  start: number;  // seconds
  end: number;    // seconds
  reason: 'violence' | 'language' | 'sexual_content' | 'other';
}
```

### 6.2 Reason mapping (required)

| UI (`SkipReason`) | API (`ApiSkipReason`) |
|-------------------|------------------------|
| `violence` | `violence` |
| `language` | `inappropriate` |
| `sexual_content` | `eighteen_plus` |
| `other` | `unknown` |

Inbound API values (`inappropriate`, `eighteen_plus`, `unknown`) must normalize back to UI enums for display/editing.

### 6.3 AI estimated scene (from backend)
- `category` (string / known labels like Kissing, Sexual Content, Nudity, …)
- `estimated_time` (e.g. `~00:40:00-00:43:00`)
- `description` (stored/received but **not shown** in suggestion list UI)

Category → UI reason mapping lives in app helpers (e.g. Kissing → `other`, Sexual Content/Nudity → `sexual_content`).

### 6.4 Content identity
- Movie ID derived from title + year (stable string used in API paths)
- Episode identified by series + season + episode (and server id when known)

---

## 7. UX requirements

| ID | Requirement |
|----|-------------|
| UX-1 | Light setup UI; orange brand accent `#FF6B00`. |
| UX-2 | Player uses branded controls (orange progress/play, IonIcons). |
| UX-3 | AI cards: reason chip + time + Use — no narrative description. |
| UX-4 | Review sheet: preview, zoomed timeline (green start / red end), timestamps, reason chips, Confirm/Cancel. |
| UX-5 | Review playback may loop within the selected scene while reviewing. |
| UX-6 | Play/Pause on preview must not leave a permanent blank frame (known VLC issue; handle resume/seek carefully). |
| UX-7 | While reviewing, duration-probe player should not fight the preview player (unmount probe when sheet open). |

---

## 8. Technical requirements (engineering constraints)

| ID | Requirement |
|----|-------------|
| TR-1 | React Native app (TypeScript); orchestrator pattern via `VideoPlayerScreen`. |
| TR-2 | RTK Query for all backend calls. |
| TR-3 | Dual engine: `react-native-video` + `react-native-vlc-media-player` behind `AppVideoSurface`. |
| TR-4 | Document picker with local copy for reliable iOS file access. |
| TR-5 | Auto-skip via progress + interval detection (`useFrameSkipper` / equivalent). |
| TR-6 | Scene review window math: pad around start/end; enforce minimum window so short scenes are editable. |
| TR-7 | Node `>= 22.11.0` for development. |

---

## 9. Success metrics (product)

Qualitative / directional until analytics exist:

1. User can complete setup → play with skips without developer help.  
2. Accepting an accurate AI suggestion takes ≤ 2 primary actions.  
3. User can shorten a ~30s AI range without markers being unusable.  
4. MKV and MP4 both play and seek reliably enough for skip + review.  
5. Create/update with all UI reasons succeeds (no 422 on reason enum).

---

## 10. Edge cases & error handling

| Case | Expected behavior |
|------|-------------------|
| Backend unreachable | Clear network error; stay on recoverable step |
| Content already exists on create (409) | Message to use Edit instead |
| Invalid payload (422) | Validation message; stay on edit |
| AI time unparsable | Error; manual add still available |
| Duration not ready on save | Block save with “still reading duration” |
| Start ≥ end | Inline validation error |
| AI approximate ranges | Initialize with parsed range; user fine-tunes |
| Pause then Play on VLC preview | Must restore visible frames (re-seek on resume) |
| Two players on same URI | Avoid concurrent probe + preview |

---

## 11. Out of scope / future candidates

Not required for current PRD; may be considered later:

- User accounts and sync across devices with login  
- Community-shared cut scene packs  
- Episode AI preview  
- Server-side video analysis (frame-accurate detection)  
- Export/import of cut scene JSON  
- Subtitle-aware skipping  
- Dedicated Installation doc already exists; expand with CI/release process  

---

## 12. Acceptance checklist (MVP)

- [ ] Wizard covers movie and episode identify → exists/not found branches  
- [ ] Create and update cut scenes persist via API with correct reason mapping  
- [ ] Playback auto-skips intervals and shows skip feedback  
- [ ] Native + VLC path selection works for supported formats  
- [ ] Movie AI suggestions on create **and** edit  
- [ ] Use → prefilled review sheet → Confirm works  
- [ ] Zoomed timeline allows trimming short scenes  
- [ ] AI list shows reason + time only  
- [ ] Local and production API switch documented  

---

## 13. Open questions

1. Should AI suggestions prefer GET (cached) vs always POST (force Gemini) on edit for cost/latency?  
2. Should confirmed AI scenes be deduped against overlapping existing cut scenes?  
3. What is the product rule when AI range is outside probed video duration?  
4. Will episodes get AI preview in a later phase?

---

## 14. Document ownership

Update this PRD when:

- User-facing flows change  
- API reason enums or AI contracts change  
- Scope (goals / non-goals) changes  

Keep [README.md](./README.md) as the short product/architecture overview; keep this PRD as the requirements source of truth for implementers.

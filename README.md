# Frame Remover

Frame Remover is a **React Native** mobile app that plays **local video files** and automatically skips user-defined **cut scenes**—moments you don’t want to watch, such as violence, strong language, or sexual content.

Videos stay on the device. Cut-scene metadata (what to skip, and when) lives in a cloud backend so the same movie or episode can be reused across sessions. Optional **AI suggestions** help find candidate scenes faster; you always confirm them before they become real skips.

---

## What it does

1. You pick a video from your phone (MP4, MOV, MKV, and similar formats).
2. You identify it as a **movie** (title + year) or an **episode** (series / season / episode).
3. The app checks a backend for existing cut scenes.
4. You can **play** with auto-skip, **create** new cut scenes, or **edit** existing ones.
5. During playback, when the playhead enters a cut interval, the player seeks past it so that moment is skipped.

---

## Who it’s for

Anyone who wants to watch local movies or shows while skipping specific kinds of content—without manually scrubbing the timeline every time.

---

## Features

### Content setup
- Choose **Movie** or **Episode**
- Movie search suggestions from the API
- Detect whether content **already exists** in the database or is **new**

### Cut scenes
- Timed intervals: start, end, and a skip **reason**
- Reasons in the UI: **Violence**, **Language**, **Sexual Content**, **Other**
- Add, edit, and delete scenes before saving
- Manual entry via a review bottom sheet with video preview and timeline

### AI-assisted suggestions (movies)
- Backend asks Gemini for estimated scenes (category + time range)
- Suggestions show **reason label + estimated time** only (no long descriptions)
- **Use** opens a pre-filled review sheet (start, end, reason, frame at start)
- Zoomed timeline focused on that scene so short cuts are easy to trim
- Confirm or fine-tune, then save—best case is roughly **Use → Confirm**
- Available when **creating** a new movie and when **editing** an existing one

### Playback
- Local file playback with auto-skip of cut scenes
- Dual video engines:
  - Native (`react-native-video`) for common formats
  - **VLC** for MKV and other formats that need broader codec support
- Play / pause, ±5s skip, scrubber, volume, fit/fill, fullscreen
- Skip notice when a cut scene is jumped
- Orientation and safe-area aware player UI

### Backend sync
- Create / update movies and episodes with cut scenes
- Map UI reason enums to the API’s reason enums on save
- Production API on Railway; local FastAPI supported for development

---

## User journey

```
Welcome
  → Choose content type (Movie | Episode)
  → Identify content
  → Checking (exists in DB?)
       ├─ Already exists → Play | Edit cut scenes | Edit details
       └─ Not found      → Add cut scenes | Play without skips | Edit details
  → Edit / Add cut scenes (list + optional AI suggestions)
  → Save (create or update)
  → Playing (auto-skip enabled)
```

### AI “Use” flow
1. Tap **Use** on a suggestion  
2. Bottom sheet opens pre-loaded (preview + start/end markers + reason)  
3. Optionally drag Start / End on a **zoomed** scene timeline  
4. Tap **Confirm Scene**

---

## Domain concepts

| Term | Meaning |
|------|---------|
| **Cut scene** | `{ start, end, reason }` — a timed interval to skip |
| **Skip interval** | Runtime form of a cut scene used by the player |
| **Skip reason (UI)** | `violence` · `language` · `sexual_content` · `other` |
| **Skip reason (API)** | `violence` · `inappropriate` · `eighteen_plus` · `unknown` |
| **AI suggestion** | Estimated scene from Gemini: category + time range |
| **Scene review sheet** | Modal to preview and confirm/adjust a scene |
| **Review window** | Zoomed scrubber around the scene (not the full movie) |
| **Content ID** | Stable id for a movie or episode in the backend |

UI reasons are mapped to API reasons on create/update (e.g. Language → `inappropriate`, Sexual Content → `eighteen_plus`, Other → `unknown`). Incoming API values are normalized back for display.

---

## Tech stack

### Mobile
- React Native 0.86 · React 19 · TypeScript
- Redux Toolkit + RTK Query
- `react-native-video` + `react-native-vlc-media-player`
- Document picker, slider, orientation, volume, IonIcons, linear gradient

### Backend (consumed by the app)
- FastAPI (Python)
- Hosted on Railway (production)
- Gemini-backed movie preview endpoints

---

## Project structure (`src/`)

```
src/
├── screens/          # Wizard steps + player (orchestrated by VideoPlayerScreen)
├── components/       # Video surface, controls, scene review sheet, timeline, editor
├── store/api/        # RTK Query content API + base query interceptors
├── hooks/            # Frame skipper, volume, TV remote
├── utils/            # Time parsing, validation, AI helpers, API reason mapping
├── constants/        # Skip reasons, playback, video format rules
├── theme/            # Setup + player visual system
├── types/            # Domain & player types
└── config/           # API base URL (local vs production)
```

**Orchestration:** `VideoPlayerScreen` owns setup state, API calls, and step transitions. Individual screens are mostly presentational.

**Video:** `AppVideoSurface` picks native vs VLC from file type so seek/skip logic stays engine-agnostic via a shared seekable handle.

---

## Design approach

- Light UI with orange brand accent (`#FF6B00`)
- Multi-step setup wizard instead of one dense form
- Local-first media (file on device) + cloud-shared cut-scene metadata
- AI proposes; humans confirm—never blind-apply model output
- Short AI scenes are edited on a **zoomed** timeline so markers don’t stack on a 2-hour scrubber

---

## Platforms

- iOS and Android (React Native)

---

## Documentation

- **This README** — product overview, features, architecture summary, and concepts  
- **[PRD.md](./PRD.md)** — product requirements for developers (flows, FR/UX/TR, acceptance)  
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — full system design, tech stack, modules, data models  
- **[ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md)** — critical decisions only (quick reference)  
- **[AGENTS.md](./AGENTS.md)** — instructions for AI coding agents working in this repo  
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** — install dependencies and run on iOS / Android

---

## License / status

Private project (`0.0.1`). Under active development.

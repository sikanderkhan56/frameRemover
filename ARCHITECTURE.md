# Architecture — Frame Remover

**Audience:** Engineers onboarding or extending the app  
**Related docs:** [README.md](./README.md) · [PRD.md](./PRD.md) · [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) · [GETTING_STARTED.md](./GETTING_STARTED.md)

This document describes system architecture, tech stack, module layout, data models, key runtime flows, and engineering conventions. For a one-page critical-decisions cheat sheet, see **[ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md)**.

---

## 1. System context

Frame Remover is a **React Native client** that:

1. Plays **local video files** on device  
2. Manages **cut-scene metadata** via a remote **FastAPI** backend  
3. Optionally loads **AI estimated scenes** (Gemini, via backend) for movies  

```
┌──────────────────────────────┐
│     Mobile App (RN/TS)       │
│  Wizard · Editor · Player    │
└──────────────┬───────────────┘
               │ REST (JSON)
               ▼
┌──────────────────────────────┐         ┌─────────────────┐
│     FastAPI Backend          │────────▶│  Gemini (AI)    │
│  Movies / Episodes / Preview │         └─────────────────┘
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│     Persistence (DB)         │
│  Content + cut_scenes        │
└──────────────────────────────┘

Local video file ──▶ AppVideoSurface (native | VLC)
                     (never uploaded for playback)
```

**Boundary rules**
- Video bytes stay on device (document picker → local URI).
- Backend stores identity + cut scenes + AI preview results.
- AI never auto-commits skips; the client confirms into drafts, then Save persists.

---

## 2. Tech stack

### 2.1 Client

| Layer | Choice | Role |
|-------|--------|------|
| UI framework | React Native **0.86** | Cross-platform mobile |
| Language | TypeScript | Typed domain + API contracts |
| React | **19.x** | UI rendering |
| State / API | Redux Toolkit + **RTK Query** | Server state, caching, mutations |
| Native video | `react-native-video` | MP4/MOV and similar |
| VLC video | `react-native-vlc-media-player` | MKV / broader codecs |
| File pick | `@react-native-documents/picker` | Local video selection + copy |
| Controls | `@react-native-community/slider` | Scrub / volume |
| Icons | `@react-native-vector-icons/ionicons` | UI icons |
| Layout | `react-native-safe-area-context` | Insets |
| Orientation | `react-native-orientation-locker` | Lock / rotate player |
| Volume | `react-native-volume-manager` | System volume bridge |
| Input | `react-native-keyevent` | Hardware / TV remote hooks |
| Visual | `react-native-linear-gradient` | Brand gradients |
| Tooling | ESLint, Prettier, Jest, patch-package | Quality / patches |

### 2.2 Backend (consumed, not in this repo)

| Piece | Notes |
|-------|--------|
| API | FastAPI (Python) |
| Production host | Railway |
| AI | Gemini via movie `preview-scenes` endpoints |
| Local dev | `http://<host>:8000` (see `src/config/api.ts`) |

### 2.3 Runtime environments

| Env | API |
|-----|-----|
| Dev + `USE_LOCAL_API_IN_DEV=true` | Local FastAPI host |
| Dev/prod flag false | Railway production URL |

Hosts for local API: iOS Simulator `127.0.0.1`, Android emulator `10.0.2.2`, physical devices → machine LAN IP.

---

## 3. High-level client architecture

### 3.1 Pattern: single orchestrator + presentational screens

```
App.tsx
  └─ Redux Provider + SafeAreaProvider
       └─ VideoPlayerScreen          ← owns setup state, API calls, step machine
            ├─ WelcomeScreen
            ├─ ContentTypeScreen
            ├─ MovieDetailsScreen / EpisodeDetailsScreen
            ├─ CheckingScreen
            ├─ AlreadyExistsScreen / NotFoundScreen
            ├─ EditCutScenesScreen
            │    └─ CutSceneEditor → SceneReviewSheet → SceneTimeline + AppVideoSurface
            └─ PlayerScreen → VideoPlayerPanel → AppVideoSurface + VideoControls
```

**Why:** One place owns navigation-between-steps, video URI, drafts, and mutations. Screens stay prop-driven and easier to restyle/test.

### 3.2 Layering

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Composition / orchestration | `screens/VideoPlayerScreen.tsx` | Steps, side effects, wiring |
| Presentation | `screens/*`, `components/*` | UI only |
| Domain utils | `utils/*` | Parsing, validation, mapping |
| Constants | `constants/*` | Enums, playback knobs, format rules |
| Types | `types/*` | Shared contracts |
| Data access | `store/api/*` | RTK Query endpoints |
| Config | `config/api.ts` | Base URL selection |
| Theme | `theme/*` | Setup + player visual tokens |

### 3.3 Directory map (`src/`)

```
src/
├── config/           # API base URL
├── constants/        # skipReasons, playback, videoPicker
├── hooks/            # useFrameSkipper, volume, TV remote
├── screens/          # wizard + player shells
├── components/       # video, controls, review sheet, editor
├── store/
│   ├── index.ts      # configureStore
│   └── api/          # contentApi, baseQuery interceptors
├── theme/            # setupStyles, playerTheme
├── types/            # content, flow, player, skipInterval
└── utils/            # time, drafts, validation, AI, API mapping, reviewWindow
```

---

## 4. Application state machine

Setup is an explicit **step enum** (`SetupStep` in `types/flow.ts`):

```
welcome
  → choose_content_type
  → identify
  → checking
  → already_exists | not_found
  → edit_cut_scenes
  → saving
  → playing
```

Additional mode flag:

- `SceneEditMode`: `'create' | 'update'` — create vs PUT on save.

Orchestrator also holds ephemeral UI state: video URI/file name, duration, drafts, AI suggestions, errors, scene-review open (to suppress duration probe), etc.

---

## 5. Video playback architecture

### 5.1 Dual engine

`AppVideoSurface` selects engine from file name/URI:

- **Native** (`react-native-video`) — preferred for formats AVPlayer / ExoPlayer handle well  
- **VLC** — required for Matroska and other non-native containers  

Both expose a shared imperative API:

```ts
type SeekablePlayerHandle = { seek: (timeSeconds: number) => void };
```

Callers (player, review sheet, skipper) never branch on engine.

### 5.2 Auto-skip pipeline

```
cut_scenes (API / local state)
  → cutScenesToSkipIntervals()
  → useFrameSkipper(playerRef, { intervals, leadTime })
  → onProgress(currentTime)
       → findActiveSkipInterval(time, leadTime)
       → seek(interval.end) + skip notice
```

Lead time: `SKIP_LEAD_TIME_SECONDS` (0.25s) starts the seek slightly early for smoother cuts.

### 5.3 Duration probing vs scene preview

During setup, a **hidden** `AppVideoSurface` probes duration.  
When the scene review sheet opens, the probe is **unmounted** so two decoders do not fight the same file (especially VLC). Preview player reports duration via `onLoad` if needed.

### 5.4 Scene review playback

`SceneReviewSheet`:

- Muted preview; seek to AI/manual start  
- Prefer keeping playback alive (VLC often blanks on pause/resume; resume re-seeks to refresh frames)  
- Optional loop inside confirmed start–end while reviewing  

---

## 6. Cut-scene editing architecture

### 6.1 Draft model vs persisted model

| Stage | Model | Notes |
|-------|-------|-------|
| Editor UI | `CutSceneDraft` | `id` + `TimeFields` + reason |
| Validated app model | `CutScene` | seconds + UI `SkipReason` |
| Wire to API | `ApiCutScene` | seconds + `ApiSkipReason` |

Flow:

```
CutSceneDraft[]
  → draftsToCutScenes()          // validate
  → cutScenesToApiPayload()      // reason mapping
  → createMovie / updateMovie / createEpisode / updateEpisode
```

Inbound:

```
API cut_scenes
  → normalizeSkipReason()
  → cutScenesToDrafts() / cutScenesToSkipIntervals()
```

### 6.2 Scene review sheet

Opened for:

- Manual Add / Edit  
- AI **Use**

Components:

- `SceneReviewSheet` — modal chrome, confirm/cancel, reason chips  
- `SceneTimeline` — pan gestures, start/end/playhead markers  
- `reviewWindow` utils — compute zoomed `[windowStart, windowEnd]`  

Zoom rationale: a 30s scene on a 2h scrubber collapses markers; the window pads the range and enforces a minimum span.

### 6.3 AI suggestion path (movies)

```
forceMovieAiPreview / getMoviePreviewScenes
  → estimated_scenes[]
  → UI list (reason label + estimated_time only)
  → Use → parseEstimatedTimeRange + mapAiCategoryToReason
  → open SceneReviewSheet prefilled
  → Confirm → append/update CutSceneDraft
```

---

## 7. Data models

### 7.1 Domain enums

**UI skip reason** (`SkipReason`):

- `violence` | `language` | `sexual_content` | `other`

**API skip reason** (`ApiSkipReason`):

- `violence` | `inappropriate` | `eighteen_plus` | `unknown`

**Mapping (outbound):**

| UI | API |
|----|-----|
| violence | violence |
| language | inappropriate |
| sexual_content | eighteen_plus |
| other | unknown |

**Inbound legacy → UI:** reverse map via `normalizeSkipReason`.

### 7.2 Core entities (client view)

#### CutScene
```ts
{ start: number; end: number; reason: SkipReason }
```

#### ApiCutScene
```ts
{ start: number; end: number; reason: ApiSkipReason }
```

#### CutSceneDraft
```ts
{
  id: string;
  start: { hours: string; minutes: string; seconds: string };
  end: { hours: string; minutes: string; seconds: string };
  reason: SkipReason | '';
}
```

#### SkipInterval (player)
```ts
{
  start: number;
  end: number;
  label?: string;
  reason?: SkipReason;
}
```

#### EstimatedScene (AI)
```ts
{
  category: string;
  estimated_time: string; // e.g. "~00:40:00-00:43:00"
  description: string;    // not shown in suggestion list UI
}
```

#### Movie (response shape)
```ts
{
  movie_id: string;
  title: string;
  release_year: number;
  duration: number;
  cut_scenes: CutScene[]; // reasons normalized in app when needed
}
```

#### Episode (response shape)
```ts
{
  episode_id: string;
  series_title: string;
  season_number: number;
  episode_number: number;
  duration: number;
  cut_scenes: CutScene[];
}
```

### 7.3 Identity

- **Movie ID:** derived from title + year (`buildMovieId`) — used in paths and create body.  
- **Episode ID:** server-assigned when known; preview id builders exist for display before create.

### 7.4 Preview response union

```ts
PreviewResponse =
  | { source: 'database'; cut_scenes: ...; message: string; ... }
  | { source: 'ai_preview'; estimated_scenes: EstimatedScene[]; ... }
```

Client create/edit flows currently lean on **force AI preview** for suggestions UI.

---

## 8. API surface (client)

Defined in `store/api/contentApi.ts` (RTK Query). Base URL from `getApiBaseUrl()`.

### Movies
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/movie/exists` | Exists check |
| GET | `/api/movie/suggestions` | Title suggestions |
| GET | `/api/movie/search` | Search |
| GET | `/api/movie/{id}` | Load movie + cut scenes |
| POST | `/api/movie` | Create |
| PUT | `/api/movie/{id}` | Update |
| DELETE | `/api/movie/{id}` | Delete |
| GET | `/api/movie/{id}/preview-scenes` | Preview (DB-first / cached) |
| POST | `/api/movie/{id}/preview-scenes` | Force AI preview |

### Episodes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/episode/exists` | Exists check |
| GET | `/api/episode/search` | Search |
| GET | `/api/episode/{id}` | Load |
| POST | `/api/episode` | Create |
| PUT | `/api/episode/{id}` | Update |
| DELETE | `/api/episode/{id}` | Delete |

### Cross-cutting
- `baseQueryWithInterceptors` — builds absolute URLs, logs failures in `__DEV__`.  
- Tags: `Movie`, `Episode` for cache invalidation on mutations.

---

## 9. Redux store shape

Minimal store — **server state only** via RTK Query:

```ts
{
  contentApi: /* RTK Query reducer */
}
```

Wizard/player UI state lives in `VideoPlayerScreen` React state (not Redux). That keeps the step machine local and avoids syncing large ephemeral objects through the store.

---

## 10. Key runtime sequences

### 10.1 Identify → exists → play

```
pick video → probe duration (hidden player)
identify → GET exists
  → true → GET by id → set cutScenes → playing
  → useFrameSkipper consumes intervals
```

### 10.2 Not found → AI → create

```
POST preview-scenes (force)
render suggestions
Use → SceneReviewSheet → Confirm → drafts[]
Save → draftsToCutScenes → cutScenesToApiPayload
POST /api/movie → playing
```

### 10.3 Edit existing → AI → update

```
GET movie → drafts
POST preview-scenes (force)
… same review confirm …
PUT /api/movie/{id} → playing
```

---

## 11. Design system (client)

| Token | Usage |
|-------|--------|
| `#FF6B00` / `#FF8A00` | Primary CTA / player accents |
| Light backgrounds (`#F8F9FB`, white cards) | Setup flows |
| Glass overlays | Player controls |
| IonIcons | Actions across setup + player |

Themes: `theme/setupStyles.ts`, `theme/playerTheme.ts`.

---

## 12. Cross-cutting concerns

### Errors
- Network / FETCH_ERROR → user-visible “cannot reach API”  
- 409 → already exists / use edit  
- 422 → invalid payload (e.g. reason enum mismatch — prevented by mapping)  
- Cut-scene validation errors stay on edit screen  

### Performance / media
- Throttle seeks while scrubbing review timeline  
- Unmount competing players when reviewing  
- VLC seek uses normalized seconds (VLC often reports ms)  

### Security / privacy
- No upload of video content for normal playback  
- Backend receives metadata (title, times, reasons) only  
- No auth layer in current client (future concern)  

### Testing / quality
- Jest present; domain utils (time, mapping, review window) are the easiest unit targets  
- Manual device QA critical for VLC seek/pause and document picker  

---

## 13. Extension guidelines

When adding features, prefer:

1. **New presentational screen/component** + wire in `VideoPlayerScreen`  
2. **New RTK Query endpoint** in `contentApi` for backend calls  
3. **Pure utils** for parsing/mapping (keep screens thin)  
4. Update **PRD** (requirements) and this **ARCHITECTURE** (structure) together  
5. If touching reasons, update **both** UI enum and `toApiSkipReason` / `normalizeSkipReason`  

Avoid:

- Second orchestrator competing with `VideoPlayerScreen`  
- Calling VLC/native APIs outside `AppVideoSurface`  
- Sending UI reason strings straight to the API  

---

## 14. Known architectural risks

| Risk | Mitigation in current design |
|------|------------------------------|
| Dual decoders on one file | Unmount probe while review sheet open |
| VLC blank after pause | Re-seek on resume; stable autoplay flag |
| Short scenes uneditable on full timeline | Zoomed review window |
| API/UI reason drift | Explicit bidirectional mapping |
| God-screen growth in orchestrator | Keep domain logic in utils; split screens |

---

## 15. Document maintenance

Update `ARCHITECTURE.md` when:

- Layering or orchestrator responsibilities change  
- Data models / reason enums / API contracts change  
- Playback engine strategy changes  
- New major subsystems are added (auth, sync, episode AI, etc.)

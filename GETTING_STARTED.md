# Getting Started — Frame Remover

This guide covers how to install dependencies and run the Frame Remover app on **iOS** and **Android**.

For what the project is and how it works, see the main [README](./README.md).

---

## Prerequisites

Complete the official [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) for your OS and target platform.

You will need:

| Requirement | Notes |
|-------------|--------|
| **Node.js** | `>= 22.11.0` (see `package.json` → `engines`) |
| **npm** or **Yarn** | Package manager |
| **Xcode** | iOS builds (macOS only) |
| **CocoaPods** | iOS native deps (`bundle exec pod install`) |
| **Android Studio** | Android SDK, emulator or device |
| **JDK** | As required by React Native 0.86 / Android toolchain |

Optional:

- A running **FastAPI** backend if you want local API mode (see [API configuration](#api-configuration))

---

## 1. Clone and install JS dependencies

```sh
git clone <your-repo-url> frameRemover
cd frameRemover
npm install
```

`postinstall` runs **patch-package** automatically if any patches are present.

---

## 2. iOS native dependencies

From the project root (first clone, or after changing native iOS deps):

```sh
bundle install
cd ios
bundle exec pod install
cd ..
```

If Bundler / CocoaPods is not set up yet, follow the [CocoaPods Getting Started](https://guides.cocoapods.org/using/getting-started.html) guide.

---

## 3. Start Metro

Metro is the JavaScript bundler. From the project root:

```sh
npm start
```

This project starts Metro with `--host 0.0.0.0` so devices on your LAN can reach the packager when needed.

Leave this terminal running.

---

## 4. Run the app

Open a **second** terminal in the project root.

### Android

```sh
npm run android
```

Use an emulator or a USB-connected device with debugging enabled.

### iOS

```sh
npm run ios
```

You can also open `ios/frameRemover.xcworkspace` in Xcode and run from there (always the `.xcworkspace`, not the `.xcodeproj`, after pods are installed).

---

## 5. Reload during development

After the app is running, Fast Refresh applies most JS changes automatically.

Full reload:

- **Android:** press `R` twice, or open the Dev Menu (`Ctrl`/`Cmd` + `M`) → Reload  
- **iOS Simulator:** press `R`

---

## API configuration

The app talks to a FastAPI backend for movies, episodes, cut scenes, and AI suggestions.

Config lives in `src/config/api.ts`:

| Setting | Purpose |
|---------|---------|
| `USE_LOCAL_API_IN_DEV` | `true` → local server; `false` → Railway production |
| `LOCAL_API_HOST` | Host for local API |
| `PRODUCTION_API_URL` | Deployed backend URL |

### Local backend

Typical hosts:

| Environment | Host |
|-------------|------|
| iOS Simulator | `127.0.0.1` |
| Physical iOS device | Your Mac’s LAN IP (e.g. `192.168.x.x`) |
| Android Emulator | `10.0.2.2` (maps to host machine `localhost`) |
| Physical Android device | Your Mac’s LAN IP |

Default local port: **8000** → `http://<host>:8000`

Update `LOCAL_API_HOST` (and `USE_LOCAL_API_IN_DEV`) to match how you run the backend.

### Production backend

Set `USE_LOCAL_API_IN_DEV = false` to use the Railway URL defined in `api.ts`.

---

## Useful scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro (`--host 0.0.0.0`) |
| `npm run ios` | Build and run on iOS |
| `npm run android` | Build and run on Android |
| `npm run lint` | ESLint |
| `npm test` | Jest |

---

## Troubleshooting

- **Metro / build issues:** [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- **iOS pods fail:** delete `ios/Pods` and `ios/Podfile.lock`, then re-run `bundle exec pod install` from `ios/`
- **API unreachable:** confirm the backend is running, `USE_LOCAL_API_IN_DEV` / host / port match your setup, and (on device) that phone and machine are on the same network
- **Icons show as `?`:** rebuild the native app after IonIcons font registration changes (JS reload alone is not enough)
- **MKV / some formats:** playback uses VLC for formats native players don’t handle well; a native rebuild is required after adding or updating VLC-related deps

---

## Next steps

1. Run the app and pick a local video  
2. Walk through Movie or Episode setup  
3. Add or use AI-suggested cut scenes, then play with auto-skip  

Product overview and architecture: [README.md](./README.md)

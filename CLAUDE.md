# SB-TETRIS — CLAUDE.md

## Project Overview

Tetris game with a "Digital Brutalist / Dystopian" aesthetic.
- **Web version**: React + TypeScript + Vite (existing, in `src/`)
- **Android version**: Pure C (NDK) + OpenGL ES 2.0 + NativeActivity (in `android/`)

## Aesthetic Contract

These rules apply to ALL future UI changes, both web and Android:

| Element | Value |
|---|---|
| Background | `#000000` black |
| Primary text / pieces | `#FFFFFF` white |
| Metadata labels | `#A0A0A0` gray |
| Accent / error | `#FF0000` red |
| Font | JetBrains Mono (web) / 8×8 bitmap (Android) |
| Pieces | Black fill + white inset 2px border (box-shadow effect) |
| Ghost piece | Transparent + 40% white border |
| Board border | 2px solid white + corner bracket ornaments |
| Buttons | Black bg, 2px white border, white text |
| Next piece preview | Circular "visor" shape, centered in header |

## UI Labels (do not rename)

- `SYSTEM_CLOCK` — live HH:MM:SS
- `NEXT_MEM` — next piece preview
- `BYTE_COUNT` — score display `[000000]`
- `BUFFER_XX` — level display under visor
- `COMMAND_CENTER` — controls section label
- `FATAL_ERROR` / `HEAP_OVERFLOW` / `SYSTEM_HALTED` — game over screen
- `REBOOT_SYSTEM()` — restart button
- `[ ROTATE ]`, `<`, `>`, `DROP`, `INSTANT_GRAVITY` — control buttons

## Android Architecture

```
android/
├── app/
│   ├── build.gradle               # AGP 8.4, minSdk 21, compileSdk 34
│   └── src/main/
│       ├── AndroidManifest.xml    # NativeActivity, portrait lock
│       ├── cpp/
│       │   ├── CMakeLists.txt     # NDK, GLES2, EGL, android, log
│       │   ├── main.c             # android_main(), game loop, EGL init
│       │   ├── tetris.h / .c      # pure game logic (no Android deps)
│       │   ├── renderer.h / .c    # OpenGL ES 2.0 rendering + layout
│       │   ├── input.h / .c       # touch zones, DAS timers
│       │   └── font.h / .c        # 8×8 bitmap font → GL texture atlas
│       └── res/values/strings.xml
```

## Adaptive Layout Rules

All sizes are derived from `screen_width` and `screen_height` at runtime:

- Header: 18% of screen height
- Board: 54% of screen height (constrained by 10:20 aspect ratio, centered)
- Controls: 28% of screen height
- Cell size: `min(board_area_width/10, board_area_height/20)`
- Font scale: proportional to `cell_size`

**Never hardcode pixel values.** All layout computed in `renderer.c:calculate_layout()`.

## Game Constants

| Constant | Value |
|---|---|
| Board | 20 rows × 10 cols |
| Pieces | I, J, L, O, S, T, Z |
| Scoring | 40 / 100 / 300 / 1200 × (level+1) |
| Level up | every 400 points |
| Drop interval | `max(100, 1000 - level*100)` ms |
| DAS initial delay | 180 ms |
| DAS repeat delay | 40 ms |

## Build Instructions (Android Studio)

1. Open `android/` folder in Android Studio (Electric Eel or newer)
2. Let Gradle sync and NDK download finish
3. Build → Make Project (`Ctrl+F9`)
4. Run on device or emulator: `Run → Run 'app'`
5. To export APK: `Build → Build Bundle(s)/APK(s) → Build APK(s)`

**NDK requirement**: NDK 25+ (r25c recommended). Set in `local.properties`:
```
ndk.dir=/path/to/ndk
```

## Branch

Active development: `claude/android-c-mobile-app-LWraq`

## Workflow for Future Claude Sessions

- Always preserve the aesthetic contract above
- Adaptive layout lives exclusively in `renderer.c:calculate_layout()`
- Game logic in `tetris.c` has zero Android/GL dependencies
- Input zones recalculated each frame from `Layout` struct
- When adding new screens (pause, high score), follow the same NativeActivity pattern

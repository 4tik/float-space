# Floating Monitor

> **Cross-Platform Desktop Floating Workspace & Application Manager**  
> Combining macOS Mission Control, Stage Manager, Spaces, Picture-in-Picture, and native desktop window management into one unified native application.

Built with **Electron**, **React 18**, **TypeScript**, **Tailwind CSS**, **Zustand**, and **SQLite (sql.js)**.

---

## Architecture & Features

### 1. Technology Stack & Local Database Architecture
- **Mandatory Local SQLite**: Fully embedded SQLite 3 engine (`FloatDesk/database/floatdesk.db`) resolved via Electron's `app.getPath('userData')`.
  - Zero external servers, zero configuration, zero cloud dependencies.
  - Automatic directory initialization:
    ```text
    FloatDesk/
    ├── database/
    │   ├── floatdesk.db
    │   ├── migrations/
    │   ├── backups/
    │   └── metadata.json
    ├── cache/
    ├── logs/
    └── exports/
    ```
  - **Drizzle ORM & Typed Repositories**: Complete typed schemas, relations, and repositories for all 13 core application tables.
  - **Versioned Migrations & Integrity**: Automated pre-migration backups, `PRAGMA foreign_keys = ON;`, `PRAGMA journal_mode = WAL;`, and integrity verification.
  - **Database & Storage UI**: Dedicated preferences section showing real-time database diagnostics, size, version, backup history, manual/automated backup creation, restoration, and export/import.
- **Electron**: Multi-process native desktop runtime managing independent frameless floating BrowserWindows.
- **React 18 & TypeScript**: Component-driven UI with type safety across both Electron and renderer processes.
- **Tailwind CSS**: macOS-inspired design system with translucent glass surfaces (`backdrop-blur-md`), traffic light controls, smooth animations, and customizable themes.
- **Zustand**: Fast, lightweight reactive in-memory UI state, with SQLite remaining the persistent source of truth.
- **Vitest**: 27 unit and integration tests covering database schemas, repositories, backups, snapping, and native adapters.

---

### 2. Multi-Display & Floating Monitor Engine
- **Independent Floating Windows**: Each floating monitor is an actual independent frameless Electron `BrowserWindow` with its own WebContents.
- **Always-On-Top**: Keeps monitors hovering over all other desktop apps with custom pin/unpin toggles.
- **Free Dragging & Resizing**: Drag via macOS toolbar regions and resize from any edge or corner with minimum constraints (240×160px).
- **Transparency / Opacity**: Real-time opacity adjustments from 10% to 100% with smooth transitions.
- **Window Locking**: Lock positions and dimensions to prevent accidental movement while interacting.
- **Window Snapping**: Snap windows into halves (left/right/top/bottom), four quadrants, center, or maximize across any connected physical display.
- **Auto Arrange**: Intelligent automatic grid arrangement of active monitors.

---

### 3. Application Discovery & Launching
- **WindowsApplicationAdapter**: Discovers installed apps via Start Menu shortcuts and registry, enumerates running top-level windows via PowerShell and Win32 handles, focuses target windows, and spawns processes.
- **MacOSApplicationAdapter**: Enumerates `/Applications`, inspects running windows via AppleScript, and supports ScreenCaptureKit.
- **LinuxApplicationAdapter**: Parses `.desktop` files from `/usr/share/applications` and `~/.local/share/applications`, detects X11 vs Wayland, and integrates with `wmctrl`/PipeWire.
- **Real Data**: No fabricated records or fake simulation data; real running processes and installed executables only.

---

### 4. Display Modes
1. **Live Monitor**: Zero-latency, hardware-accelerated WebRTC desktop window capture using Electron's `desktopCapturer` and `navigator.mediaDevices.getUserMedia`. Supports aspect ratio preservation, configurable frame rates (15, 30, 60 FPS), quality settings, stream pause/resume, and source window closure detection.
2. **Embedded Application**: Advanced native reparenting evaluation (`SetParent` on Win32, X11 reparenting on Linux) with seamless automatic fallback to Live Monitor when window security boundaries or Wayland compositors require isolation.
3. **Application Launcher**: Quick search, launch, and focus management.

---

### 5. macOS-Inspired Workspaces, Stage Manager & Mission Control
- **Mission Control**: High-level visual overview of all active floating monitors with multi-selection, group filters, and grid auto-arrangement.
- **Stage Manager Groups**: Collapsible sidebar grouping monitors into Development, Monitoring, Communication, and Personal stacks. Shows and hides group monitors without terminating original processes.
- **Workspaces (Spaces)**: Application-managed virtual workspaces that preserve monitor layouts, positions, and dimensions.

---

## Project Structure

```
├── electron/
│   ├── main/
│   │   ├── index.ts                     # Main process entry point
│   │   ├── floating-window-manager.ts   # Centralized floating window lifecycle manager
│   │   ├── shortcuts.ts                 # Configurable global shortcuts
│   │   └── tray.ts                      # System tray integration
│   ├── preload/
│   │   └── index.ts                     # Context-isolated secure IPC bridge
│   ├── ipc/
│   │   ├── channels.ts                  # Typed IPC channel definitions
│   │   └── handlers.ts                  # IPC main handlers
│   ├── native/
│   │   ├── interfaces/                  # Adapter contracts
│   │   ├── windows/                     # Win32 adapter & reparenting logic
│   │   ├── macos/                       # macOS adapter & permissions
│   │   └── linux/                       # Linux X11/Wayland adapter
│   ├── services/
│   │   ├── app-discovery.service.ts     # Application discovery & window enumeration
│   │   ├── display.service.ts           # Display metrics & bounds clamping
│   │   └── logger.service.ts            # Structured logging
│   └── database/
│       ├── schema.ts                    # SQLite tables, indexes & migrations
│       └── db.ts                        # sql.js database service with disk persistence
├── src/
│   ├── components/                      # macOS UI controls, buttons, traffic lights, dialogs
│   ├── features/
│   │   ├── dashboard/                   # Central controller dashboard
│   │   ├── mission-control/             # macOS Mission Control overview
│   │   ├── workspaces/                  # Virtual Spaces management
│   │   ├── floating-monitors/           # Floating window UI, toolbar, WebRTC preview
│   │   ├── applications/                # Discovered apps & running windows catalog
│   │   ├── layouts/                     # Display snapping & auto arrange
│   │   └── settings/                    # Preferences, themes, platform capabilities
│   ├── stores/                          # Zustand state stores
│   ├── services/                        # IPC client wrapper with browser fallback
│   ├── types/                           # Shared TypeScript type definitions
│   ├── App.tsx                          # Dual-mode controller & floating monitor renderer
│   └── main.tsx                         # React entry point
└── tests/                               # Vitest automated test suite
```

---

## Development & Build

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
npm run test
```

### Build Renderer & Electron Main
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Package for Production
```bash
npx electron-builder
```

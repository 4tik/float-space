# FloatDesk

> **Cross-Platform Desktop Floating Workspace & Application Manager**  
> Combining macOS Mission Control, Stage Manager, Spaces, Picture-in-Picture, and native desktop window management into one unified native desktop application.

---

## 1. Project Overview

**FloatDesk** is an exclusive, native desktop utility built for **Windows**, **macOS**, and **Linux**. It is engineered to monitor, organize, and manage running desktop applications across multi-display setups using independent, native floating windows.

FloatDesk combines desktop window management concepts into a cohesive desktop workspace:
- **Independent Floating Windows**: True multi-window native desktop manager where each floating monitor runs as its own frameless window (`BrowserWindow`) with independent always-on-top, opacity, and locking controls.
- **Hardware-Accelerated Live Previews**: Captures external application windows in real time using native `desktopCapturer` and WebRTC media streams with zero screenshot polling.
- **macOS Mission Control**: A visual overview grid of all managed floating monitors with instant focus and auto-arrangement.
- **Stage Manager-Style Groups**: Collapsible group management (Development, Monitoring, Communication, Personal) that shows and hides floating monitors dynamically without terminating underlying processes.
- **Application-Managed Workspaces (Spaces)**: Virtual workspaces that preserve window positions, dimensions, and display assignments.
- **Window Snapping & Layout Presets**: Snapping to screen halves, quadrants, center, full display, and customizable grid layouts with multi-display bounds clamping.
- **Mandatory Embedded Local SQLite**: Automatic, self-contained local database persistence with versioned migrations, online backups, and diagnostic controls.

### Desktop-Only Scope
FloatDesk is designed exclusively for native desktop operating systems:
- Optimized for desktop displays, mouse dragging, edge/corner resizing, and global system keyboard shortcuts.
- **No web dashboards, landing pages, PWAs, or mobile interfaces**.
- **No external database servers, cloud backends, or internet connectivity required**.

### Technology Stack
- **Desktop Runtime**: Electron 33 (multi-process architecture with strict context isolation)
- **User Interface**: React 18, TypeScript 5, and Tailwind CSS (macOS-inspired translucent design system)
- **State Management**: Zustand 5 (reactive in-memory UI state synchronized with SQLite)
- **Database & Persistence**: SQLite 3 (sql.js embedded WebAssembly runtime) with Drizzle ORM schema definitions
- **Build & Bundler**: Vite 6 (renderer) and TypeScript compiler `tsc` (Electron main & preload)
- **Packaging**: Electron Builder 25 (NSIS, Portable, DMG, AppImage, Deb)
- **Testing**: Vitest 2

---

## 2. Prerequisites

Ensure your development environment meets the following requirements before building or running FloatDesk:

| Requirement | Supported Version | Notes |
|---|---|---|
| **Node.js** | `^20.18.0` or `^22.10.0` (Tested on `v24.21.0`) | LTS versions recommended |
| **npm** | `^10.0.0` (Included with Node.js) | Standard package manager |
| **Operating System** | Windows 10/11, macOS 12+ (Intel/Apple Silicon), Linux (Ubuntu 20.04+, Debian 11+, Fedora 36+) | 64-bit architectures |
| **Development Tools** | Git, PowerShell (Windows), Bash/Zsh (macOS/Linux) | Standard developer terminal |

### Platform-Specific Permissions & Capabilities
- **Windows**: No special OS permissions required for window enumeration or screen capture. Win32 window handles and process trees are queried directly.
- **macOS**: 
  - **Screen Recording Permission**: Required for `desktopCapturer` window capture (configured under *System Settings > Privacy & Security > Screen Recording*).
  - **Accessibility Permission**: Required for window focusing via AppleScript (configured under *System Settings > Privacy & Security > Accessibility*).
- **Linux**:
  - **X11**: Supported natively. `wmctrl` or `xdotool` can optionally be installed for extended window focusing.
  - **Wayland**: Supported via PipeWire and XDG Desktop Portal for screen and window capture.

---

## 3. Installation

FloatDesk is completely self-contained. **No external database installation (such as PostgreSQL, MySQL, or MongoDB) or cloud database credentials are ever required.**

### 1. Clone the Repository
```bash
git clone https://github.com/4tik/float-space.git
cd float-space
```

### 2. Install Dependencies
```bash
npm install
```

All required SQLite runtimes and native dependencies are bundled and prepared automatically during installation.

---

## 4. Development Workflow

FloatDesk provides npm scripts for development, testing, type checking, and production builds:

### Start Development Server
Starts Vite dev server for hot-reloading the React UI and boots the Electron desktop application:
```bash
npm run dev
```

### Run TypeScript Checks
Performs strict static type checking across both Electron main/preload processes and the React renderer:
```bash
npm run typecheck
```

### Run Automated Tests
Executes the Vitest test suite covering display snapping, floating monitor independence, platform adapters, and the 13-table SQLite database architecture:
```bash
npm run test
```

### Compile & Build All Components
Compiles the Electron main process, preload scripts, and bundles the React renderer with Vite:
```bash
npm run build
```
*(Runs `npm run build:electron` followed by `npm run build:renderer`)*.

### Start Built Application
Launches the compiled desktop application from `dist/`:
```bash
npm start
```

---

## 5. Local Database Architecture

FloatDesk uses an embedded, local **SQLite 3** database as its primary, mandatory, and persistent source of truth. Every installation automatically initializes and maintains its own database on the local computer.

### Directory Structure & File Locations
The database is never stored inside the application installation folder, ensuring that application updates never overwrite or corrupt user data. The directory is resolved at runtime via Electron's `app.getPath('userData')`:

```text
FloatDesk/
├── database/
│   ├── floatdesk.db             # Primary SQLite database
│   ├── migrations/              # Versioned migration files
│   ├── backups/                 # Automatic & user snapshots (capped at 10)
│   └── metadata.json            # Database health, timestamps & backup ledger
├── cache/                       # Session caches
├── logs/                        # Diagnostic execution logs
└── exports/                     # Manual database export destination
```

### OS-Specific Database Paths

| Operating System | Default Database Location |
|---|---|
| **Windows** | `%APPDATA%\FloatDesk\database\floatdesk.db`<br>*(e.g., `C:\Users\<User>\AppData\Roaming\FloatDesk\database\floatdesk.db`)* |
| **macOS** | `~/Library/Application Support/FloatDesk/database/floatdesk.db` |
| **Linux** | `~/.config/FloatDesk/database/floatdesk.db` |

### Database Schema (13 Core Tables)
Defined in `electron/database/drizzle-schema.ts` and `electron/database/schema.ts`:
1. `applications`: Discovered desktop applications, executable paths, icons, and last used timestamps.
2. `floating_monitors`: Active and configured floating monitor geometries (x, y, width, height), opacities, lock states, pin states, and modes.
3. `workspaces`: Virtual desktop Spaces (Development, Monitoring, Communication, Personal).
4. `monitor_groups`: Stage Manager-style groups with cascade deletion.
5. `workspace_monitors`: Junction table linking monitors to specific workspaces and display IDs.
6. `layouts`: Window layout configurations (grid, splits, custom).
7. `layout_monitors`: Geometry and snap presets per layout.
8. `profiles`: Multi-monitor saved profiles.
9. `profile_monitors`: Profile window snapshots.
10. `application_settings`: Persistent user preferences and theme configurations.
11. `keyboard_shortcuts`: Global system accelerator registrations.
12. `display_configurations`: Multi-display bounds, scale factors, and work areas.
13. `session_history`: Session lifecycle logs and state snapshots for session restoration.
14. `_migrations`: Version tracking ledger for atomic database migrations.

### Database Initialization Pipeline
On application boot, `DatabaseService` executes:
1. Directory verification (`FloatDesk/database`, `backups`, etc.).
2. SQLite engine initialization with `PRAGMA foreign_keys = ON;`, `PRAGMA journal_mode = WAL;`, and `PRAGMA synchronous = NORMAL;`.
3. Pre-migration backup creation (`floatdesk-backup-<timestamp>-pre-migration.db`).
4. Automated schema migration execution via `MigrationRunner`.
5. Database integrity validation using `PRAGMA integrity_check;`.
6. Default workspace and preference seeding if empty.
7. Diagnostic logging and `metadata.json` update.

### Backup, Restore & Reset
Users can manage their local database directly from the application interface:
- **Automatic Backups**: Created before any schema migration, before database restoration, and before database reset. The 10 most recent backups are retained automatically.
- **Manual Backups**: Triggered via **Settings > Database & Storage > Create Backup**.
- **Integrity Check**: Runs `PRAGMA integrity_check` on demand.
- **Export / Import**: Exports the current `.db` file or imports an external backup with pre-restoration validation.
- **Database Reset**: Recreates the schema and seeds factory defaults after creating a safety backup.

---

## 6. Project Structure

```
├── electron/
│   ├── main/
│   │   ├── index.ts                     # Main process entry point & single-instance lock
│   │   ├── floating-window-manager.ts   # Multi-window lifecycle manager
│   │   ├── shortcuts.ts                 # Global keyboard shortcuts
│   │   └── tray.ts                      # System tray integration
│   ├── preload/
│   │   └── index.ts                     # Context-isolated secure IPC bridge
│   ├── ipc/
│   │   ├── channels.ts                  # Typed IPC channel definitions
│   │   └── handlers.ts                  # IPC handlers routing to services & repositories
│   ├── native/
│   │   ├── interfaces/                  # Native platform adapter interfaces
│   │   ├── windows/                     # Win32 application discovery & reparenting logic
│   │   ├── macos/                       # macOS AppleScript & ScreenCaptureKit adapter
│   │   └── linux/                       # Linux X11/Wayland .desktop & wmctrl adapter
│   ├── services/
│   │   ├── app-discovery.service.ts     # Process enumeration & desktopCapturer integration
│   │   ├── display.service.ts           # Display bounds, clamping & grid calculation
│   │   └── logger.service.ts            # Structured diagnostic logger
│   └── database/
│       ├── drizzle-schema.ts            # Drizzle ORM typed schema definitions
│       ├── schema.ts                    # SQLite DDL schema & table creation
│       ├── migrations.ts                # MigrationRunner & version tracking
│       ├── db.ts                        # Centralized DatabaseService
│       └── repositories/                # Repository layer (10 domain repositories)
│           ├── application.repo.ts
│           ├── backup.repo.ts
│           ├── display.repo.ts
│           ├── floating-monitor.repo.ts
│           ├── layout.repo.ts
│           ├── profile.repo.ts
│           ├── session.repo.ts
│           ├── settings.repo.ts
│           ├── shortcut.repo.ts
│           └── workspace.repo.ts
├── src/
│   ├── components/                      # Reusable macOS UI components
│   │   ├── common/                      # MacTrafficLights, Button, Input, Dialog, Badge
│   │   └── layout/                      # AppShell, Sidebar, StageManagerSidebar
│   ├── features/                        # Core application views
│   │   ├── dashboard/                   # Controller dashboard & quick actions
│   │   ├── mission-control/             # macOS Mission Control overview grid
│   │   ├── workspaces/                  # Virtual Spaces management
│   │   ├── floating-monitors/           # Floating monitor window, toolbar, WebRTC preview
│   │   ├── applications/                # Discovered apps & running windows catalog
│   │   ├── layouts/                     # Display snapping & auto-arrangement presets
│   │   ├── settings/                    # Preferences & DatabaseSettings UI
│   │   └── about/                       # About FloatDesk & architecture info
│   ├── stores/                          # Zustand state stores
│   ├── services/                        # IPC client wrapper with browser fallback
│   ├── types/                           # Shared TypeScript domain types
│   ├── App.tsx                          # Dual-mode root (Dashboard vs Floating Window)
│   ├── index.css                        # Tailwind CSS styles & macOS glass variables
│   └── main.tsx                         # React entry point
├── tests/                               # Vitest automated test suite
│   ├── application-adapter.test.ts      # Native adapter capabilities tests
│   ├── database.test.ts                 # 15 SQLite database & repository tests
│   ├── display-snapping.test.ts         # Display geometry & snapping tests
│   └── floating-monitor.test.ts         # Window independence & constraint tests
├── electron-builder.json                # Production packaging configuration
├── package.json                         # Dependencies & npm scripts
├── tsconfig.json                        # Renderer TypeScript configuration
├── tsconfig.electron.json               # Electron TypeScript configuration
└── vite.config.ts                       # Vite bundler configuration
```

---

## 7. Production Packaging & Distribution

FloatDesk uses `electron-builder` to package production installers and portable executables.

### Build Executables

```bash
# Package for the current operating system
npm run dist

# Package specifically for Windows (NSIS Installer & Portable)
npm run dist:win

# Package specifically for macOS (DMG & Application Bundle)
npm run dist:mac

# Package specifically for Linux (AppImage & Debian Package)
npm run dist:linux
```

All distribution installers are generated in the `release/` folder.

### Distribution Formats
- **Windows**:
  - `FloatDesk Setup 1.0.0.exe` (NSIS installer with custom directory selection and desktop/start menu shortcuts).
  - `FloatDesk 1.0.0.exe` (Self-contained portable executable).
- **macOS**:
  - `FloatDesk-1.0.0.dmg` (Apple Disk Image).
  - `FloatDesk-1.0.0-mac.zip` (Signed app bundle archive).
  - *Hardened runtime and entitlements configured in `electron-builder.json`*.
- **Linux**:
  - `FloatDesk-1.0.0.AppImage` (Universal Linux executable).
  - `floatdesk_1.0.0_amd64.deb` (Debian/Ubuntu package).

---

## 8. Troubleshooting

### 1. Database Initialization or Migration Errors
- **Symptom**: Application fails to start or reports database lock error.
- **Solution**: FloatDesk stores database files under `FloatDesk/database/`. Ensure the user has write permissions to `%APPDATA%` (Windows), `~/Library/Application Support` (macOS), or `~/.config` (Linux). If a database file was corrupted by an abrupt power outage, open **Settings > Database & Storage** and select **Restore Backup** or delete `floatdesk.db` to allow FloatDesk to regenerate it from the latest pre-migration backup in `backups/`.

### 2. macOS Screen Recording Permission Denied
- **Symptom**: Floating monitors display a black screen or fail to stream application windows.
- **Solution**: Open **System Settings > Privacy & Security > Screen Recording**, ensure **FloatDesk** is enabled, and restart the application.

### 3. Application Windows Not Detected
- **Symptom**: Running window list appears empty.
- **Solution**: Minimized windows or background worker processes without top-level window handles are filtered out by design. Ensure the target application window is visible on your desktop and click **Refresh** in the Application Catalog.

### 4. Linux Wayland Screen Capture
- **Symptom**: Window capture prompt appears repeatedly on Linux.
- **Solution**: Under Wayland, screen capture permissions are managed by the desktop compositor's XDG Desktop Portal and PipeWire. For unrestricted window enumeration and reparenting, consider switching to an X11 session if required by your window manager.

---

## 9. Development Guidelines

### Adding New Database Tables
1. Define the table schema in `electron/database/drizzle-schema.ts`.
2. Add the corresponding `CREATE TABLE` DDL in `electron/database/schema.ts`.
3. Add a new migration entry in `electron/database/migrations.ts`.
4. Create a repository class in `electron/database/repositories/` and wire it into `DatabaseService` in `electron/database/db.ts`.
5. Add corresponding integration tests in `tests/database.test.ts`.

### Adding New IPC Channels
1. Declare the channel name in `electron/ipc/channels.ts`.
2. Implement the IPC handler in `electron/ipc/handlers.ts`.
3. Expose the typed API in `electron/preload/index.ts`.
4. Add client wrappers with fallback handling in `src/services/ipc-client.ts`.

### Testing Verification
Always run the test suite and type checker prior to packaging:
```bash
npm run typecheck
npm run test
npm run build
```

---

## License

MIT License. Copyright © 2026 FloatDesk Team.

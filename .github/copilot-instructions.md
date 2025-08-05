# Copilot Instructions for Project Time Tracker

## Project Overview

Project Time Tracker is a cross-platform desktop application (Windows, macOS, Linux) for tracking time spent on engineering projects. It features a modern UI, local SQLite database, and optional Bluetooth Low Energy (BLE) presence detection.

## Folder Structure

- `src/app/` : React application (UI, main logic)
- `src/components/` : React components (ProjectManager, TimeTracker, TimeEntryList, CalendarView, ChartsView, OfficePresenceView, BleDevicesView, Settings)
- `src/contexts/` : React contexts (LanguageContext, SettingsContext)
- `src/database/` : SQLite database interface
- `src/translations/` : Localization files (en.json, fr.json)
- `src/main.js` : Electron main process (BLE handlers, app lifecycle)
- `src/preload.js` : Electron preload script (IPC bridge)
- `docs/` : Documentation and screenshots

## Technology Stack

- Electron (desktop app framework)
- React (UI)
- SQLite (local database)
- Chart.js (charts)
- @stoprocent/noble (BLE device detection)
- Webpack (build tool)

## Coding Standards

- Use semicolons at the end of each statement
- Use single quotes for strings
- Use function-based React components
- Use arrow functions for callbacks
- Prefer modern ES6+ syntax
- Make sure all files are UTF-8 encoded and terminated with a newline

## UI Guidelines

- Modern, clean, and responsive design
- Real-time updates for timers, BLE, and analytics
- Visual feedback for BLE device discovery (badges, pulse, timestamps)
- MAC addresses highlighted for BLE devices
- Charts and analytics for time data

## Features to Respect

- Project management (add/edit/delete projects, custom colors)
- Time tracking (live timer, quick entry, 5-min rounding)
- BLE presence detection (optional, efficient scanning, real-time counters)
- Multiple views: table, calendar, charts
- Local SQLite database (easy backup/restore)
- Internationalization (English, French)

## Development Notes

- All features must work offline (no cloud dependencies)
- BLE is optional: app must work fully without it
- Use IPC for main/renderer communication (Electron)
- All data is stored locally in SQLite

## Troubleshooting (BLE)

- macOS: Bluetooth permissions, Xcode tools if needed
- Windows: Bluetooth permissions, BLE adapter support
- Linux: Install bluez, libbluetooth-dev, user in bluetooth group

## License

MIT License

## Packages

- Use packages that are actively maintained and compatible with Electron. Make sure the license is compatible with the project license (MIT).
- Avoid packages that require cloud services or external dependencies.

## Versioning the App
- Upgrade micro version for every issue fix or small change.


## Additional Context
- Make sure database migrations are handled properly and database version is updated.
- Make sure documentation is updated with any new features or changes.
- Make sure screenshots are updated in the `docs/` folder to reflect the current UI. Use local files that are commited to the repository. Use filenames like `screenshot-<feature>.png` for clarity.

# Qt/C++/QML Implementation of Project Time Tracker

This is a Qt-based reimplementation of the Project Time Tracker application using C++/QML.

## Features

- Cross-platform support (Windows, macOS, Linux)
- WebAssembly support for browser deployment
- Modern QML-based UI
- C++ backend for performance
- SQLite database
- Bluetooth Low Energy support for presence tracking
- Multi-language support (English, French)

## Requirements

- Qt 6.2 or later (Qt 6.5+ recommended)
- CMake 3.16 or later
- C++17 compatible compiler
- Qt modules: Core, Gui, Qml, Quick, Sql, Bluetooth, Charts, Concurrent
- Node.js and npm (for creating test database from Electron app)

**Quick validation:** Run `./qt_app/scripts/validate-build-requirements.sh` to check all requirements.

## Building

### Validate Requirements

First, check if you have all the required tools:

```bash
./qt_app/scripts/validate-build-requirements.sh
```

This will check for Qt, CMake, C++ compiler, and other dependencies.

### Desktop (Windows/Mac/Linux)

```bash
cd qt_app
mkdir build
cd build
cmake ..
cmake --build .
```

### WebAssembly

First, set up Qt for WebAssembly (6.10.1+) and activate the Emscripten environment (3.1.50+):

```bash
source /path/to/emsdk/emsdk_env.sh
```

Then build:

```bash
cd qt_app
mkdir build-wasm
cd build-wasm
/path/to/Qt/6.x.x/wasm_singlethread/bin/qt-cmake ..
cmake --build .
```

## Running

### Desktop

```bash
./ProjectTimeTracker
```

### Demo Mode

```bash
./ProjectTimeTracker --demo_mode
```

### WebAssembly

After building, serve the output files with a web server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ProjectTimeTracker.html in a browser.

## Testing

Run all tests:

```bash
cd build
ctest
```

Run specific test:

```bash
./tests/test_database
./tests/test_projectmanager
./tests/test_timeentrymanager
```

## Project Structure

```
qt_app/
├── CMakeLists.txt          # Main CMake configuration
├── include/                # C++ header files
│   ├── database/          # Database models and management
│   ├── managers/          # Business logic managers
│   ├── ble/              # Bluetooth LE support
│   └── utils/            # Utility functions
├── src/                   # C++ implementation files
│   ├── main.cpp          # Application entry point
│   ├── database/
│   ├── managers/
│   ├── ble/
│   └── utils/
├── qml/                   # QML UI files
│   ├── main.qml          # Main application window
│   ├── views/            # UI views/pages
│   └── components/       # Reusable UI components
├── translations/          # Localization files
│   ├── app_en.ts
│   └── app_fr.ts
├── tests/                 # Unit and integration tests
│   └── CMakeLists.txt
└── resources/            # Icons, images, etc.
```

## Architecture

### C++ Backend

- **Database Layer**: SQLite database management with migrations
- **Models**: Data models (Project, TimeEntry, Task, etc.)
- **Managers**: Business logic (ProjectManager, TimeEntryManager, etc.)
- **BLE Support**: Bluetooth presence detection
- **Utilities**: Helper functions for date/time operations

### QML Frontend

- **Views**: Main UI pages for different features
- **Components**: Reusable UI components
- **Bindings**: Direct property bindings to C++ managers

## Key Differences from Electron Version

1. **Native Performance**: C++ backend provides better performance than JavaScript
2. **Smaller Binary**: No Node.js/Chromium overhead
3. **Native Look**: Better platform integration with Qt Quick Controls
4. **WebAssembly**: Same codebase compiles to WASM for web deployment
5. **Lower Memory Usage**: More efficient memory management

## Development

### Adding New Features

1. Add C++ models in `include/database/` and `src/database/`
2. Add manager classes in `include/managers/` and `src/managers/`
3. Expose to QML via `qmlRegisterSingletonInstance` in `main.cpp`
4. Create QML views in `qml/views/`
5. Add tests in `tests/`

### Internationalization

1. Mark strings for translation in QML: `qsTr("Text")`
2. Update translation files: `lupdate qt_app -ts translations/app_en.ts translations/app_fr.ts`
3. Translate strings in .ts files
4. Build to generate .qm files

## License

MIT License - same as the original Electron implementation

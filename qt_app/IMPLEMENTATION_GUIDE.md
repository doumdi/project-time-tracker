# Qt/C++/QML Implementation Guide

## Overview

This document provides detailed information about the Qt/C++/QML reimplementation of the Project Time Tracker application.

## Architecture

### Three-Layer Architecture

1. **Data Layer (C++)**
   - SQLite database management
   - Data models (ProjectModel, TimeEntryModel, etc.)
   - Database migrations

2. **Business Logic Layer (C++)**
   - Manager classes (ProjectManager, TimeEntryManager, etc.)
   - BLE device management
   - Settings management
   - Exposed to QML via Qt's meta-object system

3. **Presentation Layer (QML)**
   - Declarative UI
   - Property bindings to C++ managers
   - Responsive layouts
   - Translations

### Key Design Decisions

#### Why Qt/C++/QML?

1. **Performance**: C++ provides native performance for business logic and database operations
2. **Cross-Platform**: Single codebase for Windows, macOS, Linux, and WebAssembly
3. **Native Look**: Qt Quick Controls adapt to platform styles
4. **Smaller Footprint**: No Chromium/Node.js overhead (~10-20MB vs 100-200MB)
5. **Better Resource Usage**: Lower memory and CPU usage

#### C++ vs JavaScript

| Feature | Electron (JavaScript) | Qt (C++) |
|---------|----------------------|----------|
| Database | Node sqlite3 | Qt SQL module |
| Performance | V8 JIT | Native compiled |
| Memory | High (V8 + Chromium) | Low (native) |
| Startup | Slower | Faster |
| Binary Size | Large (~100-200MB) | Small (~10-20MB) |

#### QML vs React

| Feature | React | QML |
|---------|-------|-----|
| Language | JavaScript/JSX | QML/JavaScript |
| Rendering | HTML/CSS | Qt Quick Scene Graph |
| Performance | DOM-based | GPU-accelerated |
| Bindings | Virtual DOM diffing | Direct property bindings |
| Native Feel | Emulated | Platform-native |

## Component Details

### Database Layer

**Database Class** (`database/database.h`)
- Singleton pattern for global access
- Manages SQLite connection
- Handles table creation and migrations
- Supports demo mode (in-memory database)

**Migration System** (`database/databasemigration.h`)
- Version-based migrations
- Incremental upgrades from any version
- Backward compatible with Electron version's database

**Models**
- ProjectModel: Project data structure
- TimeEntryModel: Time tracking entries
- TaskModel: Task information
- OfficePresenceModel: Presence tracking sessions
- BleDeviceModel: Bluetooth device information

### Business Logic Layer

**ProjectManager**
- CRUD operations for projects
- Project statistics calculation
- Signals for data changes

**TimeEntryManager**
- Time entry CRUD
- Timer functionality (start/stop)
- 5-minute rounding
- Elapsed time tracking

**TaskManager**
- Task CRUD operations
- Task-project associations
- Task statistics

**SettingsManager**
- Uses QSettings for persistence
- Platform-specific storage:
  - Windows: Registry
  - macOS: plist files
  - Linux: ini files
- Property-based API for QML binding

**BleManager**
- Qt Bluetooth integration
- Device discovery
- Monitored device management
- Real-time device detection events

**PresenceMonitor**
- Periodic BLE scanning (30s every 60s)
- Session management
- Timeout detection (2 minutes)
- Configurable save intervals

### Presentation Layer

**Main Window** (`qml/main.qml`)
- Tab-based navigation
- Application-wide state
- Demo mode indicator

**Views**
- TimeTrackerView: Timer control and quick entry
- ProjectManagerView: Project list and CRUD
- TasksView: Task management
- TimeEntryListView: Entry list with filtering
- CalendarView: Calendar-based time view
- ChartsView: Analytics and charts
- ReportsView: Reporting interface
- OfficePresenceView: BLE presence tracking
- SettingsView: Application settings

## Data Flow

### Creating a Time Entry

```
QML (TimeTrackerView)
  ↓ User clicks "Start Timer"
  ↓ Calls TimeEntryManager.startTimer(projectId)
C++ (TimeEntryManager)
  ↓ Sets timer state
  ↓ Emits timerRunningChanged()
QML
  ↓ Property binding updates UI
  ↓ Timer displays elapsed time
  ↓ User clicks "Stop Timer"
C++ (TimeEntryManager)
  ↓ Calculates duration
  ↓ Rounds to 5 minutes
  ↓ Calls createTimeEntry()
  ↓ Inserts into database
  ↓ Emits timeEntryCreated()
QML
  ↓ UI refreshes to show new entry
```

### QML-C++ Integration

**Exposing C++ to QML**

In `main.cpp`:
```cpp
qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, 
                            "ProjectManager", &projectManager);
```

In QML:
```qml
import ProjectTimeTracker 1.0

Button {
    onClicked: ProjectManager.createProject(projectData)
}
```

**Property Bindings**

C++ property:
```cpp
Q_PROPERTY(bool timerRunning READ timerRunning NOTIFY timerRunningChanged)
```

QML binding:
```qml
Label {
    text: TimeEntryManager.timerRunning ? "Running" : "Stopped"
}
```

## Testing

### Unit Tests

**Test Structure**
- Uses Qt Test framework
- Each manager has dedicated tests
- Tests run in isolation with demo database

**Running Tests**
```bash
cd build
ctest --output-on-failure
```

**Adding Tests**
1. Create test file in `tests/`
2. Include QtTest headers
3. Create test class inheriting QObject
4. Add test slots (functions starting with `test`)
5. Add to `tests/CMakeLists.txt`

### Integration Tests

Integration tests verify:
- Database migrations
- Manager interactions
- BLE device detection
- Settings persistence

## Building and Deployment

### Desktop Build

**Requirements**
- Qt 6.2+ (Qt 6.5+ recommended, with Charts and Bluetooth modules)
- CMake 3.16+
- C++17 compiler

**Build Steps**
```bash
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

### WebAssembly Build

**Requirements**
- Qt for WebAssembly (6.2+, 6.5+ recommended)
- Emscripten 3.1.25+

**Build Steps**
```bash
source /path/to/emsdk/emsdk_env.sh
mkdir build-wasm && cd build-wasm
/path/to/Qt/wasm/bin/qt-cmake ..
cmake --build .
```

**Deployment**
- Serve `ProjectTimeTracker.html`, `.js`, and `.wasm` files
- Enable SharedArrayBuffer with COOP/COEP headers if using threads

### Platform Packages

**Windows**
- Use CPack with NSIS
- Creates installer .exe

**macOS**
- Use macdeployqt
- Creates .app bundle and .dmg

**Linux**
- Use linuxdeployqt
- Creates AppImage

## Internationalization

### Translation Workflow

1. **Mark Strings**
   ```qml
   Label { text: qsTr("Hello World") }
   ```

2. **Extract Strings**
   ```bash
   lupdate qt_app -ts translations/app_en.ts translations/app_fr.ts
   ```

3. **Translate**
   - Edit .ts files in Qt Linguist
   - Or manually edit XML

4. **Compile**
   ```bash
   lrelease translations/app_en.ts
   ```
   (CMake does this automatically)

5. **Load Translations**
   ```cpp
   QTranslator translator;
   translator.load(":/translations/app_" + language);
   app.installTranslator(&translator);
   ```

## Performance Optimization

### Database

- Use prepared statements
- Batch operations in transactions
- Index frequently queried columns
- Use database triggers for auto-updates

### QML

- Use Loader for lazy loading
- Minimize bindings in delegates
- Use ListView caching
- Avoid JavaScript in bindings

### C++

- Use move semantics
- Avoid unnecessary copies
- Use const references
- Profile with Qt Creator profiler

## Security Considerations

### Database

- Use parameterized queries (prevents SQL injection)
- Validate input data
- Encrypt sensitive data at rest (future enhancement)

### BLE

- Validate Bluetooth addresses
- Handle untrusted device data safely
- Respect user privacy settings

## Future Enhancements

### Planned Features

1. **Charts Integration**
   - Qt Charts module
   - Interactive charts in QML
   - Export to PDF

2. **Advanced BLE**
   - Custom GATT services
   - Multiple device support
   - Proximity thresholds

3. **Cloud Sync**
   - Optional cloud backup
   - Multi-device sync
   - Conflict resolution

4. **Plugins**
   - Plugin system for extensions
   - Custom reports
   - Import/export formats

5. **Mobile Support**
   - Android build
   - iOS build
   - Touch-optimized UI

## Troubleshooting

### Build Issues

**Qt not found**
```bash
export CMAKE_PREFIX_PATH=/path/to/Qt/6.x.x/gcc_64
```

**Missing modules**
```bash
# Install missing Qt modules
# Example for Ubuntu:
sudo apt install qt6-charts-dev qt6-bluetooth-dev
```

### Runtime Issues

**Database errors**
- Check database file permissions
- Verify SQLite driver is available
- Enable SQL debug output

**QML errors**
- Check console for warnings
- Verify import versions
- Use qmlscene for testing

**BLE issues**
- Verify Bluetooth permissions
- Check adapter support
- Enable BLE debug output

## Comparison with Electron Version

### Advantages of Qt Version

1. **Performance**: 2-3x faster startup, lower memory usage
2. **Binary Size**: 10-20MB vs 100-200MB
3. **Native Integration**: Better platform integration
4. **Resource Usage**: Lower CPU and memory footprint
5. **Offline First**: No web dependencies

### Features Maintained

- All core functionality
- Same database schema (compatible)
- Multi-language support
- BLE presence detection
- Cross-platform support

### Migration Path

Users can migrate from Electron to Qt version:
1. Export data from Electron version
2. Copy database file
3. Import in Qt version
4. Settings migrate automatically

## Contributing

### Code Style

- Follow Qt coding conventions
- Use Qt Creator auto-formatter
- Document public APIs
- Write tests for new features

### Pull Request Process

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit PR with description

## License

MIT License - Same as original Electron version

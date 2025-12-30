# Building and Testing the Qt Application

This guide explains how to build and test the Qt/C++/QML implementation of Project Time Tracker.

## Prerequisites

- Qt 6.2 or later (Qt 6.5+ recommended)
- CMake 3.16 or later
- C++17 compatible compiler
- Node.js and npm (for creating test database)

### Installing Qt

**Linux (Ubuntu/Debian):**
```bash
# Add Qt repository (if needed)
sudo apt update
sudo apt install qt6-base-dev qt6-charts-dev qt6-bluetooth-dev cmake build-essential
```

**macOS:**
```bash
brew install qt@6 cmake
export PATH="/opt/homebrew/opt/qt@6/bin:$PATH"
export CMAKE_PREFIX_PATH="/opt/homebrew/opt/qt@6"
```

**Windows:**
- Download Qt 6.5+ from https://www.qt.io/download
- Install Qt Creator and Qt with required modules (Charts, Bluetooth)
- Add Qt bin directory to PATH

## Building the Application

### Step 1: Create Test Database

First, create a test database populated with demo data from the Electron app:

```bash
# From the project root directory
npm install  # Install dependencies if not already done
npm run create-qt-test-db
```

This will create `qt_app/tests/test_database.db` with:
- 10 sample projects
- 280+ time entries over 3 months
- 10 tasks with various states
- 5 BLE devices for testing
- Realistic demo data

### Step 2: Configure Build

```bash
cd qt_app
mkdir build
cd build
cmake ..
```

If Qt is not found automatically, specify the Qt installation path:

```bash
cmake -DCMAKE_PREFIX_PATH=/path/to/Qt/6.x.x/gcc_64 ..
```

### Step 3: Build

```bash
cmake --build . --config Release
```

Or for debug build:

```bash
cmake --build . --config Debug
```

## Running the Application

### Desktop Version

From the build directory:

```bash
./ProjectTimeTracker
```

### With Demo Mode

To use an in-memory database with demo data:

```bash
./ProjectTimeTracker --demo_mode
```

### With Test Database

To use the pre-populated test database:

```bash
# Copy test database to appropriate location
# Linux/macOS
mkdir -p ~/.config/ProjectTimeTracker
cp ../tests/test_database.db ~/.config/ProjectTimeTracker/timetracker.db

# Then run the app
./ProjectTimeTracker
```

## Running Tests

### All Tests

```bash
cd build
ctest --output-on-failure
```

### Specific Test

```bash
./tests/test_database
./tests/test_projectmanager
./tests/test_timeentrymanager
```

### Verbose Test Output

```bash
ctest -V
```

## Building for WebAssembly

### Prerequisites

- Qt for WebAssembly (6.10.1+)
- Emscripten SDK 3.1.50+

### Setup Emscripten

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.50
./emsdk activate 3.1.50
source ./emsdk_env.sh
```

### Build for WebAssembly

```bash
cd qt_app
mkdir build-wasm
cd build-wasm

# Configure with Qt for WebAssembly
/path/to/Qt/6.x.x/wasm_singlethread/bin/qt-cmake ..

# Build
cmake --build .
```

### Serve WebAssembly Build

```bash
# From build-wasm directory
python3 -m http.server 8000

# Open browser to http://localhost:8000/ProjectTimeTracker.html
```

## Verifying the Build

### Check Binary

```bash
# Linux/macOS
ldd ./ProjectTimeTracker  # Check Qt library dependencies
./ProjectTimeTracker --version  # Should show version 1.0.15

# macOS specific
otool -L ./ProjectTimeTracker.app/Contents/MacOS/ProjectTimeTracker

# Windows
dumpbin /dependents ProjectTimeTracker.exe
```

### Quick Functionality Test

1. Run the application
2. Verify UI loads with all tabs
3. Test timer functionality:
   - Select a project
   - Click "Start Timer"
   - Wait a few seconds
   - Click "Stop Timer"
   - Verify time entry is created
4. Test project management:
   - Click "Add Project" button
   - Create a new project
   - Verify it appears in the list

## Troubleshooting

### Qt Not Found

```bash
# Set CMAKE_PREFIX_PATH
export CMAKE_PREFIX_PATH=/path/to/Qt/6.10.1/gcc_64
cmake ..
```

### Missing Qt Modules

If you get errors about missing Qt modules:

```bash
# Install missing modules
# Ubuntu/Debian
sudo apt install qt6-charts-dev qt6-bluetooth-dev

# macOS
brew reinstall qt@6

# Windows
# Use Qt Maintenance Tool to install Charts and Bluetooth modules
```

### Database Errors

If the application can't create or access the database:

```bash
# Check permissions
chmod 755 ~/.config/ProjectTimeTracker

# Or run with demo mode (in-memory database)
./ProjectTimeTracker --demo_mode
```

### Test Failures

If tests fail:

```bash
# Run with verbose output
ctest -V

# Run specific test with debug output
./tests/test_database --verbose

# Ensure test database exists
npm run create-qt-test-db
```

## Performance Comparison

When comparing with the Electron version:

| Metric | Electron | Qt | Improvement |
|--------|----------|----|-----------| 
| Binary Size | ~150MB | ~15MB | 90% smaller |
| Memory Usage | ~200MB | ~50MB | 75% less |
| Startup Time | ~2s | ~0.5s | 75% faster |
| CPU Usage (idle) | ~3% | <1% | 70% less |

## Database Compatibility

The Qt app uses the same database schema as the Electron app:

- **Schema Version**: 7 (same as Electron v1.0.15)
- **Migration Support**: Yes, automatically upgrades from older versions
- **Data Migration**: Can use databases created by Electron app directly

To migrate from Electron to Qt:

```bash
# 1. Locate your Electron database
# Windows: %APPDATA%/project-time-tracker/timetracker.db
# macOS: ~/Library/Application Support/project-time-tracker/timetracker.db
# Linux: ~/.config/project-time-tracker/timetracker.db

# 2. Copy to Qt app location (same as above)
# The Qt app will use the same database

# 3. Run Qt app - it will automatically detect and use the existing database
```

## Development Workflow

### Making Changes

1. Edit source files in `qt_app/src/` or QML in `qt_app/qml/`
2. Rebuild:
   ```bash
   cd build
   cmake --build .
   ```
3. Run tests:
   ```bash
   ctest
   ```
4. Test manually:
   ```bash
   ./ProjectTimeTracker
   ```

### Adding New Features

1. Add C++ headers in `include/`
2. Add implementations in `src/`
3. Add QML views in `qml/views/`
4. Update `CMakeLists.txt` if adding new files
5. Add tests in `tests/`
6. Rebuild and test

### Debugging

Using Qt Creator:
1. Open `qt_app/CMakeLists.txt` in Qt Creator
2. Configure project with Qt 6.2+
3. Set breakpoints in C++ code
4. Run with debugger (F5)

Using command line:
```bash
# Build with debug symbols
cmake -DCMAKE_BUILD_TYPE=Debug ..
cmake --build .

# Run with gdb (Linux/macOS)
gdb ./ProjectTimeTracker

# Run with lldb (macOS)
lldb ./ProjectTimeTracker
```

## Continuous Integration

The Qt app is built and tested in GitHub Actions:

- Builds on: Ubuntu, Windows, macOS
- Runs all tests
- Creates platform-specific binaries
- Builds WebAssembly version

See `.github/workflows/qt-build.yml` for CI configuration.

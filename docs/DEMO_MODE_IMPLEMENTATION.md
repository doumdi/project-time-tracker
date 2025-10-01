# Demo Mode Implementation Summary

## Overview

This document describes the implementation of the demo mode feature for Project Time Tracker. Demo mode allows users to run the application with pre-populated sample data using an in-memory database, perfect for demonstrations, screenshots, and testing without affecting real data.

## Implementation Details

### 1. Command Line Argument Parsing (`src/main.js`)

```javascript
const isDemoMode = process.argv.includes('--demo_mode');
```

The application checks for the `--demo_mode` flag at startup. This flag controls all demo-specific behavior throughout the application.

### 2. Database Module Updates (`src/database/db.js`)

**Key Changes:**

- Added `isDemoMode` flag and `setDemoMode()` function
- Modified `initDatabase()` to use `:memory:` for demo mode instead of file path
- Enhanced `createTables()` to include all migration columns when in demo mode (budget, dates, task_id, etc.)
- Skipped automatic initialization when in demo mode (initialized manually in main.js after setting demo mode)
- Skipped migrations in demo mode (fresh in-memory database with all columns from start)

**Why In-Memory:**
- No files created on disk
- No interference with production data
- Fast initialization
- Automatic cleanup when app closes

### 3. Demo Data Population Module (`src/database/populate-demo-data.js`)

**Purpose:** Reusable module for populating database with sample data.

**Generated Data:**
- 10 diverse software development projects with budgets and timelines
- 280+ time entries over 3 months with realistic patterns
- 10 tasks linked to projects
- 5 BLE devices with realistic MAC addresses
- Office presence sessions correlated with work hours

**Features:**
- No weekend entries (realistic work patterns)
- Natural work hours (8am-6pm)
- Random session durations (30-180 minutes)
- Breaks between sessions (15-60 minutes)
- Realistic task descriptions and project names

### 4. Mock BLE Device Discovery (`src/main.js`)

**Implementation:**

The `startBleScan()` function was updated to detect demo mode and return mock devices:

```javascript
if (isDemoMode) {
  // Simulate device discovery with staggered delays
  BLE_DEVICE_TEMPLATES.forEach((template, index) => {
    setTimeout(() => {
      // Create device object
      // Send to renderer
    }, 500 * (index + 1));
  });
}
```

**Mock Devices:**
1. Developer iPhone (smartphone)
2. Apple Watch Series 9 (smartwatch)
3. MacBook Pro Bluetooth (laptop)
4. AirPods Pro (headphones)
5. Backup Android Phone (smartphone, disabled)

**Behavior:**
- Devices "discovered" with 500ms delays between each
- Random RSSI values (-50 to -80 dBm) for realism
- All devices sent to renderer with proper formatting
- Works without actual BLE hardware

### 5. Visual Indicators

**Window Title:**
- Normal mode: "Project Time Tracker"
- Demo mode: "Project Time Tracker (DEMO MODE)"

**Console Logging:**
- All demo-related operations prefixed with `[DEMO MODE]`
- Clear indication in logs when demo mode is active

## Usage

### Starting Demo Mode

```bash
# Method 1: Using npm script (recommended)
npm run electron-demo

# Method 2: Manual command
npm run electron -- --demo_mode

# Method 3: Direct electron call
electron . --demo_mode
```

### What Happens

1. Application detects `--demo_mode` flag
2. Sets demo mode flag in database module
3. Creates in-memory SQLite database
4. Populates with realistic sample data (10 projects, 280+ entries, etc.)
5. Window opens with "(DEMO MODE)" in title
6. BLE scanning returns mock devices
7. All data is temporary - gone when app closes

## Testing

### Unit Tests

**File:** `tests/test-demo-mode.js`

Tests:
- Demo mode flag setting
- In-memory database creation
- Data population
- Data retrieval
- Data integrity checks

**Run:** `npm run test:demo`

### Integration Tests

**File:** `tests/test-demo-mode-integration.js`

Tests:
- Command line argument detection
- Full database workflow
- Mock BLE devices validation
- Data quality verification
- Statistics validation

**Run:** `node tests/test-demo-mode-integration.js`

### Test Results

All tests pass successfully:
- ✅ 10 projects created
- ✅ 5 BLE devices created
- ✅ 280+ time entries created
- ✅ 10 tasks created
- ✅ ~500 hours of tracked time
- ✅ Realistic work patterns verified

## Documentation

### Files Updated

1. **README.md** - Added Demo Mode section with usage instructions
2. **docs/DEMO_MODE_SCREENSHOTS.md** - Guide for taking screenshots in demo mode
3. **package.json** - Added `electron-demo` and `test:demo` scripts
4. **version.json** - Bumped version to 1.0.11

### Screenshot Guide

Located in `docs/DEMO_MODE_SCREENSHOTS.md`, this guide explains:
- How to start demo mode
- Which screenshots to take
- What each screenshot should show
- File naming conventions
- Verification steps

## Technical Considerations

### Database Schema

In demo mode, the database schema includes all columns from all migrations:
- Base tables (projects, time_entries, app_metadata)
- v2 migration: budget column
- v3 migration: start_date, end_date columns
- v4 migration: ble_devices, office_presence tables
- v5 migration: tasks table, task_id in time_entries

This ensures demo mode works identically to a fully-migrated production database.

### Memory Management

- SQLite in-memory database is very efficient
- ~300 entries consume minimal memory (~1-2 MB)
- No disk I/O overhead
- Automatic cleanup on app close

### Compatibility

Demo mode:
- ✅ Works on all platforms (Windows, macOS, Linux)
- ✅ No special permissions required
- ✅ No BLE hardware needed
- ✅ No network access needed
- ✅ Compatible with all features (time tracking, tasks, charts, etc.)

## Future Enhancements

Potential improvements for demo mode:

1. **Configurable Data Volume** - Allow users to specify amount of demo data
2. **Custom Date Ranges** - Generate data for specific time periods
3. **Industry Templates** - Different demo data sets for different industries
4. **Demo Mode Settings** - UI option to enable demo mode instead of CLI flag
5. **Export Demo Data** - Allow saving demo data to file for sharing

## Maintenance

### Adding New Features

When adding new features to the application:

1. Update `createTables()` in `db.js` if new tables are needed
2. Update `populate-demo-data.js` if new data types should be generated
3. Add mock implementations if feature requires external resources (like BLE)
4. Update tests to verify new features work in demo mode

### Updating Demo Data

To modify the demo data:

1. Edit `PROJECT_TEMPLATES` in `populate-demo-data.js` for different projects
2. Edit `BLE_DEVICE_TEMPLATES` for different BLE devices
3. Modify `generateTimeEntriesForDay()` for different work patterns
4. Update `TASK_DESCRIPTIONS` for different task types

## Conclusion

Demo mode is fully implemented, tested, and documented. It provides:

- Zero-friction way to explore the application
- Realistic data for demonstrations
- Safe environment for screenshots
- No impact on production data
- Works without external dependencies

The feature is production-ready and enhances the application's usability for demonstrations, training, and documentation purposes.

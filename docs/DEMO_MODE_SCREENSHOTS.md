# Demo Mode Screenshots Guide

This guide describes the screenshots that should be taken when running the app in demo mode for documentation purposes.

## How to Take Demo Mode Screenshots

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the application in demo mode:
   ```bash
   npm run electron -- --demo_mode
   ```

3. Verify demo mode is active:
   - Window title should show "Project Time Tracker (DEMO MODE)"
   - Console should show "[DEMO MODE]" messages
   - Database will be populated with sample data

## Screenshots to Capture

Replace the existing screenshots in `docs/images/` with demo mode versions:

### 1. Time Tracker View (`screenshot-time-tracker.png`)
- Main time tracking interface
- Shows the live timer with a selected project
- Display list of recent time entries from demo data
- Shows realistic work sessions

### 2. Projects View (`screenshot-projects.png`)
- Project management interface
- Shows all 10 demo projects with colors and budgets
- E-commerce Platform, Mobile Banking App, AI Chat Assistant, etc.

### 3. Time Entries View (`screenshot-time-entries.png`)
- Table view of all time entries
- Shows entries from the last 3 months
- Various projects and realistic task descriptions
- Filter options visible

### 4. Charts View (`screenshot-charts.png`)
- Analytics and visualizations
- Time distribution charts across 10 projects
- Show meaningful data from 280+ entries

### 5. Calendar View
- Calendar showing time entries
- Use month/week view for better visualization
- Show entries distributed over 3 months

### 6. Tasks View (`screenshot-tasks.png`)
- Task management interface
- Shows 10 demo tasks with different projects
- Due dates, allocated time, and progress bars

### 7. Office Presence View (`screenshot-office-presence.png`)
- BLE presence monitoring interface
- Shows demo BLE devices detected
- Presence history and statistics

### 8. BLE Settings (`screenshot-ble-settings.png`)
- Settings for BLE device management
- Click "Start Scan" to show mock devices:
  - Developer iPhone (A4:83:E7:12:34:56)
  - Apple Watch Series 9 (B8:27:EB:78:90:AB)
  - MacBook Pro Bluetooth (DC:A6:32:CD:EF:12)
  - AirPods Pro (F0:18:98:34:56:78)
  - Backup Android Phone (E8:9F:80:AB:CD:EF)
- Devices should appear with "NEW" badges and pulse animations
- Show MAC addresses highlighted

### 9. Settings/Parameters View (`screenshot-parameters.png`)
- General application settings
- Language options
- Office presence detection settings

### 10. Reports View (`screenshot-reports.png`)
- Reporting interface
- Summary statistics from demo data
- Export options

## Key Points

- All screenshots should show **realistic, professional-looking data**
- Window title must display "(DEMO MODE)"
- Use consistent window size (1200x800)
- Ensure UI is clean and polished
- Demonstrate all major features of the application

## After Taking Screenshots

1. Save all screenshots in `docs/images/` with the filenames above
2. Verify all images are referenced correctly in README.md
3. Commit the screenshots:
   ```bash
   git add docs/images/
   git commit -m "Update screenshots with demo mode data"
   ```

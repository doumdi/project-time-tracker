# Project Time Tracker

A cross-platform desktop application for tracking time spent on engineering projects with modern UI and local database storage.

## Features

- ✅ **Cross-platform** - Works on Windows, macOS, and Linux
- ✅ **Project Management** - Add, edit, and delete projects with custom colors
- ✅ **Time Tracking** - Live timer with 5-minute precision rounding
- ✅ **Quick Entry** - Add past time entries manually
- ✅ **Filtering & Search** - Filter time entries by project, date, and description
- ✅ **Multiple Views** - Table view, calendar view (month/week/day), and charts
- ✅ **Charts & Analytics** - Visual representations of time data
- ✅ **Local Database** - SQLite database that's easy to backup and move
- ✅ **Modern UI** - Clean, responsive design

## Technology Stack

- **Electron** - Cross-platform desktop app framework
- **React** - Modern UI library
- **SQLite** - Local database for data storage
- **Chart.js** - Charts and visualizations
- **Webpack** - Build tool

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/doumdi/project-time-tracker.git
   cd project-time-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development mode**
   ```bash
   # Terminal 1: Start the React dev server
   npm start
   
   # Terminal 2: Start Electron in development mode
   npm run electron-dev
   ```

4. **Build for production**
   ```bash
   # Build the React app
   npm run build
   
   # Run the production version
   npm run electron
   ```

5. **Package the app**
   ```bash
   # Create distributable packages
   npm run dist
   ```

## Usage

### Getting Started

1. **Create Projects**: Start by adding your projects in the "Projects" tab
2. **Track Time**: Use the "Time Tracker" tab to start/stop timer or add quick entries
3. **View Entries**: Check all your time entries in the "Time Entries" tab
4. **Calendar View**: See your work schedule in the "Calendar" tab
5. **Analytics**: View charts and statistics in the "Charts" tab

### Time Tracking

- **Live Timer**: Select a project and click "Start Timer" to begin tracking
- **Quick Entry**: Toggle "Quick Entry Mode" to add past work manually
- **5-minute Precision**: All durations are rounded to the nearest 5 minutes

### Data Management

- **Database Location**: Your data is stored locally in SQLite database
  - Windows: `%APPDATA%/project-time-tracker/timetracker.db`
  - macOS: `~/Library/Application Support/project-time-tracker/timetracker.db`
  - Linux: `~/.config/project-time-tracker/timetracker.db`

- **Backup**: Simply copy the database file to backup your data
- **Restore**: Replace the database file to restore from backup

## Development

### Project Structure

```
src/
├── app/                 # React application
│   ├── App.js          # Main app component
│   ├── index.js        # Entry point
│   ├── index.html      # HTML template
│   └── styles.css      # Global styles
├── components/         # React components
│   ├── ProjectManager.js
│   ├── TimeTracker.js
│   ├── TimeEntryList.js
│   ├── CalendarView.js
│   └── ChartsView.js
├── database/           # Database operations
│   └── db.js          # SQLite database interface
├── main.js            # Electron main process
└── preload.js         # Electron preload script
```

### Database Schema

**Projects Table**
- `id` - Primary key
- `name` - Project name (unique)
- `description` - Optional description
- `color` - Hex color code
- `created_at`, `updated_at` - Timestamps

**Time Entries Table**
- `id` - Primary key
- `project_id` - Foreign key to projects
- `description` - Optional description
- `start_time` - ISO datetime string
- `end_time` - ISO datetime string
- `duration` - Duration in minutes
- `created_at`, `updated_at` - Timestamps

## Building for Distribution

### Windows
```bash
npm run dist
# Creates: dist/Project Time Tracker Setup 1.0.0.exe
```

### macOS
```bash
npm run dist
# Creates: dist/Project Time Tracker-1.0.0.dmg
```

### Linux
```bash
npm run dist
# Creates: dist/Project Time Tracker-1.0.0.AppImage
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

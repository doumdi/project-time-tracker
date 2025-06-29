const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.ELECTRON_IS_DEV === '1';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'), // Add icon later
    title: 'Project Time Tracker'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Database operations will be handled here
const database = require('./database/db');

// IPC handlers for database operations
ipcMain.handle('get-projects', async () => {
  return await database.getProjects();
});

ipcMain.handle('add-project', async (event, project) => {
  return await database.addProject(project);
});

ipcMain.handle('update-project', async (event, project) => {
  return await database.updateProject(project);
});

ipcMain.handle('delete-project', async (event, id) => {
  return await database.deleteProject(id);
});

ipcMain.handle('get-time-entries', async (event, filters) => {
  return await database.getTimeEntries(filters);
});

ipcMain.handle('add-time-entry', async (event, entry) => {
  return await database.addTimeEntry(entry);
});

ipcMain.handle('update-time-entry', async (event, entry) => {
  return await database.updateTimeEntry(entry);
});

ipcMain.handle('delete-time-entry', async (event, id) => {
  return await database.deleteTimeEntry(id);
});

ipcMain.handle('get-time-summary', async (event, filters) => {
  return await database.getTimeSummary(filters);
});
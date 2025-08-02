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

// Import BLE functionality
let noble;
let bleError = null;
try {
  noble = require('@abandonware/noble');
} catch (err) {
  bleError = err;
  console.warn('Noble BLE library not available:', err.message);
  console.warn('BLE features will be disabled. Please ensure Bluetooth is available and permissions are granted.');
}

// BLE state and scanning management
let bleState = {
  isScanning: false,
  discoveredDevices: new Map(),
  connectedDevices: new Set(),
  presenceTimer: null,
  lastPresenceCheck: null
};

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

ipcMain.handle('get-database-version', async () => {
  return await database.getDatabaseVersion();
});

ipcMain.handle('get-app-version', async () => {
  return database.getAppVersion();
});

// BLE device IPC handlers
ipcMain.handle('get-ble-devices', async () => {
  return await database.getBleDevices();
});

ipcMain.handle('add-ble-device', async (event, device) => {
  return await database.addBleDevice(device);
});

ipcMain.handle('update-ble-device', async (event, device) => {
  return await database.updateBleDevice(device);
});

ipcMain.handle('delete-ble-device', async (event, id) => {
  return await database.deleteBleDevice(id);
});

// Office presence IPC handlers
ipcMain.handle('get-office-presence', async (event, filters) => {
  return await database.getOfficePresence(filters);
});

ipcMain.handle('add-office-presence', async (event, presence) => {
  return await database.addOfficePresence(presence);
});

ipcMain.handle('update-office-presence', async (event, presence) => {
  return await database.updateOfficePresence(presence);
});

ipcMain.handle('delete-office-presence', async (event, id) => {
  return await database.deleteOfficePresence(id);
});

ipcMain.handle('get-office-presence-summary', async (event, filters) => {
  return await database.getOfficePresenceSummary(filters);
});

// BLE scanning IPC handlers
ipcMain.handle('start-ble-scan', async () => {
  if (!noble) {
    let errorMessage = 'BLE not available on this system';
    if (bleError) {
      errorMessage += `: ${bleError.message}`;
      
      // Add platform-specific help
      if (process.platform === 'darwin') {
        errorMessage += '\n\nOn macOS, please ensure:\n- Bluetooth is enabled in System Preferences\n- The app has Bluetooth permissions\n- You may need to install Xcode command line tools: xcode-select --install';
      } else if (process.platform === 'linux') {
        errorMessage += '\n\nOn Linux, please ensure:\n- Bluetooth service is running\n- You have the necessary permissions\n- libbluetooth-dev is installed';
      } else if (process.platform === 'win32') {
        errorMessage += '\n\nOn Windows, please ensure:\n- Bluetooth is enabled\n- Windows Build Tools are installed: npm install --global windows-build-tools';
      }
    }
    throw new Error(errorMessage);
  }
  
  return new Promise((resolve, reject) => {
    if (noble.state === 'poweredOn') {
      startBleScan();
      resolve({ success: true });
    } else {
      noble.on('stateChange', (state) => {
        if (state === 'poweredOn') {
          startBleScan();
          resolve({ success: true });
        } else {
          reject(new Error('BLE is not available: ' + state));
        }
      });
    }
  });
});

ipcMain.handle('stop-ble-scan', async () => {
  if (!noble) {
    return { success: false, error: 'BLE not available on this system' };
  }
  
  stopBleScan();
  return { success: true };
});

ipcMain.handle('get-discovered-devices', async () => {
  return Array.from(bleState.discoveredDevices.values());
});

// BLE scanning functions
function startBleScan() {
  if (!noble || bleState.isScanning) return;
  
  bleState.isScanning = true;
  bleState.discoveredDevices.clear();
  
  noble.on('discover', (peripheral) => {
    const device = {
      id: peripheral.id,
      name: peripheral.advertisement.localName || 'Unknown Device',
      mac_address: peripheral.address || peripheral.id,
      device_type: getDeviceType(peripheral),
      rssi: peripheral.rssi,
      discovered_at: new Date().toISOString()
    };
    
    bleState.discoveredDevices.set(peripheral.id, device);
    
    // Send update to renderer
    if (mainWindow) {
      mainWindow.webContents.send('ble-device-discovered', device);
    }
  });
  
  noble.startScanning([], false);
  
  // Stop scanning after 30 seconds
  setTimeout(() => {
    if (bleState.isScanning) {
      stopBleScan();
    }
  }, 30000);
}

function stopBleScan() {
  if (!noble || !bleState.isScanning) return;
  
  noble.stopScanning();
  bleState.isScanning = false;
  
  if (mainWindow) {
    mainWindow.webContents.send('ble-scan-stopped');
  }
}

function getDeviceType(peripheral) {
  const name = (peripheral.advertisement.localName || '').toLowerCase();
  const services = peripheral.advertisement.serviceUuids || [];
  
  if (name.includes('watch') || name.includes('fitbit') || name.includes('garmin')) {
    return 'watch';
  } else if (name.includes('phone') || name.includes('iphone') || name.includes('samsung')) {
    return 'phone';
  } else if (services.some(uuid => uuid.includes('180f'))) { // Battery service
    return 'wearable';
  } else {
    return 'unknown';
  }
}

// Office presence monitoring
async function startPresenceMonitoring() {
  if (!noble || bleState.presenceTimer) return;
  
  const enabledDevices = await database.getBleDevices();
  const monitoredDevices = enabledDevices.filter(device => device.is_enabled);
  
  if (monitoredDevices.length === 0) return;
  
  bleState.presenceTimer = setInterval(async () => {
    await checkPresence(monitoredDevices);
  }, 60000); // Check every minute
}

async function checkPresence(monitoredDevices) {
  // This is a simplified implementation
  // In a real app, you'd continuously scan for known devices
  const currentTime = new Date();
  const today = currentTime.toISOString().split('T')[0];
  
  // For now, we'll just create sample presence data
  // In reality, this would check if any monitored devices are in range
  
  bleState.lastPresenceCheck = currentTime;
}
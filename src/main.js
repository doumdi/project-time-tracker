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

app.whenReady().then(() => {
  createWindow();
  
  // Check if presence monitoring should be started
  setTimeout(async () => {
    try {
      const stored = JSON.parse(JSON.stringify({}));
      // We'll check localStorage in the renderer process instead
      // For now, we'll let the renderer process control this
    } catch (error) {
      console.error('Error checking presence monitoring settings:', error);
    }
  }, 2000);
});

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
  noble = require('@stoprocent/noble');
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
  lastPresenceCheck: null,
  continuousScanning: false,
  currentDetectedDevices: new Map(),
  activePresenceSession: null,
  lastDeviceDetection: new Map()
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
        errorMessage += '\n\nOn macOS, please ensure:\n- Bluetooth is enabled in System Preferences\n- The app has Bluetooth permissions\n- Xcode command line tools are installed: xcode-select --install\n- If using Python 3.13+, you may need to install setuptools: pip install setuptools';
      } else if (process.platform === 'linux') {
        errorMessage += '\n\nOn Linux, please ensure:\n- Bluetooth service is running\n- You have the necessary permissions\n- libbluetooth-dev is installed\n- build-essential package is installed';
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

ipcMain.handle('get-current-presence-status', async () => {
  const enabledDevices = await database.getBleDevices();
  const monitoredDevices = enabledDevices.filter(device => device.is_enabled);
  
  const currentDetected = [];
  for (const [deviceId, device] of bleState.currentDetectedDevices) {
    const dbDevice = monitoredDevices.find(d => d.mac_address === device.mac_address);
    if (dbDevice) {
      currentDetected.push({
        ...device,
        name: dbDevice.name,
        device_type: dbDevice.device_type
      });
    }
  }
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todaySummary = await database.getOfficePresenceSummary({
    startDate: todayStart.toISOString().split('T')[0],
    endDate: todayStart.toISOString().split('T')[0]
  });
  
  return {
    isPresent: currentDetected.length > 0,
    detectedDevices: currentDetected,
    activeSession: bleState.activePresenceSession,
    todayTotalMinutes: todaySummary[0]?.total_minutes || 0,
    continuousScanning: bleState.continuousScanning
  };
});

ipcMain.handle('enable-presence-monitoring', async (event, enabled) => {
  if (enabled) {
    await startPresenceMonitoring();
  } else {
    await stopPresenceMonitoring();
  }
  return { success: true };
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
  
  // Only stop scanning after 30 seconds if not in continuous mode
  if (!bleState.continuousScanning) {
    setTimeout(() => {
      if (bleState.isScanning) {
        stopBleScan();
      }
    }, 30000);
  }
}

function stopBleScan() {
  if (!noble || !bleState.isScanning) return;
  
  noble.stopScanning();
  bleState.isScanning = false;
  
  if (mainWindow) {
    mainWindow.webContents.send('ble-scan-stopped');
  }
}

function startContinuousScanning() {
  if (!noble || bleState.continuousScanning) return;
  
  bleState.continuousScanning = true;
  
  noble.on('discover', handlePresenceDeviceDiscovery);
  
  if (noble.state === 'poweredOn') {
    noble.startScanning([], false);
    bleState.isScanning = true;
  } else {
    noble.on('stateChange', (state) => {
      if (state === 'poweredOn' && bleState.continuousScanning) {
        noble.startScanning([], false);
        bleState.isScanning = true;
      }
    });
  }
}

function stopContinuousScanning() {
  if (!noble) return;
  
  bleState.continuousScanning = false;
  
  if (bleState.isScanning) {
    noble.stopScanning();
    bleState.isScanning = false;
  }
  
  noble.removeListener('discover', handlePresenceDeviceDiscovery);
  bleState.currentDetectedDevices.clear();
  bleState.lastDeviceDetection.clear();
}

async function handlePresenceDeviceDiscovery(peripheral) {
  const deviceMac = peripheral.address || peripheral.id;
  const currentTime = new Date();
  
  // Get enabled devices from database
  const enabledDevices = await database.getBleDevices();
  const monitoredDevices = enabledDevices.filter(device => 
    device.is_enabled && device.mac_address === deviceMac
  );
  
  if (monitoredDevices.length > 0) {
    const device = monitoredDevices[0];
    
    // Update current detected devices
    bleState.currentDetectedDevices.set(deviceMac, {
      id: peripheral.id,
      name: device.name,
      mac_address: deviceMac,
      device_type: device.device_type,
      rssi: peripheral.rssi,
      last_seen: currentTime.toISOString()
    });
    
    bleState.lastDeviceDetection.set(deviceMac, currentTime);
    
    // Check if we need to start a new presence session
    await checkAndManagePresenceSession(device);
    
    // Notify renderer of presence update
    if (mainWindow) {
      mainWindow.webContents.send('presence-status-updated', {
        isPresent: true,
        detectedDevice: device
      });
    }
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
  
  console.log('Starting presence monitoring for', monitoredDevices.length, 'devices');
  
  // Start continuous scanning
  startContinuousScanning();
  
  // Check for device timeouts every 30 seconds
  bleState.presenceTimer = setInterval(async () => {
    await checkDeviceTimeouts();
  }, 30000);
}

async function stopPresenceMonitoring() {
  if (bleState.presenceTimer) {
    clearInterval(bleState.presenceTimer);
    bleState.presenceTimer = null;
  }
  
  // End any active presence session
  if (bleState.activePresenceSession) {
    await endPresenceSession();
  }
  
  stopContinuousScanning();
  console.log('Stopped presence monitoring');
}

async function checkDeviceTimeouts() {
  const currentTime = new Date();
  const timeoutThreshold = 2 * 60 * 1000; // 2 minutes timeout
  
  // Check which devices haven't been seen recently
  for (const [deviceMac, lastSeen] of bleState.lastDeviceDetection) {
    if (currentTime - lastSeen > timeoutThreshold) {
      // Remove from current detected devices
      bleState.currentDetectedDevices.delete(deviceMac);
      bleState.lastDeviceDetection.delete(deviceMac);
      
      console.log('Device timeout:', deviceMac);
    }
  }
  
  // If no devices are detected and we have an active session, end it
  if (bleState.currentDetectedDevices.size === 0 && bleState.activePresenceSession) {
    await endPresenceSession();
    
    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('presence-status-updated', {
        isPresent: false,
        detectedDevice: null
      });
    }
  }
}

async function checkAndManagePresenceSession(device) {
  const currentTime = new Date();
  
  if (!bleState.activePresenceSession) {
    // Start a new presence session
    bleState.activePresenceSession = {
      device_id: device.id,
      device_name: device.name,
      start_time: currentTime,
      date: currentTime.toISOString().split('T')[0]
    };
    
    console.log('Started presence session for device:', device.name);
  } else {
    // Update the last activity time
    bleState.activePresenceSession.last_activity = currentTime;
  }
}

async function endPresenceSession() {
  if (!bleState.activePresenceSession) return;
  
  const endTime = new Date();
  const session = bleState.activePresenceSession;
  const durationMinutes = Math.round((endTime - session.start_time) / (1000 * 60));
  
  // Only save sessions that are at least 1 minute long
  if (durationMinutes >= 1) {
    try {
      await database.addOfficePresence({
        date: session.date,
        start_time: session.start_time.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationMinutes,
        device_id: session.device_id
      });
      
      console.log('Saved presence session:', durationMinutes, 'minutes for device:', session.device_name);
      
      // Notify renderer to refresh data
      if (mainWindow) {
        mainWindow.webContents.send('presence-data-updated');
      }
    } catch (error) {
      console.error('Failed to save presence session:', error);
    }
  }
  
  bleState.activePresenceSession = null;
}

async function checkPresence(monitoredDevices) {
  // This function is now replaced by the continuous scanning approach
  // Keeping for backward compatibility but it's no longer used
  const currentTime = new Date();
  bleState.lastPresenceCheck = currentTime;
}
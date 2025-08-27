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
  
  // After the renderer finishes loading, check renderer localStorage for the
  // user's saved preference and start presence monitoring automatically if enabled.
  // This makes BLE scanning start immediately when the app opens (when the
  // user previously enabled office presence in settings).
  if (mainWindow) {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        // Read the saved preference directly from the renderer's localStorage.
        // webContents.send does not return a value; use executeJavaScript to query localStorage.
        const stored = await mainWindow.webContents.executeJavaScript("localStorage.getItem('officePresenceEnabled');");
        const enabled = stored === 'true';

        console.log('[MAIN] officePresenceEnabled (from renderer localStorage):', stored);

        if (enabled) {
          // Start presence monitoring in the main process. The function will
          // no-op if noble is not available or if there are no monitored devices.
          try {
            await startPresenceMonitoring();
            console.log('[MAIN] Presence monitoring started automatically on app launch');
          } catch (err) {
            console.error('[MAIN] Failed to start presence monitoring on launch:', err);
          }
        }
      } catch (error) {
        console.error('Error checking presence monitoring settings from renderer:', error);
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  console.log('App is about to quit, checking for active sessions and cleaning up resources...');

  // Stop presence monitoring and BLE timers first to prevent async callbacks touching the DB during shutdown
  try {
    await stopPresenceMonitoring();
  } catch (err) {
    console.warn('Error while stopping presence monitoring during shutdown:', err);
  }

  try {
    // Check if there's an active presence session and save it
    if (bleState.activePresenceSession) {
      console.log('Saving active presence session before quit...');
      await endPresenceSession();
    }
  } catch (err) {
    console.warn('Error saving active presence session during shutdown:', err);
  }

  try {
    // Check if there's an active timer in the frontend and save it
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send a message to the renderer to save any active timer
      const result = await mainWindow.webContents.executeJavaScript(`
        const activeTimer = localStorage.getItem('activeTimer');
        if (activeTimer) {
          const timerData = JSON.parse(activeTimer);
          if (timerData.isTracking && timerData.startTime && timerData.selectedProject) {
            return {
              shouldSave: true,
              project_id: parseInt(timerData.selectedProject),
              description: timerData.description || '',
              start_time: timerData.startTime,
              end_time: new Date().toISOString()
            };
          }
        }
        return { shouldSave: false };
      `);

      if (result && result.shouldSave) {
        console.log('Saving active timer before quit...');

        const startTime = new Date(result.start_time);
        const endTime = new Date(result.end_time);
        const durationMs = endTime - startTime;
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const roundedDuration = Math.max(5, Math.round(durationMinutes / 5) * 5);

        const timeEntry = {
          project_id: result.project_id,
          description: result.description,
          start_time: result.start_time,
          end_time: result.end_time,
          duration: roundedDuration
        };

        try {
          await database.addTimeEntry(timeEntry);
          console.log('Active timer saved successfully before quit');
        } catch (err) {
          console.error('Failed to save active timer during shutdown:', err);
        }

        // Clear the active timer from localStorage
        try {
          await mainWindow.webContents.executeJavaScript(`localStorage.removeItem('activeTimer');`);
        } catch (err) {
          console.warn('Could not clear activeTimer from renderer during shutdown:', err);
        }
      }
    }
  } catch (error) {
    console.error('Error saving active sessions before quit:', error);
  }

  // Finally, close the database after all async activity and timers have been stopped
  try {
    if (database && typeof database.closeDatabase === 'function') {
      await database.closeDatabase();
    }
  } catch (err) {
    console.error('Error closing database during shutdown:', err);
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
  lastDeviceDetection: new Map(),
  periodicScanTimer: null,
  deviceDetectionStartTime: new Map(), // Track when each device was first detected
  globalPresenceStartTime: null, // Track when global presence started
  presenceSaveTimer: null, // Timer for periodic presence saves
  presenceSaveInterval: 15 * 60 * 1000 // Default 15 minutes in milliseconds
};

// MCP server state
let mcpServerState = {
  server: null,
  isRunning: false,
  enabled: false
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

// Task IPC handlers
ipcMain.handle('get-tasks', async (event, filters) => {
  return await database.getTasks(filters);
});

ipcMain.handle('add-task', async (event, task) => {
  return await database.addTask(task);
});

ipcMain.handle('update-task', async (event, task) => {
  return await database.updateTask(task);
});

ipcMain.handle('delete-task', async (event, id) => {
  return await database.deleteTask(id);
});

ipcMain.handle('set-active-task', async (event, taskId) => {
  return await database.setActiveTask(taskId);
});

ipcMain.handle('get-active-task', async () => {
  return await database.getActiveTask();
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

// Add a new handler for triggering immediate scans during presence monitoring
ipcMain.handle('trigger-immediate-scan', async () => {
  if (!noble) {
    throw new Error('BLE not available on this system');
  }
  
  if (noble.state === 'poweredOn') {
    console.log('[BLE SCAN] Triggering immediate BLE scan from settings...');
    
    // Clear discovered devices for fresh results
    bleState.discoveredDevices.clear();
    
    // Notify frontend to clear discovered devices
    if (mainWindow) {
      mainWindow.webContents.send('ble-devices-cleared');
    }
    
    // If continuous scanning is active, the device discovery events are already handled
    // Just need to ensure we clear the discovered devices list for fresh results
    if (bleState.continuousScanning) {
      console.log('[BLE SCAN] Continuous scanning active, cleared device list for fresh discovery');
      // The continuous scanning discover handler will automatically populate new devices
    } else {
      // Start a standalone scan if continuous scanning is not active
      startBleScan();
    }
    
    return { success: true };
  } else {
    throw new Error('BLE is not powered on: ' + noble.state);
  }
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
  const currentTime = new Date();
  
  for (const [deviceId, device] of bleState.currentDetectedDevices) {
    const dbDevice = monitoredDevices.find(d => d.mac_address === device.mac_address);
    if (dbDevice) {
      const detectionStartTime = bleState.deviceDetectionStartTime.get(deviceId);
      const secondsDetected = detectionStartTime ? Math.floor((currentTime - detectionStartTime) / 1000) : 0;
      
      currentDetected.push({
        ...device,
        name: dbDevice.name,
        device_type: dbDevice.device_type,
        secondsDetected: secondsDetected
      });
    }
  }
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todaySummary = await database.getOfficePresenceSummary({
    startDate: todayStart.toISOString().split('T')[0],
    endDate: todayStart.toISOString().split('T')[0]
  });
  
  // Calculate current session time if active
  let currentSessionSeconds = 0;
  if (bleState.globalPresenceStartTime) {
    currentSessionSeconds = Math.floor((currentTime - bleState.globalPresenceStartTime) / 1000);
  }
  
  return {
    isPresent: currentDetected.length > 0,
    detectedDevices: currentDetected,
    activeSession: bleState.activePresenceSession,
    todayTotalMinutes: todaySummary[0]?.total_minutes || 0,
    continuousScanning: bleState.continuousScanning,
    currentSessionSeconds: currentSessionSeconds,
    globalPresenceStartTime: bleState.globalPresenceStartTime
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

// Presence save interval management
ipcMain.handle('set-presence-save-interval', async (event, intervalMinutes) => {
  bleState.presenceSaveInterval = intervalMinutes * 60 * 1000; // Convert to milliseconds
  console.log(`[PRESENCE MONITOR] Set presence save interval to ${intervalMinutes} minutes`);
  
  // If monitoring is active, restart the save timer with new interval
  if (bleState.continuousScanning) {
    stopPresenceSaveTimer();
    startPresenceSaveTimer();
  }
  
  return { success: true };
});

ipcMain.handle('get-presence-save-interval', async () => {
  return Math.floor(bleState.presenceSaveInterval / (60 * 1000)); // Return in minutes
});

// MCP server IPC handlers
ipcMain.handle('enable-mcp-server', async (event, enabled) => {
  try {
    if (enabled) {
      await startMcpServer();
    } else {
      await stopMcpServer();
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle MCP server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-mcp-server-status', async () => {
  return {
    enabled: mcpServerState.enabled,
    isRunning: mcpServerState.isRunning
  };
});

// MCP server functions
async function startMcpServer() {
  if (mcpServerState.isRunning) {
    console.log('[MCP Server] Already running');
    return;
  }

  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const serverPath = path.join(__dirname, 'mcp-server', 'index.js');
    
    mcpServerState.server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    mcpServerState.server.on('error', (error) => {
      console.error('[MCP Server] Error:', error);
      mcpServerState.isRunning = false;
    });

    mcpServerState.server.on('exit', (code, signal) => {
      console.log(`[MCP Server] Exited with code ${code}, signal ${signal}`);
      mcpServerState.isRunning = false;
    });

    mcpServerState.server.stdout.on('data', (data) => {
      console.log(`[MCP Server] ${data.toString().trim()}`);
    });

    mcpServerState.server.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message.includes('running on stdio')) {
        mcpServerState.isRunning = true;
        console.log('[MCP Server] Started successfully');
      } else {
        console.error(`[MCP Server] ${message}`);
      }
    });

    mcpServerState.enabled = true;
    console.log('[MCP Server] Starting...');
    
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('[MCP Server] Failed to start:', error);
    mcpServerState.enabled = false;
    mcpServerState.isRunning = false;
    throw error;
  }
}

async function stopMcpServer() {
  if (!mcpServerState.server) {
    console.log('[MCP Server] Not running');
    return;
  }

  try {
    mcpServerState.server.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (mcpServerState.server) {
          mcpServerState.server.kill('SIGKILL');
        }
        resolve();
      }, 5000);
      
      mcpServerState.server.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    mcpServerState.server = null;
    mcpServerState.enabled = false;
    mcpServerState.isRunning = false;
    
    console.log('[MCP Server] Stopped');
  } catch (error) {
    console.error('[MCP Server] Failed to stop:', error);
    throw error;
  }
}

// BLE scanning functions
function startBleScan() {
  if (!noble || bleState.isScanning) {
    console.log('[BLE SCAN] Cannot start scan - noble not available or already scanning');
    return;
  }
  
  console.log('[BLE SCAN] Starting BLE device scan...');
  bleState.isScanning = true;
  bleState.discoveredDevices.clear();
  
  // Notify frontend to clear discovered devices
  if (mainWindow) {
    mainWindow.webContents.send('ble-devices-cleared');
  }
  
  // Remove any existing listeners to prevent duplicates
  noble.removeAllListeners('discover');
  
  noble.on('discover', (peripheral) => {
    const device = {
      id: peripheral.id,
      name: peripheral.advertisement.localName || 'Unknown Device',
      mac_address: peripheral.address || peripheral.id,
      device_type: getDeviceType(peripheral),
      rssi: peripheral.rssi,
      discovered_at: new Date().toISOString()
    };
    
    // Debug logging
    console.log(`[BLE SCAN] Discovered device: ${device.name} (${device.mac_address}) RSSI: ${device.rssi}dBm`);
    
    bleState.discoveredDevices.set(peripheral.id, device);
    
    // Send real-time update to renderer immediately
    if (mainWindow) {
      console.log('[BLE SCAN] Sending real-time device update to frontend');
      mainWindow.webContents.send('ble-device-discovered', device);
    }
  });
  
  // Start scanning for all devices (empty array means scan for all)
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
  
  console.log('[BLE SCAN] Stopping BLE device scan');
  noble.stopScanning();
  bleState.isScanning = false;
  
  if (mainWindow) {
    mainWindow.webContents.send('ble-scan-stopped');
  }
}

function startContinuousScanning() {
  if (!noble || bleState.continuousScanning) {
    console.log('[PRESENCE MONITOR] Cannot start continuous scanning - already active or noble not available');
    return;
  }
  
  console.log('[PRESENCE MONITOR] Starting continuous BLE scanning (every minute)');
  bleState.continuousScanning = true;
  
  // Handle both presence monitoring and real-time device discovery
  noble.on('discover', (peripheral) => {
    // Handle presence monitoring
    handlePresenceDeviceDiscovery(peripheral);
    
    // Also send discovered devices to BLE settings for real-time discovery
    const device = {
      id: peripheral.id,
      name: peripheral.advertisement.localName || 'Unknown Device',
      mac_address: peripheral.address || peripheral.id,
      device_type: getDeviceType(peripheral),
      rssi: peripheral.rssi,
      discovered_at: new Date().toISOString()
    };
    
    // Add to discovered devices for settings view
    bleState.discoveredDevices.set(peripheral.id, device);
    
    // Send real-time update to renderer for BLE settings
    if (mainWindow) {
      console.log('[BLE SCAN] Sending continuous scan device to frontend:', device.name, device.mac_address);
      mainWindow.webContents.send('ble-device-discovered', device);
    }
  });
  
  // Start periodic scanning every minute instead of continuous scanning
  bleState.periodicScanTimer = setInterval(() => {
    if (noble.state === 'poweredOn') {
      console.log('[PRESENCE MONITOR] Starting periodic BLE scan cycle...');
      noble.startScanning([], false);
      bleState.isScanning = true;
      
      // Stop scanning after 30 seconds
      setTimeout(() => {
        if (bleState.isScanning && noble.state === 'poweredOn') {
          noble.stopScanning();
          bleState.isScanning = false;
          console.log('[PRESENCE MONITOR] Completed periodic BLE scan cycle');
        }
      }, 30000); // Scan for 30 seconds each minute
    } else {
      console.log('[PRESENCE MONITOR] BLE not powered on, skipping scan cycle');
    }
  }, 60000); // Every minute
  
  // Start the first scan immediately
  if (noble.state === 'poweredOn') {
    console.log('[PRESENCE MONITOR] Starting initial BLE scan...');
    noble.startScanning([], false);
    bleState.isScanning = true;
    
    setTimeout(() => {
      if (bleState.isScanning && noble.state === 'poweredOn') {
        noble.stopScanning();
        bleState.isScanning = false;
        console.log('[PRESENCE MONITOR] Completed initial BLE scan');
      }
    }, 30000);
  } else {
    console.log('[PRESENCE MONITOR] BLE not powered on, waiting for state change');
    noble.on('stateChange', (state) => {
      if (state === 'poweredOn' && bleState.continuousScanning && !bleState.isScanning) {
        console.log('[PRESENCE MONITOR] BLE powered on, starting scan');
        noble.startScanning([], false);
        bleState.isScanning = true;
        
        setTimeout(() => {
          if (bleState.isScanning && noble.state === 'poweredOn') {
            noble.stopScanning();
            bleState.isScanning = false;
            console.log('[PRESENCE MONITOR] Completed state change scan');
          }
        }, 30000);
      }
    });
  }
}

function stopContinuousScanning() {
  if (!noble) return;
  
  console.log('[PRESENCE MONITOR] Stopping continuous BLE scanning');
  bleState.continuousScanning = false;
  
  // Clear the periodic scan timer
  if (bleState.periodicScanTimer) {
    clearInterval(bleState.periodicScanTimer);
    bleState.periodicScanTimer = null;
    console.log('[PRESENCE MONITOR] Cleared periodic scan timer');
  }
  
  if (bleState.isScanning) {
    noble.stopScanning();
    bleState.isScanning = false;
    console.log('[PRESENCE MONITOR] Stopped active scan');
  }
  
  noble.removeAllListeners('discover');
  bleState.currentDetectedDevices.clear();
  bleState.lastDeviceDetection.clear();
  bleState.deviceDetectionStartTime.clear();
  bleState.globalPresenceStartTime = null;
  console.log('[PRESENCE MONITOR] Cleared all presence tracking state');
}

async function handlePresenceDeviceDiscovery(peripheral) {
  const deviceMac = peripheral.address || peripheral.id;
  const currentTime = new Date();
  
  // Debug logging for presence monitoring
  console.log(`[PRESENCE MONITOR] Discovered device: ${peripheral.advertisement.localName || 'Unknown'} (${deviceMac}) RSSI: ${peripheral.rssi}dBm`);
  
  // Get enabled devices from database
  const enabledDevices = await database.getBleDevices();
  const monitoredDevices = enabledDevices.filter(device => 
    device.is_enabled && device.mac_address === deviceMac
  );
  
  if (monitoredDevices.length > 0) {
    const device = monitoredDevices[0];
    
    console.log(`[PRESENCE MONITOR] Matched monitored device: ${device.name} (${deviceMac})`);
    
    // Track device detection start time
    if (!bleState.deviceDetectionStartTime.has(deviceMac)) {
      bleState.deviceDetectionStartTime.set(deviceMac, currentTime);
      console.log(`[PRESENCE MONITOR] Started tracking device: ${device.name}`);
    }
    
    // Track global presence start time
    if (!bleState.globalPresenceStartTime) {
      bleState.globalPresenceStartTime = currentTime;
      console.log(`[PRESENCE MONITOR] Started global presence session`);
    }
    
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
  
  // Start periodic presence save timer
  startPresenceSaveTimer();
  
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
  
  // Stop the presence save timer
  stopPresenceSaveTimer();
  
  // End any active presence session
  if (bleState.activePresenceSession) {
    await endPresenceSession();
  }
  
  stopContinuousScanning();
  console.log('Stopped presence monitoring');
}

function startPresenceSaveTimer() {
  if (bleState.presenceSaveTimer) {
    clearInterval(bleState.presenceSaveTimer);
  }
  
  console.log(`[PRESENCE MONITOR] Starting periodic save timer (${bleState.presenceSaveInterval / 60000} minutes)`);
  
  bleState.presenceSaveTimer = setInterval(async () => {
    await saveCurrentPresenceSession();
  }, bleState.presenceSaveInterval);
}

function stopPresenceSaveTimer() {
  if (bleState.presenceSaveTimer) {
    clearInterval(bleState.presenceSaveTimer);
    bleState.presenceSaveTimer = null;
    console.log('[PRESENCE MONITOR] Stopped periodic save timer');
  }
}

async function saveCurrentPresenceSession() {
  console.log('[PRESENCE MONITOR] Periodic save triggered');
  
  // If we have an active session and devices are still detected, save and start new session
  if (bleState.activePresenceSession && bleState.currentDetectedDevices.size > 0) {
    console.log('[PRESENCE MONITOR] Saving current session and starting new one');
    
    // Save the current session
    await endPresenceSession();
    
    // Start a new session immediately if devices are still present
    const enabledDevices = await database.getBleDevices();
    const monitoredDevices = enabledDevices.filter(device => device.is_enabled);
    
    if (monitoredDevices.length > 0) {
      const currentTime = new Date();
      const firstDetectedDevice = monitoredDevices.find(device => 
        Array.from(bleState.currentDetectedDevices.values()).some(detected => 
          detected.mac_address === device.mac_address
        )
      );
      
      if (firstDetectedDevice) {
        bleState.activePresenceSession = {
          device_id: firstDetectedDevice.id,
          device_name: firstDetectedDevice.name,
          start_time: currentTime,
          date: currentTime.toISOString().split('T')[0]
        };
        
        // Reset global presence start time for the new session
        bleState.globalPresenceStartTime = currentTime;
        
        console.log('[PRESENCE MONITOR] Started new presence session after save');
        
        // Notify renderer of new session
        if (mainWindow) {
          mainWindow.webContents.send('presence-data-updated');
        }
      }
    }
  }
}

async function checkDeviceTimeouts() {
  const currentTime = new Date();
  const timeoutThreshold = 2 * 60 * 1000; // 2 minutes timeout
  
  console.log(`[PRESENCE MONITOR] Checking device timeouts for ${bleState.currentDetectedDevices.size} devices`);
  
  // Check which devices haven't been seen recently
  for (const [deviceMac, lastSeen] of bleState.lastDeviceDetection) {
    if (currentTime - lastSeen > timeoutThreshold) {
      // Remove from current detected devices
      bleState.currentDetectedDevices.delete(deviceMac);
      bleState.lastDeviceDetection.delete(deviceMac);
      bleState.deviceDetectionStartTime.delete(deviceMac);
      
      console.log(`[PRESENCE MONITOR] Device timeout: ${deviceMac}`);
    }
  }
  
  // If no devices are detected and we have an active session, end it
  if (bleState.currentDetectedDevices.size === 0 && bleState.activePresenceSession) {
    console.log('[PRESENCE MONITOR] No devices detected, ending presence session');
    // Reset global presence start time
    bleState.globalPresenceStartTime = null;
    
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
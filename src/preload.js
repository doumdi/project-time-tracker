const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project operations
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (project) => ipcRenderer.invoke('add-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  
  // Time entry operations
  getTimeEntries: (filters) => ipcRenderer.invoke('get-time-entries', filters),
  addTimeEntry: (entry) => ipcRenderer.invoke('add-time-entry', entry),
  updateTimeEntry: (entry) => ipcRenderer.invoke('update-time-entry', entry),
  deleteTimeEntry: (id) => ipcRenderer.invoke('delete-time-entry', id),
  
  // Summary operations
  getTimeSummary: (filters) => ipcRenderer.invoke('get-time-summary', filters),
  
  // Version operations
  getDatabaseVersion: () => ipcRenderer.invoke('get-database-version'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // BLE device operations
  getBleDevices: () => ipcRenderer.invoke('get-ble-devices'),
  addBleDevice: (device) => ipcRenderer.invoke('add-ble-device', device),
  updateBleDevice: (device) => ipcRenderer.invoke('update-ble-device', device),
  deleteBleDevice: (id) => ipcRenderer.invoke('delete-ble-device', id),
  
  // Office presence operations
  getOfficePresence: (filters) => ipcRenderer.invoke('get-office-presence', filters),
  addOfficePresence: (presence) => ipcRenderer.invoke('add-office-presence', presence),
  updateOfficePresence: (presence) => ipcRenderer.invoke('update-office-presence', presence),
  deleteOfficePresence: (id) => ipcRenderer.invoke('delete-office-presence', id),
  getOfficePresenceSummary: (filters) => ipcRenderer.invoke('get-office-presence-summary', filters),
  
  // Task operations
  getTasks: (filters) => ipcRenderer.invoke('get-tasks', filters),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTask: (task) => ipcRenderer.invoke('update-task', task),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),
  setActiveTask: (taskId) => ipcRenderer.invoke('set-active-task', taskId),
  getActiveTask: () => ipcRenderer.invoke('get-active-task'),
  
  // BLE scanning operations
  startBleScan: () => ipcRenderer.invoke('start-ble-scan'),
  stopBleScan: () => ipcRenderer.invoke('stop-ble-scan'),
  triggerImmediateScan: () => ipcRenderer.invoke('trigger-immediate-scan'),
  getDiscoveredDevices: () => ipcRenderer.invoke('get-discovered-devices'),
  getCurrentPresenceStatus: () => ipcRenderer.invoke('get-current-presence-status'),
  enablePresenceMonitoring: (enabled) => ipcRenderer.invoke('enable-presence-monitoring', enabled),
  setPresenceSaveInterval: (intervalMinutes) => ipcRenderer.invoke('set-presence-save-interval', intervalMinutes),
  getPresenceSaveInterval: () => ipcRenderer.invoke('get-presence-save-interval'),
  
  // Event listeners for BLE events
  onBleDeviceDiscovered: (callback) => ipcRenderer.on('ble-device-discovered', callback),
  onBleDevicesCleared: (callback) => ipcRenderer.on('ble-devices-cleared', callback),
  onBleScanStopped: (callback) => ipcRenderer.on('ble-scan-stopped', callback),
  onPresenceStatusUpdated: (callback) => ipcRenderer.on('presence-status-updated', callback),
  onPresenceDataUpdated: (callback) => ipcRenderer.on('presence-data-updated', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // MCP server operations
  enableMcpServer: (enabled) => ipcRenderer.invoke('enable-mcp-server', enabled),
  getMcpServerStatus: () => ipcRenderer.invoke('get-mcp-server-status')
});
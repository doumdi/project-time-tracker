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
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
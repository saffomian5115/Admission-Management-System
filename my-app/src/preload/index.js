import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Students
  students: {
    getAll: (filters) => ipcRenderer.invoke('students:getAll', filters),
    getById: (id) => ipcRenderer.invoke('students:getById', id),
    create: (data) => ipcRenderer.invoke('students:create', data),
    update: (id, data) => ipcRenderer.invoke('students:update', id, data),
    delete: (id) => ipcRenderer.invoke('students:delete', id),
    exportExcel: () => ipcRenderer.invoke('students:exportExcel')
  },

  // Programs
  programs: {
    getAll: (level) => ipcRenderer.invoke('programs:getAll', level),
    create: (data) => ipcRenderer.invoke('programs:create', data),
    update: (id, data) => ipcRenderer.invoke('programs:update', id, data),
    delete: (id) => ipcRenderer.invoke('programs:delete', id)
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key) => ipcRenderer.invoke('settings:get', key),
    update: (key, value) => ipcRenderer.invoke('settings:update', key, value)
  },

  // Reports
  reports: {
    areaWise: (filters) => ipcRenderer.invoke('reports:areaWise', filters),
    programWise: (filters) => ipcRenderer.invoke('reports:programWise', filters),
    dashboard: () => ipcRenderer.invoke('reports:dashboard')
  },

  // Database (backup, etc.)
  database: {
    backup: () => ipcRenderer.invoke('database:backup'),
    getFilePath: () => ipcRenderer.invoke('database:getFilePath')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

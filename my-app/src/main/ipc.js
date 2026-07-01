import { ipcMain } from 'electron'
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getSetting,
  getAllSettings,
  updateSetting,
  getAreaWiseReport,
  getProgramWiseReport,
  getDashboardStats,
  logMessage,
  exportStudentsToExcel,
  getDatabaseFilePath,
  backupDatabase
} from './database.js'
import { dialog } from 'electron'

export function registerIpcHandlers() {
  // ─── Student Handlers ───

  ipcMain.handle('students:getAll', async (_event, filters) => {
    try {
      return { success: true, data: getAllStudents(filters) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('students:getById', async (_event, id) => {
    try {
      return { success: true, data: getStudentById(id) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('students:create', async (_event, data) => {
    try {
      const result = createStudent(data)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('students:update', async (_event, id, data) => {
    try {
      const result = updateStudent(id, data)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('students:delete', async (_event, id) => {
    try {
      deleteStudent(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ─── Program Handlers ───

  ipcMain.handle('programs:getAll', async (_event, level) => {
    try {
      return { success: true, data: getPrograms(level) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('programs:create', async (_event, data) => {
    try {
      createProgram(data)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('programs:update', async (_event, id, data) => {
    try {
      updateProgram(id, data)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('programs:delete', async (_event, id) => {
    try {
      deleteProgram(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ─── Settings Handlers ───

  ipcMain.handle('settings:getAll', async () => {
    try {
      return { success: true, data: getAllSettings() }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:get', async (_event, key) => {
    try {
      return { success: true, data: getSetting(key) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:update', async (_event, key, value) => {
    try {
      updateSetting(key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ─── Report Handlers ───

  ipcMain.handle('reports:areaWise', async (_event, filters) => {
    try {
      return { success: true, data: getAreaWiseReport(filters) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('reports:programWise', async (_event, filters) => {
    try {
      return { success: true, data: getProgramWiseReport(filters) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('reports:dashboard', async () => {
    try {
      return { success: true, data: getDashboardStats() }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ─── Export & Backup Handlers ───

  ipcMain.handle('students:exportExcel', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Students to Excel',
        defaultPath: 'students_export.xlsx',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })
      if (canceled || !filePath) return { success: false, error: 'Cancelled' }
      const result = exportStudentsToExcel(filePath)
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database:backup', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: 'admission_backup.db',
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      })
      if (canceled || !filePath) return { success: false, error: 'Cancelled' }
      const result = backupDatabase(filePath)
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database:getFilePath', async () => {
    try {
      return { success: true, data: getDatabaseFilePath() }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

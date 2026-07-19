import { ipcMain, shell, BrowserWindow } from 'electron'
import { recordVideo, type RecordMode } from './recorder'
import { getHistory, addToHistory, deleteFromHistory } from './store'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Record video from URL
  ipcMain.handle('recorder:record', async (_event, url: string, duration: number, mode: RecordMode) => {
    const result = await recordVideo(url, duration, mode, mainWindow)

    if (result.success && result.filePath && result.title) {
      const domain = new URL(url).hostname
      addToHistory({
        url,
        domain,
        title: result.title,
        filePath: result.filePath
      })
    }

    return result
  })

  // History
  ipcMain.handle('history:get', () => {
    return getHistory()
  })

  ipcMain.handle('history:add', (_event, item) => {
    addToHistory(item)
  })

  ipcMain.handle('history:delete', (_event, id: string) => {
    deleteFromHistory(id)
  })

  // Shell
  ipcMain.handle('shell:openDownloads', () => {
    const downloadsDir = require('path').join(require('os').homedir(), 'Videos', 'Viwe')
    shell.openPath(downloadsDir)
  })

  ipcMain.handle('shell:openPath', (_event, filePath: string) => {
    shell.openPath(filePath)
  })
}

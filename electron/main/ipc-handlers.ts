import { ipcMain, shell, BrowserWindow } from 'electron'
import { downloadVideo } from './ytdlp'
import { getHistory, addToHistory, deleteFromHistory } from './store'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Download video
  ipcMain.handle('ytdlp:download', async (_event, url: string) => {
    const result = await downloadVideo(url, mainWindow)

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
    const path = require('path')
    const os = require('os')
    const downloadsDir = path.join(os.homedir(), 'Videos', 'Viwe')
    shell.openPath(downloadsDir)
  })

  ipcMain.handle('shell:openPath', (_event, filePath: string) => {
    shell.openPath(filePath)
  })
}

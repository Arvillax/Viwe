import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Download
  downloadVideo: (url: string): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('ytdlp:download', url),

  // Progress listener
  onProgress: (callback: (data: { percent: number; speed: string; eta: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number; speed: string; eta: string }): void => callback(data)
    ipcRenderer.on('download:progress', handler)
    return () => {
      ipcRenderer.removeListener('download:progress', handler)
    }
  },

  // History
  getHistory: (): Promise<Array<{ id: string; url: string; domain: string; title: string; filePath: string; date: string }>> =>
    ipcRenderer.invoke('history:get'),

  addToHistory: (item: { url: string; domain: string; title: string; filePath: string }): Promise<void> =>
    ipcRenderer.invoke('history:add', item),

  deleteFromHistory: (id: string): Promise<void> =>
    ipcRenderer.invoke('history:delete', id),

  // Shell
  openDownloadFolder: (): Promise<void> =>
    ipcRenderer.invoke('shell:openDownloads'),

  openFilePath: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:openPath', filePath)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.electronAPI = api
}

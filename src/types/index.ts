export interface HistoryItem {
  id: string
  url: string
  domain: string
  title: string
  filePath: string
  date: string
}

export interface DownloadProgress {
  percent: number
  speed: string
  eta: string
}

export type DownloadStatus = 'idle' | 'downloading' | 'done' | 'error'

export interface DownloadState {
  status: DownloadStatus
  progress: DownloadProgress
  error: string | null
  currentUrl: string | null
}

export interface ElectronAPI {
  downloadVideo: (url: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  onProgress: (callback: (data: DownloadProgress) => void) => () => void
  getHistory: () => Promise<HistoryItem[]>
  addToHistory: (item: { url: string; domain: string; title: string; filePath: string }) => Promise<void>
  deleteFromHistory: (id: string) => Promise<void>
  openDownloadFolder: () => Promise<void>
  openFilePath: (filePath: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

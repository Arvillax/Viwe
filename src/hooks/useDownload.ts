import { useState, useEffect, useCallback } from 'react'
import type { DownloadState, HistoryItem } from '../types'

const initialDownloadState: DownloadState = {
  status: 'idle',
  progress: { percent: 0, speed: '', eta: '' },
  error: null,
  currentUrl: null
}

export function useDownload(): {
  downloadState: DownloadState
  history: HistoryItem[]
  startDownload: (url: string) => Promise<void>
  loadHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<void>
  openFolder: () => Promise<void>
  openFile: (filePath: string) => Promise<void>
} {
  const [downloadState, setDownloadState] = useState<DownloadState>(initialDownloadState)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Listen for progress events
  useEffect(() => {
    if (!window.electronAPI) return

    const removeListener = window.electronAPI.onProgress((data) => {
      setDownloadState((prev) => ({
        ...prev,
        progress: data
      }))
    })

    return () => {
      removeListener()
    }
  }, [])

  const loadHistory = useCallback(async () => {
    if (!window.electronAPI) return
    const items = await window.electronAPI.getHistory()
    setHistory(items)
  }, [])

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const startDownload = useCallback(async (url: string) => {
    if (!window.electronAPI) {
      setDownloadState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Electron API not available'
      }))
      return
    }

    setDownloadState({
      status: 'downloading',
      progress: { percent: 0, speed: '', eta: '' },
      error: null,
      currentUrl: url
    })

    try {
      const result = await window.electronAPI.downloadVideo(url)

      if (result.success) {
        setDownloadState((prev) => ({
          ...prev,
          status: 'done',
          progress: { percent: 100, speed: '', eta: '' }
        }))
        // Refresh history
        await loadHistory()
      } else {
        setDownloadState((prev) => ({
          ...prev,
          status: 'error',
          error: result.error || 'Download failed'
        }))
      }
    } catch (err) {
      setDownloadState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      }))
    }
  }, [loadHistory])

  const deleteHistoryItem = useCallback(async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.deleteFromHistory(id)
    await loadHistory()
  }, [loadHistory])

  const openFolder = useCallback(async () => {
    if (!window.electronAPI) return
    await window.electronAPI.openDownloadFolder()
  }, [])

  const openFile = useCallback(async (filePath: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.openFilePath(filePath)
  }, [])

  return {
    downloadState,
    history,
    startDownload,
    loadHistory,
    deleteHistoryItem,
    openFolder,
    openFile
  }
}

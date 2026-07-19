/**
 * useDownload.ts — Hook principal de grabación y historial
 *
 * Orquesta toda la comunicación IPC entre el renderer y el proceso principal:
 * - `startRecording`: inicia la grabación de una URL con duración y modo específicos
 * - `loadHistory`: carga el historial de grabaciones desde el backend (JSON en %APPDATA%)
 * - `deleteHistoryItem`: elimina un item del historial
 * - `openFolder`: abre la carpeta de descargas en Explorer
 * - `openFile`: abre un archivo .mp4 con el reproductor del sistema
 * - `showInFolder`: abre Explorer y resalta el archivo en su ubicación
 *
 * Escucha eventos de progreso en tiempo real vía `onProgress` para actualizar
 * la barra de progreso durante la grabación.
 *
 * El historial se carga automáticamente al montar el componente.
 */

import { useState, useEffect, useCallback } from 'react'
import type { DownloadState, HistoryItem, RecordMode } from '../types'

/** Estado inicial de la descarga (inactivo, sin progreso, sin error) */
const initialDownloadState: DownloadState = {
  status: 'idle',
  progress: { percent: 0, speed: '', eta: '' },
  error: null,
  currentUrl: null
}

export function useDownload(): {
  downloadState: DownloadState
  history: HistoryItem[]
  startRecording: (url: string, duration: number, mode: RecordMode) => Promise<void>
  loadHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<void>
  openFolder: () => Promise<void>
  openFile: (filePath: string) => Promise<void>
  showInFolder: (filePath: string) => Promise<void>
} {
  /** Estado actual de la grabación (idle → downloading → done/error) */
  const [downloadState, setDownloadState] = useState<DownloadState>(initialDownloadState)

  /** Lista de videos grabados previamente (cargados desde el backend) */
  const [history, setHistory] = useState<HistoryItem[]>([])

  /**
   * Listener de progreso — se registra una vez al montar y se limpia al desmontar.
   * El backend emite eventos `progress` vía IPC durante la grabación.
   */
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

  /** Carga el historial completo desde el backend (JSON en %APPDATA%/Viwe) */
  const loadHistory = useCallback(async () => {
    if (!window.electronAPI) return
    const items = await window.electronAPI.getHistory()
    setHistory(items)
  }, [])

  /** Carga el historial al montar por primera vez */
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  /**
   * Inicia una grabación. Flujo:
   * 1. Cambia estado a 'downloading' (muestra barra de progreso)
   * 2. Llama al backend vía IPC con URL, duración y modo
   * 3. Si éxito → estado 'done' + recarga historial
   * 4. Si error → estado 'error' con mensaje descriptivo
   */
  const startRecording = useCallback(async (url: string, duration: number, mode: RecordMode) => {
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
      const result = await window.electronAPI.recordVideo(url, duration, mode)

      if (result.success) {
        setDownloadState((prev) => ({
          ...prev,
          status: 'done',
          progress: { percent: 100, speed: '', eta: '' }
        }))
        // Refrescar historial para mostrar el nuevo video
        await loadHistory()
      } else {
        setDownloadState((prev) => ({
          ...prev,
          status: 'error',
          error: result.error || 'Recording failed'
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

  /** Elimina un item del historial por ID y refresca la lista */
  const deleteHistoryItem = useCallback(async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.deleteFromHistory(id)
    await loadHistory()
  }, [loadHistory])

  /** Abre la carpeta de descargas en Explorer (%APPDATA%/Viwe/output) */
  const openFolder = useCallback(async () => {
    if (!window.electronAPI) return
    await window.electronAPI.openDownloadFolder()
  }, [])

  /** Abre un archivo .mp4 con el reproductor predeterminado del sistema */
  const openFile = useCallback(async (filePath: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.openFilePath(filePath)
  }, [])

  /** Abre Explorer y resalta el archivo en su ubicación (shell.showItemInFolder) */
  const showInFolder = useCallback(async (filePath: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.showInFolder(filePath)
  }, [])

  return {
    downloadState,
    history,
    startRecording,
    loadHistory,
    deleteHistoryItem,
    openFolder,
    openFile,
    showInFolder
  }
}

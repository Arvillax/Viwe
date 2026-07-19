/**
 * preload/index.ts — Script de precarga de Electron
 *
 * Se ejecuta antes del renderer process y expone una API segura al frontend.
 * Usa contextBridge para exponer funciones específicas sin exponer
 * el objeto ipcRenderer directamente (previene vulnerabilidades de seguridad).
 *
 * API expuesta window.electronAPI:
 * - recordVideo(url, duration, mode) — Graba una URL y genera MP4
 * - onProgress(callback) — Escucha actualizaciones de progreso
 * - getHistory() — Obtiene el historial de grabaciones
 * - addToHistory(item) — Agrega una entrada al historial
 * - deleteFromHistory(id) — Elimina una entrada del historial
 * - openDownloadFolder() — Abre la carpeta de descargas
 * - openFilePath(path) — Abre un archivo con el reproductor default
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  /**
   * Graba una página web y genera un archivo MP4.
   *
   * @param url - URL de la página a grabar
   * @param duration - Duración en segundos (5-300)
   * @param mode - Modo: 'static' (viewport fijo) o 'scroll' (auto-scroll)
   * @returns Resultado con éxito/error, ruta del archivo y título
   */
  recordVideo: (url: string, duration: number, mode: 'static' | 'scroll'): Promise<{ success: boolean; filePath?: string; title?: string; error?: string }> =>
    ipcRenderer.invoke('recorder:record', url, duration, mode),

  /**
   * Escucha actualizaciones de progreso de la grabación.
   * Se llama cada segundo durante la grabación.
   *
   * @param callback - Función que recibe { percent, speed, eta }
   * @returns Función para cancelar la suscripción
   */
  onProgress: (callback: (data: { percent: number; speed: string; eta: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number; speed: string; eta: string }): void => callback(data)
    ipcRenderer.on('download:progress', handler)
    return () => {
      ipcRenderer.removeListener('download:progress', handler)
    }
  },

  /**
   * Obtiene todas las entradas del historial de grabaciones.
   */
  getHistory: (): Promise<Array<{ id: string; url: string; domain: string; title: string; filePath: string; date: string }>> =>
    ipcRenderer.invoke('history:get'),

  /**
   * Agrega una entrada al historial de grabaciones.
   */
  addToHistory: (item: { url: string; domain: string; title: string; filePath: string }): Promise<void> =>
    ipcRenderer.invoke('history:add', item),

  /**
   * Elimina una entrada del historial por su ID.
   */
  deleteFromHistory: (id: string): Promise<void> =>
    ipcRenderer.invoke('history:delete', id),

  /**
   * Abre la carpeta ~/Videos/Viwe/ en el Explorer de Windows.
   */
  openDownloadFolder: (): Promise<void> =>
    ipcRenderer.invoke('shell:openDownloads'),

  /**
   * Abre un archivo con el programa predeterminado del sistema.
   * Para .mp4, abre el reproductor de video default.
   */
  openFilePath: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:openPath', filePath),

  /**
   * Abre el Explorer en la carpeta que contiene el archivo
   * y resalta el archivo seleccionado.
   */
  showInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:showInFolder', filePath)
}

// Exponer API al renderer process de forma segura
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback para contextBridge deshabilitado (no recomendado)
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.electronAPI = api
}

/**
 * ipc-handlers.ts — Registrador de handlers IPC
 *
 * Registra todos los handlers que el renderer process puede invocar
 * via ipcRenderer.invoke(). Esta es la capa de comunicación entre
 * el frontend (React) y el backend (Node.js/Electron).
 *
 * Handlers registrados:
 * - recorder:record — Graba una URL y genera un MP4
 * - history:get — Obtiene el historial de grabaciones
 * - history:add — Agrega una entrada al historial
 * - history:delete — Elimina una entrada del historial
 * - shell:openDownloads — Abre la carpeta de descargas en Explorer
 * - shell:openPath — Abre un archivo con el programa predeterminado
 */

import { ipcMain, shell, BrowserWindow } from 'electron'
import { recordVideo, type RecordMode } from './recorder'
import { getHistory, addToHistory, deleteFromHistory } from './store'

/**
 * Registra todos los handlers IPC en la ventana principal.
 * Debe llamarse una vez después de crear el BrowserWindow.
 *
 * @param mainWindow - Ventana principal de Electron
 */
export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  /**
   * Handler: recorder:record
   * Graba una página web y genera un archivo MP4.
   *
   * @param url - URL de la página a grabar
   * @param duration - Duración en segundos (5-300)
   * @param mode - Modo de grabación: 'static' o 'scroll'
   * @returns Resultado con éxito/error, ruta del archivo y título
   */
  ipcMain.handle('recorder:record', async (_event, url: string, duration: number, mode: RecordMode) => {
    const result = await recordVideo(url, duration, mode, mainWindow)

    // Si la grabación fue exitosa, guardar en historial
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

  /**
   * Handler: history:get
   * Retorna todas las entradas del historial de grabaciones.
   * Las entradas se almacenan en %APPDATA%/Viwe/viwe-data.json
   */
  ipcMain.handle('history:get', () => {
    return getHistory()
  })

  /**
   * Handler: history:add
   * Agrega una nueva entrada al historial.
   */
  ipcMain.handle('history:add', (_event, item) => {
    addToHistory(item)
  })

  /**
   * Handler: history:delete
   * Elimina una entrada del historial por su ID.
   */
  ipcMain.handle('history:delete', (_event, id: string) => {
    deleteFromHistory(id)
  })

  /**
   * Handler: shell:openDownloads
   * Abre la carpeta ~/Videos/Viwe/ en el Explorer de Windows.
   */
  ipcMain.handle('shell:openDownloads', () => {
    const downloadsDir = require('path').join(require('os').homedir(), 'Videos', 'Viwe')
    shell.openPath(downloadsDir)
  })

  /**
   * Handler: shell:openPath
   * Abre un archivo con el programa predeterminado del sistema.
   * Para archivos .mp4, abre el reproductor de video predeterminado.
   */
  ipcMain.handle('shell:openPath', (_event, filePath: string) => {
    shell.openPath(filePath)
  })

  /**
   * Handler: shell:showInFolder
   * Abre el Explorer de Windows en la carpeta que contiene el archivo
   * y resalta el archivo seleccionado.
   */
  ipcMain.handle('shell:showInFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

/**
 * index.ts — Punto de entrada del proceso principal de Electron
 *
 * Este archivo es el corazón de la aplicación Electron.
 * Se ejecuta en el proceso principal (Node.js) y es responsable de:
 * 1. Crear y configurar la ventana principal
 * 2. Registrar los handlers IPC para comunicación con el frontend
 * 3. Gestionar el ciclo de vida de la aplicación
 *
 * Arquitectura:
 * ┌─────────────────────────────────────────────┐
 * │  Main Process (este archivo)                │
 * │  - Node.js + Electron                       │
 * │  - Maneja ventanas, IPC, sistema de archivos│
 * │  - Spawn de Patchright (Chromium headless)  │
 * ├─────────────────────────────────────────────┤
 * │  Renderer Process (React + Tailwind)        │
 * │  - UI: URLInput, HistoryList, VideoPlayer   │
 * │  - Comunica con main via ipcRenderer.invoke │
 * └─────────────────────────────────────────────┘
 */

import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'

/**
 * Crea la ventana principal de la aplicación.
 *
 * Configuración:
 * - Tamaño: 960x640 (mínimo 720x480)
 * - Color de fondo: #051923 (Blue Lagoon - color principal)
 * - Title bar: hiddenInset (estilo macOS-like en Windows)
 * - Menu: oculto automáticamente
 * - Preload: script de precarga para API segura
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    show: false, // Se muestra cuando esté listo (evita flash blanco)
    autoHideMenuBar: true,
    backgroundColor: '#051923',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Mostrar ventana cuando esté lista para evitar flash de contenido blanco
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Abrir links externos en el navegador del sistema (no dentro de la app)
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Registrar handlers IPC (comunicación frontend ↔ backend)
  registerIpcHandlers(mainWindow)

  // Cargar la interfaz del frontend
  // En desarrollo: URL del dev server de Vite (con HMR)
  // En producción: archivo HTML compilado
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Ciclo de vida de la aplicación.
 *
 * 1. app.whenReady() — Electron está listo para crear ventanas
 * 2. setAppUserModelId() — ID de la app para Windows Taskbar
 * 3. watchWindowShortcuts() — Atajos de teclado del sistema
 * 4. createWindow() — Crear la ventana principal
 */
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.viwe')

  // Habilitar atajos de teclado del sistema (F11 para fullscreen, etc.)
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // macOS: recrear ventana si se hace click en el dock y no hay ventanas abiertas
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Cerrar la app cuando todas las ventanas estén cerradas (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

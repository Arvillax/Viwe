/**
 * recorder.ts — Motor de grabación de páginas web
 *
 * Utiliza Patchright (fork anti-detección de Playwright) para abrir una URL
 * en Chromium, grabar el viewport del navegador y exportar como MP4.
 *
 * Flujo:
 * 1. Lanza Chromium headless con Patchright (pasa verificaciones Cloudflare)
 * 2. Navega a la URL y espera que cargue
 * 3. Graba el viewport por la duración especificada (modo estático o scroll)
 * 4. Convierte el .webm resultante a .mp4 usando ffmpeg
 * 5. Guarda el archivo en ~/Videos/Viwe/
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'patchright'
import { app, BrowserWindow } from 'electron'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

/** Modo de grabación: estático (viewport fijo) o scroll (auto-scroll suave) */
export type RecordMode = 'static' | 'scroll'

/** Resultado de una operación de grabación */
export interface RecordResult {
  success: boolean
  filePath?: string
  title?: string
  error?: string
}

/**
 * Obtiene la ruta del directorio de descargas de Viwe.
 * Crea el directorio si no existe.
 * Ruta: ~/Videos/Viwe/
 */
function getDownloadsDir(): string {
  const dir = path.join(os.homedir(), 'Videos', 'Viwe')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Obtiene la ruta del directorio temporal para grabaciones.
 * Los archivos .webm se guardan aquí temporalmente antes de convertir a MP4.
 * Ruta: %TEMP%/viwe-recordings/
 */
function getTempDir(): string {
  const dir = path.join(os.tmpdir(), 'viwe-recordings')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Obtiene la ruta completa de ffmpeg.exe.
 * En desarrollo: bin/ffmpeg.exe
 * En producción: resources/bin/ffmpeg.exe (bundled via extraResources)
 */
function getFfmpegPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(process.cwd(), 'bin', 'ffmpeg.exe')
  }
  return path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
}

/**
 * Envía actualizaciones de progreso al renderer process.
 * El frontend escucha estos eventos para mostrar la barra de progreso.
 *
 * @param mainWindow - Ventana principal de Electron
 * @param data - Datos de progreso: porcentaje, velocidad y ETA
 */
function emitProgress(
  mainWindow: BrowserWindow,
  data: { percent: number; speed: string; eta: string }
): void {
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download:progress', data)
  }
}

/**
 * Formatea milisegundos a formato MM:SS para mostrar ETA.
 *
 * @param ms - Milisegundos restantes
 * @returns String en formato "MM:SS"
 */
function formatEta(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

/**
 * Limpia un nombre de archivo de caracteres inválidos en Windows.
 * Remueve: < > : " / \ | ? * y reemplaza múltiples espacios por uno solo.
 *
 * @param name - Nombre original (normalmente el título de la página)
 * @returns Nombre seguro para usar como archivo, máximo 200 caracteres
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
}

/**
 * Función principal de grabación.
 *
 * Abre una URL en Chromium (headless), graba el viewport por la duración
 * especificada, y exporta como MP4. Soporta dos modos:
 * - 'static': El viewport queda fijo, graba lo que se ve en pantalla
 * - 'scroll': Hace auto-scroll suave (30px cada 100ms con behavior: smooth)
 *
 * @param url - URL de la página a grabar
 * @param duration - Duración de la grabación en segundos (5-300)
 * @param mode - Modo de grabación: 'static' o 'scroll'
 * @param mainWindow - Ventana principal de Electron (para emitir progreso)
 * @returns Resultado con éxito/error y ruta del archivo generado
 */
export async function recordVideo(
  url: string,
  duration: number,
  mode: RecordMode,
  mainWindow: BrowserWindow
): Promise<RecordResult> {
  const tempDir = getTempDir()
  const downloadsDir = getDownloadsDir()
  const ffmpegPath = getFfmpegPath()

  // Verificar que ffmpeg existe (necesario para convertir WebM → MP4)
  if (!fs.existsSync(ffmpegPath)) {
    return { success: false, error: 'ffmpeg.exe no encontrado en bin/' }
  }

  let browser: Browser | null = null

  try {
    // ─── PASO 1: Lanzar Chromium con Patchright ───
    // Patchright parchea TLS fingerprint, navigator.webdriver, y trazas CDP
    // para pasar verificaciones de Cloudflare y otros anti-bots.
    // Se usa channel: 'chrome' para usar Chrome real del usuario si está instalado.
    emitProgress(mainWindow, {
      percent: 0,
      speed: 'Iniciando navegador...',
      eta: formatEta(duration * 1000)
    })

    browser = await chromium.launch({
      headless: true
    })

    // Crear contexto con grabación de video habilitada
    // El video se graba como WebM (VP8) en el directorio temporal
    const context = await browser.newContext({
      recordVideo: {
        dir: tempDir,
        size: { width: 1280, height: 720 }
      },
      viewport: { width: 1280, height: 720 }
    })

    const page = await context.newPage()

    // ─── PASO 2: Navegar a la URL ───
    // Se usa waitUntil: 'load' en vez de 'networkidle' para compatibilidad
    // con sitios que tienen trackers/analytics que nunca dejan de hacer requests.
    // Timeout: 60 segundos para sitios lentos.
    emitProgress(mainWindow, {
      percent: 5,
      speed: 'Cargando página...',
      eta: formatEta(duration * 1000)
    })

    await page.goto(url, {
      waitUntil: 'load',
      timeout: 60000
    })

    const pageTitle = await page.title()
    emitProgress(mainWindow, {
      percent: 10,
      speed: 'Página cargada',
      eta: formatEta(duration * 1000)
    })

    // ─── PASO 3: Grabar por la duración especificada ───
    const durationMs = duration * 1000
    const startTime = Date.now()
    const progressStart = 10
    const progressEnd = 90
    const progressRange = progressEnd - progressStart

    if (mode === 'scroll') {
      // Modo SCROLL: Auto-scroll suave mientras graba
      // Scroll constante de 30px cada 100ms con CSS behavior: 'smooth'
      // Esto crea un efecto de scroll tenue y natural (~300px/s)
      const scrollInterval = setInterval(() => {
        page.evaluate(() => window.scrollBy({ top: 30, behavior: 'smooth' })).catch(() => {})
      }, 100)

      while (Date.now() - startTime < durationMs) {
        const elapsed = Date.now() - startTime
        const percent = progressStart + Math.round((elapsed / durationMs) * progressRange)
        emitProgress(mainWindow, {
          percent,
          speed: 'Grabando (scroll)...',
          eta: formatEta(durationMs - elapsed)
        })
        await page.waitForTimeout(1000)
      }
      clearInterval(scrollInterval)
    } else {
      // Modo ESTÁTICO: El viewport queda fijo, solo graba lo que se ve
      while (Date.now() - startTime < durationMs) {
        const elapsed = Date.now() - startTime
        const percent = progressStart + Math.round((elapsed / durationMs) * progressRange)
        emitProgress(mainWindow, {
          percent,
          speed: 'Grabando...',
          eta: formatEta(durationMs - elapsed)
        })
        await page.waitForTimeout(1000)
      }
    }

    // ─── PASO 4: Cerrar contexto para flush del video ───
    // IMPORTANTE: El video solo se escribe a disco cuando se cierra el contexto.
    // No se puede acceder al path del video antes de cerrar.
    emitProgress(mainWindow, {
      percent: 90,
      speed: 'Guardando grabación...',
      eta: '00:00'
    })

    const video = page.video()
    await context.close()

    // ─── PASO 5: Obtener la ruta del .webm grabado ───
    let webmPath = ''
    if (video) {
      webmPath = await video.path()
    }

    // Fallback: si no se pudo obtener el path, buscar el .webm más reciente
    if (!webmPath || !fs.existsSync(webmPath)) {
      const files = fs.readdirSync(tempDir)
        .filter(f => f.endsWith('.webm'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(tempDir, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time)

      if (files.length > 0) {
        webmPath = path.join(tempDir, files[0].name)
      } else {
        return { success: false, error: 'No se generó archivo de video' }
      }
    }

    // ─── PASO 6: Convertir WebM a MP4 con ffmpeg ───
    // WebM (VP8) → MP4 (H.264) para compatibilidad con todos los reproductores
    // Flags: -c:v libx264 (codec H.264), -crf 23 (calidad buena), -pix_fmt yuv420p (compatibilidad)
    emitProgress(mainWindow, {
      percent: 92,
      speed: 'Convirtiendo a MP4...',
      eta: '00:00'
    })

    const safeTitle = sanitizeFilename(pageTitle || 'video')
    const mp4Name = `${safeTitle}.mp4`
    const mp4TempPath = path.join(tempDir, mp4Name)
    const finalPath = path.join(downloadsDir, mp4Name)

    execSync(
      `"${ffmpegPath}" -y -i "${webmPath}" -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart "${mp4TempPath}"`,
      { stdio: 'pipe', timeout: 120000 }
    )

    // ─── PASO 7: Mover MP4 al directorio de descargas ───
    emitProgress(mainWindow, {
      percent: 98,
      speed: 'Finalizando...',
      eta: '00:00'
    })

    // Si ya existe un archivo con el mismo nombre, eliminarlo primero
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath)
    }
    fs.renameSync(mp4TempPath, finalPath)

    // ─── PASO 8: Limpiar archivos temporales ───
    try {
      if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath)
      // Limpiar todos los archivos temporales de esta grabación
      const tempFiles = fs.readdirSync(tempDir)
      for (const f of tempFiles) {
        const fPath = path.join(tempDir, f)
        try { fs.unlinkSync(fPath) } catch {}
      }
    } catch {}

    // Cerrar navegador
    await browser.close()
    browser = null

    emitProgress(mainWindow, {
      percent: 100,
      speed: 'Completado',
      eta: '00:00'
    })

    return {
      success: true,
      filePath: finalPath,
      title: safeTitle
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: errorMsg }
  } finally {
    // Asegurar que el navegador se cierre siempre, incluso si hay error
    if (browser) {
      try { await browser.close() } catch {}
    }
    // Limpiar directorio temporal
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir)
        for (const f of files) {
          try { fs.unlinkSync(path.join(tempDir, f)) } catch {}
        }
        fs.rmdirSync(tempDir)
      }
    } catch {}
  }
}

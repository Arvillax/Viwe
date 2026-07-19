import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { app, BrowserWindow } from 'electron'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

export type RecordMode = 'static' | 'scroll'

export interface RecordResult {
  success: boolean
  filePath?: string
  title?: string
  error?: string
}

function getDownloadsDir(): string {
  const dir = path.join(os.homedir(), 'Videos', 'Viwe')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getTempDir(): string {
  const dir = path.join(os.tmpdir(), 'viwe-recordings')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getFfmpegPath(): string {
  // In dev, use bin/ffmpeg.exe. In production, use extraResources
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(process.cwd(), 'bin', 'ffmpeg.exe')
  }
  return path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
}

function emitProgress(
  mainWindow: BrowserWindow,
  data: { percent: number; speed: string; eta: string }
): void {
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download:progress', data)
  }
}

function formatEta(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
}

export async function recordVideo(
  url: string,
  duration: number,
  mode: RecordMode,
  mainWindow: BrowserWindow
): Promise<RecordResult> {
  const tempDir = getTempDir()
  const downloadsDir = getDownloadsDir()
  const ffmpegPath = getFfmpegPath()

  // Verify ffmpeg exists
  if (!fs.existsSync(ffmpegPath)) {
    return { success: false, error: 'ffmpeg.exe no encontrado en bin/' }
  }

  let browser: Browser | null = null

  try {
    // Step 1: Launch Chromium
    emitProgress(mainWindow, {
      percent: 0,
      speed: 'Iniciando navegador...',
      eta: formatEta(duration * 1000)
    })

    browser = await chromium.launch({
      headless: true
    })

    const context = await browser.newContext({
      recordVideo: {
        dir: tempDir,
        size: { width: 1280, height: 720 }
      },
      viewport: { width: 1280, height: 720 }
    })

    const page = await context.newPage()

    // Step 2: Navigate to URL
    emitProgress(mainWindow, {
      percent: 5,
      speed: 'Cargando página...',
      eta: formatEta(duration * 1000)
    })

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    const pageTitle = await page.title()
    emitProgress(mainWindow, {
      percent: 10,
      speed: 'Página cargada',
      eta: formatEta(duration * 1000)
    })

    // Step 3: Record for duration
    const durationMs = duration * 1000
    const startTime = Date.now()
    const progressStart = 10
    const progressEnd = 90
    const progressRange = progressEnd - progressStart

    if (mode === 'scroll') {
      // Smooth constant scroll while recording
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
      // Static — just wait
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

    // Step 4: Close context to flush video
    emitProgress(mainWindow, {
      percent: 90,
      speed: 'Guardando grabación...',
      eta: '00:00'
    })

    const video = page.video()
    await context.close()

    // Step 5: Get .webm path
    let webmPath = ''
    if (video) {
      webmPath = await video.path()
    }

    // Fallback: find the newest .webm in temp dir
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

    // Step 6: Convert to MP4
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

    // Step 7: Move to downloads
    emitProgress(mainWindow, {
      percent: 98,
      speed: 'Finalizando...',
      eta: '00:00'
    })

    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath)
    }
    fs.renameSync(mp4TempPath, finalPath)

    // Step 8: Cleanup temp files
    try {
      if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath)
      // Clean other temp files
      const tempFiles = fs.readdirSync(tempDir)
      for (const f of tempFiles) {
        const fPath = path.join(tempDir, f)
        try { fs.unlinkSync(fPath) } catch {}
      }
    } catch {}

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
    if (browser) {
      try { await browser.close() } catch {}
    }
    // Cleanup temp dir
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

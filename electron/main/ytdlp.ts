import { spawn, type ChildProcess } from 'child_process'
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

function getBinaryPath(name: string): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(process.cwd(), 'bin', name)
  }
  return path.join(process.resourcesPath, 'bin', name)
}

function getDownloadsDir(): string {
  const dir = path.join(os.homedir(), 'Videos', 'Viwe')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export interface YtDlpResult {
  success: boolean
  filePath?: string
  title?: string
  error?: string
}

/**
 * Collect all output from a child process stream
 */
function collectOutput(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve) => {
    let output = ''
    stream.on('data', (data: Buffer) => {
      output += data.toString()
    })
    stream.on('end', () => resolve(output))
    // Also resolve when stream closes without end event
    stream.on('close', () => resolve(output))
  })
}

/**
 * Run yt-dlp with given args and return { stdout, stderr, exitCode }
 */
function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const ytdlpPath = getBinaryPath('yt-dlp.exe')

    const proc: ChildProcess = spawn(ytdlpPath, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code })
    })

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1 })
    })
  })
}

/**
 * Extract clean error message from yt-dlp stderr, filtering out warnings
 */
function extractError(stderr: string): string {
  const lines = stderr.split('\n').filter(Boolean)
  const errors: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip common non-fatal warnings
    if (
      trimmed.startsWith('WARNING:') ||
      trimmed.startsWith('[youtube] No supported JavaScript') ||
      trimmed.includes('ffmpeg not found') ||
      trimmed === ''
    ) {
      continue
    }
    // Collect actual errors
    if (
      trimmed.includes('ERROR:') ||
      trimmed.includes('is not a valid URL') ||
      trimmed.includes('Unsupported URL')
    ) {
      errors.push(trimmed)
    }
  }

  return errors.length > 0 ? errors.join('\n') : ''
}

export function downloadVideo(
  url: string,
  mainWindow: BrowserWindow
): Promise<YtDlpResult> {
  return new Promise(async (resolve) => {
    const ytdlpPath = getBinaryPath('yt-dlp.exe')

    if (!fs.existsSync(ytdlpPath)) {
      resolve({ success: false, error: 'yt-dlp.exe not found in bin/' })
      return
    }

    const downloadsDir = getDownloadsDir()
    const outputTemplate = path.join(downloadsDir, '%(title)s [%(id)s].%(ext)s')

    // Step 1: Get video info first (fast, no download)
    mainWindow.webContents.send('download:progress', {
      percent: 0,
      speed: 'Obteniendo info...',
      eta: ''
    })

    const infoResult = await runYtDlp([
      '--dump-json',
      '--no-playlist',
      '--extractor-args', '["generic:impersonate"]',
      url
    ])

    // Check for real errors (not just warnings)
    const realError = extractError(infoResult.stderr)

    if (infoResult.exitCode !== 0 && realError) {
      resolve({ success: false, error: realError })
      return
    }

    // Try to parse the JSON info
    let videoInfo: { title?: string; id?: string } = {}
    try {
      // --dump-json outputs one JSON object per line
      const lines = infoResult.stdout.split('\n').filter(l => l.trim().startsWith('{'))
      if (lines.length > 0) {
        videoInfo = JSON.parse(lines[lines.length - 1])
      }
    } catch {
      // JSON parse failed, continue anyway — we'll get title from filename
    }

    const videoTitle = videoInfo.title || 'Video'
    const videoId = videoInfo.id || ''

    // Step 2: Download the video
    mainWindow.webContents.send('download:progress', {
      percent: 1,
      speed: 'Descargando...',
      eta: ''
    })

    const downloadArgs = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--newline',
      '--no-playlist',
      '--extractor-args', '["generic:impersonate"]',
      url
    ]

    const proc: ChildProcess = spawn(ytdlpPath, downloadArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let jsonOutput = ''
    let stderrOutput = ''

    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)

      for (const line of lines) {
        // Parse progress: [download]  42.3% of  120.50MiB at  5.23MiB/s ETA 00:15
        const progressMatch = line.match(/\[download\]\s+([\d.]+)%.*?at\s+([\d.]+\S+\/s)\s+ETA\s+(\S+)/)
        if (progressMatch) {
          mainWindow.webContents.send('download:progress', {
            percent: parseFloat(progressMatch[1]),
            speed: progressMatch[2],
            eta: progressMatch[3]
          })
          continue
        }

        // Collect JSON from --print-json if present
        if (line.startsWith('{')) {
          jsonOutput = line
        }
      }
    })

    proc.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        // Success — construct filepath
        let filePath = path.join(downloadsDir, `${videoTitle} [${videoId}].mp4`)

        // If we got JSON output, try to get the exact filepath
        if (jsonOutput) {
          try {
            const info = JSON.parse(jsonOutput)
            const requestedDownloads = info.requested_downloads
            if (requestedDownloads?.[0]?.filepath) {
              filePath = requestedDownloads[0].filepath
            }
          } catch {
            // Use the constructed filepath
          }
        }

        // Verify the file actually exists
        if (fs.existsSync(filePath)) {
          resolve({
            success: true,
            filePath,
            title: videoTitle
          })
        } else {
          // Try to find the file by looking for the most recent mp4 in downloads
          const files = fs.readdirSync(downloadsDir)
            .filter(f => f.endsWith('.mp4'))
            .map(f => ({
              name: f,
              time: fs.statSync(path.join(downloadsDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)

          if (files.length > 0) {
            resolve({
              success: true,
              filePath: path.join(downloadsDir, files[0].name),
              title: videoTitle
            })
          } else {
            resolve({
              success: false,
              error: 'El video se descargó pero no se encontró el archivo en disco'
            })
          }
        }
      } else {
        // Real error from yt-dlp
        const errorMsg = extractError(stderrOutput)
        resolve({
          success: false,
          error: errorMsg || `yt-dlp falló con código ${code}`
        })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

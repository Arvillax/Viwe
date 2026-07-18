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

export function downloadVideo(
  url: string,
  mainWindow: BrowserWindow
): Promise<YtDlpResult> {
  return new Promise((resolve) => {
    const ytdlpPath = getBinaryPath('yt-dlp.exe')

    if (!fs.existsSync(ytdlpPath)) {
      resolve({ success: false, error: 'yt-dlp.exe not found in bin/' })
      return
    }

    const downloadsDir = getDownloadsDir()
    const outputTemplate = path.join(downloadsDir, '%(title)s [%(id)s].%(ext)s')

    const args = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--newline',
      '--no-playlist',
      '--print-json',
      url
    ]

    const proc: ChildProcess = spawn(ytdlpPath, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let jsonOutput = ''
    let stderrOutput = ''

    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)

      for (const line of lines) {
        // Parse progress lines like: [download]  42.3% of  120.50MiB at  5.23MiB/s ETA 00:15
        const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/)
        if (progressMatch) {
          const progress = {
            percent: parseFloat(progressMatch[1]),
            speed: progressMatch[3],
            eta: progressMatch[4]
          }
          mainWindow.webContents.send('download:progress', progress)
          continue
        }

        // Collect JSON output (last line with [info] or full JSON)
        if (line.startsWith('{')) {
          jsonOutput = line
        }
      }
    })

    proc.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0 && jsonOutput) {
        try {
          const info = JSON.parse(jsonOutput)
          // Find the actual output file
          const requestedDownloads = info.requested_downloads
          const filePath = requestedDownloads?.[0]?.filepath
            || path.join(downloadsDir, `${info.title} [${info.id}].mp4`)

          resolve({
            success: true,
            filePath,
            title: info.title || 'Video'
          })
        } catch {
          resolve({ success: false, error: 'Failed to parse yt-dlp output' })
        }
      } else {
        resolve({
          success: false,
          error: stderrOutput || `yt-dlp exited with code ${code}`
        })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

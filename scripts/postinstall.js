const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')

const BIN_DIR = path.join(__dirname, '..', 'bin')

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close()
        fs.unlinkSync(dest)
        return download(response.headers.location, dest).then(resolve).catch(reject)
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function main() {
  // Only download on Windows
  if (process.platform !== 'win32') {
    console.log('[postinstall] Skipping yt-dlp download — not Windows')
    return
  }

  // Ensure bin directory exists
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  const ytdlpPath = path.join(BIN_DIR, 'yt-dlp.exe')

  // Skip if already exists
  if (fs.existsSync(ytdlpPath)) {
    console.log('[postinstall] yt-dlp.exe already exists, skipping download')
    return
  }

  console.log('[postinstall] Downloading yt-dlp.exe...')

  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'

  try {
    await download(url, ytdlpPath)
    console.log('[postinstall] yt-dlp.exe downloaded successfully')
  } catch (err) {
    console.error('[postinstall] Failed to download yt-dlp.exe:', err.message)
    console.log('[postinstall] You can manually place yt-dlp.exe in the bin/ directory')
  }
}

main()

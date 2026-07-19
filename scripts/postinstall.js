const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

const BIN_DIR = path.join(__dirname, '..', 'bin')

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close()
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        return download(response.headers.location, dest).then(resolve).catch(reject)
      }
      if (response.statusCode !== 200) {
        file.close()
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`))
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function downloadFfmpeg() {
  const ffmpegPath = path.join(BIN_DIR, 'ffmpeg.exe')
  if (fs.existsSync(ffmpegPath)) {
    console.log('[postinstall] ffmpeg.exe already exists, skipping')
    return
  }

  console.log('[postinstall] Downloading ffmpeg...')
  const zipPath = path.join(BIN_DIR, 'ffmpeg.zip')
  const url = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

  try {
    await download(url, zipPath)
    console.log('[postinstall] Extracting ffmpeg.exe from zip...')

    try {
      execSync(`tar -xf "${zipPath}" -C "${BIN_DIR}" --strip-components=2 --include="*/bin/ffmpeg.exe"`, {
        stdio: 'pipe'
      })
    } catch {
      const psScript = path.join(BIN_DIR, '_extract.ps1')
      const scriptContent = `
Add-Type -Assembly "System.IO.Compression.FileSystem"
$zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath}')
$entry = $zip.Entries | Where-Object { $_.FullName -like '*/bin/ffmpeg.exe' }
if ($entry) {
  $stream = $entry.Open()
  $dest = [System.IO.File]::Create('${ffmpegPath}')
  $stream.CopyTo($dest)
  $dest.Close()
  $stream.Close()
}
$zip.Dispose()
Remove-Item '${psScript}' -ErrorAction SilentlyContinue
`
      fs.writeFileSync(psScript, scriptContent, 'utf-8')
      execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'pipe' })
    }

    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

    if (fs.existsSync(ffmpegPath)) {
      console.log('[postinstall] ffmpeg.exe extracted successfully')
    } else {
      console.log('[postinstall] WARNING: Could not extract ffmpeg.exe')
    }
  } catch (err) {
    console.error('[postinstall] Failed to download ffmpeg:', err.message)
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  }
}

async function installPlaywright() {
  console.log('[postinstall] Installing Playwright Chromium...')
  try {
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    console.log('[postinstall] Playwright Chromium installed successfully')
  } catch (err) {
    console.error('[postinstall] Failed to install Playwright Chromium:', err.message)
    console.log('[postinstall] Run manually: npx playwright install chromium')
  }
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[postinstall] Skipping binary downloads — not Windows')
    return
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  await downloadFfmpeg()
  await installPlaywright()
}

main()

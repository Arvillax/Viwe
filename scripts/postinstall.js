/**
 * postinstall.js — Script de instalación post-npm install
 *
 * Se ejecuta automáticamente después de `npm install`.
 * Descarga los binarios necesarios para el funcionamiento de Viwe:
 * 1. ffmpeg.exe — Convertidor de video (WebM → MP4)
 * 2. Chromium via Patchright — Navegador anti-detección para grabar páginas
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

/** Directorio donde se almacenan los binarios */
const BIN_DIR = path.join(__dirname, '..', 'bin')

/**
 * Descarga un archivo desde una URL a una ruta local.
 * Sigue redirects HTTP (3xx) automáticamente.
 *
 * @param url - URL de descarga
 * @param dest - Ruta del archivo destino
 */
async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      // Seguir redirects (301, 302, etc.)
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

/**
 * Descarga e instala ffmpeg.exe desde GitHub Releases.
 * ffmpeg es necesario para convertir WebM (formato de Grabwright) a MP4.
 * Se descarga de yt-dlp/FFmpeg-Builds (builds oficiales de ffmpeg para Windows).
 */
async function downloadFfmpeg() {
  const ffmpegPath = path.join(BIN_DIR, 'ffmpeg.exe')
  if (fs.existsSync(ffmpegPath)) {
    console.log('[postinstall] ffmpeg.exe ya existe, omitiendo')
    return
  }

  console.log('[postinstall] Descargando ffmpeg...')
  const zipPath = path.join(BIN_DIR, 'ffmpeg.zip')
  const url = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

  try {
    await download(url, zipPath)
    console.log('[postinstall] Extrayendo ffmpeg.exe...')

    // Intentar extraer con tar (disponible en Windows 10+)
    try {
      execSync(`tar -xf "${zipPath}" -C "${BIN_DIR}" --strip-components=2 --include="*/bin/ffmpeg.exe"`, {
        stdio: 'pipe'
      })
    } catch {
      // Fallback: usar PowerShell con script temporal
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

    // Limpiar zip descargado
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

    if (fs.existsSync(ffmpegPath)) {
      console.log('[postinstall] ffmpeg.exe extraído correctamente')
    } else {
      console.log('[postinstall] ADVERTENCIA: No se pudo extraer ffmpeg.exe')
    }
  } catch (err) {
    console.error('[postinstall] Error descargando ffmpeg:', err.message)
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  }
}

/**
 * Instala Chromium via Patchright.
 * Patchright es un fork de Playwright que pasa verificaciones de Cloudflare
 * parcheando TLS fingerprint, navigator.webdriver, y trazas CDP a nivel binario.
 * El navegador se instala en %LOCALAPPDATA%\ms-playwright\
 */
async function installPatchright() {
  console.log('[postinstall] Instalando Chromium de Patchright...')
  try {
    execSync('npx patchright install chromium', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    console.log('[postinstall] Chromium de Patchright instalado correctamente')
  } catch (err) {
    console.error('[postinstall] Error instalando Patchright:', err.message)
    console.log('[postinstall] Ejecuta manualmente: npx patchright install chromium')
  }
}

/**
 * Punto de entrada del postinstall.
 * Solo ejecuta en Windows (los binarios son .exe).
 * Descarga ffmpeg y luego instala Chromium de Patchright.
 */
async function main() {
  if (process.platform !== 'win32') {
    console.log('[postinstall] Omitiendo descargas — no es Windows')
    return
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  await downloadFfmpeg()
  await installPatchright()
}

main()

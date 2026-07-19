# Viwe

Genera videos MP4 de cualquier página web. Ingresa una URL, configura la duración y el modo de grabación, y Viwe crea un video del contenido de la página.

## Características

- **Grabación de páginas web** — Abre cualquier URL en un navegador headless y graba el viewport
- **Dos modos de grabación**:
  - **Estático** — El viewport queda fijo, graba lo que se ve en pantalla
  - **Scroll** — Auto-scroll suave mientras graba (30px cada 100ms)
- **Duración configurable** — De 5 a 300 segundos
- **Anti-detección** — Usa Patchright (fork de Playwright) que pasa verificaciones de Cloudflare
- **Historial** — Guarda todas las grabaciones con fecha, dominio y título
- **Reproductor integrado** — Preview del video generado en la app
- **Exportación MP4** — Conversión automática de WebM a MP4 con ffmpeg

## Requisitos previos

- **Windows** 10/11 (x64)
- **Node.js** 18+ (para desarrollo)
- **Chrome** instalado (opcional, para usar Chrome real en vez de Chromium embebido)

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Arvillax/Viwe.git
cd Viwe

# Instalar dependencias (descarga ffmpeg + Chromium automáticamente)
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Binarios descargados en `npm install`

| Binario | Tamaño | Propósito |
|---------|--------|-----------|
| `bin/ffmpeg.exe` | ~140 MB | Conversión de WebM a MP4 |
| Chromium (Patchright) | ~150 MB | Navegador headless para grabar páginas |

Chromium se instala en `%LOCALAPPDATA%\ms-playwright\` (no en el directorio del proyecto).

## Uso

1. Ingresa la URL de la página web que quieres grabar
2. Configura la **duración** en segundos (default: 30)
3. Selecciona el **modo**:
   - **Estático** — Grabación fija del viewport
   - **Scroll** — Auto-scroll suave por la página
4. Haz click en **Generar**
5. El video MP4 se guarda en `C:\Users\TU_USUARIO\Videos\Viwe\`

### Botones del historial

| Botón | Acción |
|-------|--------|
| ▶ Play | Abre el video con el reproductor predeterminado de Windows |
| 📂 Carpeta | Abre la ubicación del archivo en el Explorer |

## Arquitectura

```
Viwe/
├── electron/                    # Backend (Node.js + Electron)
│   ├── main/
│   │   ├── index.ts            # Entry point, crea BrowserWindow
│   │   ├── recorder.ts         # Motor de grabación con Patchright
│   │   ├── ipc-handlers.ts     # Handlers IPC (comunicación frontend↔backend)
│   │   └── store.ts            # Almacén JSON para historial
│   └── preload/
│       └── index.ts            # API segura expuesta al renderer
├── src/                         # Frontend (React + Tailwind CSS)
│   ├── components/
│   │   ├── Layout.tsx          # Layout principal con tema Blue Lagoon
│   │   ├── URLInput.tsx        # Barra de URL + duración + modo
│   │   ├── HistoryList.tsx     # Lista colapsable de grabaciones
│   │   ├── HistoryItem.tsx     # Cada item del historial
│   │   ├── VideoPlayer.tsx     # Preview del video generado
│   │   └── ProgressBar.tsx     # Barra de progreso durante grabación
│   ├── hooks/
│   │   └── useDownload.ts      # Hook de estado de grabación
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript compartidos
│   ├── App.tsx                  # Componente principal
│   ├── main.tsx                 # Entry point de React
│   └── index.css                # Tailwind CSS + tema Blue Lagoon
├── bin/                         # Binarios (gitignored)
│   └── ffmpeg.exe              # Convertidor de video
├── scripts/
│   └── postinstall.js          # Descarga ffmpeg + Chromium
├── electron.vite.config.ts      # Configuración de electron-vite
├── electron-builder.yml         # Configuración de empaquetado
└── package.json
```

## Flujo de datos

```
1. Usuario ingresa URL + duración + modo
2. Frontend llama: window.electronAPI.recordVideo(url, 30, 'static')
3. IPC invoke → electron/main/recorder.ts
4. Patchright lanza Chromium headless (pasa Cloudflare)
5. page.goto(url, { waitUntil: 'load' })
6. Graba viewport por X segundos (emitiendo progreso cada segundo)
7. context.close() → .webm se guarda en directorio temporal
8. ffmpeg convierte .webm → .mp4 (H.264)
9. Mueve a ~/Videos/Viwe/
10. Guarda en historial (viwe-data.json)
11. Retorna resultado al frontend
12. Video disponible en preview y para reproducción
```

## Paleta de colores — Blue Lagoon

| Color | Hex | Uso |
|-------|-----|-----|
| Celeste claro | `#00A6FB` | Botones, acentos activos |
| Azul medio | `#0582CA` | Hover states, progreso |
| Azul profundo | `#006494` | Bordes, iconos secundarios |
| Azul oscuro | `#003554` | Cards, fondos de paneles |
| Navy | `#051923` | Fondo principal |

## Scripts disponibles

```bash
npm run dev          # Ejecutar en modo desarrollo (con HMR)
npm run build        # Compilar para producción
npm run build:win    # Compilar + generar instalador NSIS para Windows
npm run build:unpack # Compilar + generar carpeta desempaquetada (para testing)
npm run preview      # Previsualizar la versión compilada
```

## Tecnologías

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Electron | v35.x |
| Bundler | electron-vite | v3.x |
| Frontend | React + TypeScript | React 18, TS 5.x |
| Estilos | Tailwind CSS | v4.x |
| Motor de grabación | Patchright (fork anti-detección de Playwright) | v1.61.x |
| Conversión de video | ffmpeg | latest |
| Iconos | Lucide React | v0.400+ |

## Empaquetado

Para generar el instalador de Windows:

```bash
npm run build:win
```

Esto genera un archivo `.exe` NSIS en la carpeta `out/` que incluye:
- App Electron (~10 MB)
- Chromium de Patchright (~150 MB)
- ffmpeg.exe (~140 MB)

**Tamaño total del instalador: ~300 MB**

### Nota sobre Chromium

Chromium se instala en `%LOCALAPPDATA%\ms-playwright\` durante `npm install`. No se incluye en el `.gitignore` del proyecto porque cada desarrollador lo descarga una vez.

Para distribuir la app, el instalador NSIS incluye automáticamente los binarios de Chromium y ffmpeg via `extraResources` en `electron-builder.yml`.

## Licencia

MIT

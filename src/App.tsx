/**
 * App.tsx — Componente raíz de Viwe
 *
 * Orquesta toda la UI: input de URL, progreso, historial y preview de video.
 * Gestiona el estado local de URL, duración, modo de grabación y selección
 * del historial. Usa el hook `useDownload` para toda la lógica de IPC con
 * el proceso principal de Electron.
 */

import { useState } from 'react'
import Layout from './components/Layout'
import URLInput from './components/URLInput'
import HistoryList from './components/HistoryList'
import VideoPlayer from './components/VideoPlayer'
import ProgressBar from './components/ProgressBar'
import { useDownload } from './hooks/useDownload'
import type { HistoryItem, RecordMode } from './types'

export default function App(): JSX.Element {
  /** URL que el usuario está escribiendo (se limpia después de iniciar grabación) */
  const [url, setUrl] = useState('')

  /** Duración de la grabación en segundos (rango: 5-300, default: 30) */
  const [duration, setDuration] = useState(30)

  /** Modo de grabación: 'static' (viewport fijo) o 'scroll' (auto-scroll suave) */
  const [mode, setMode] = useState<RecordMode>('static')

  /** Item del historial seleccionado para preview en el reproductor */
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  /** Hook principal: estado de descarga, historial, y todas las acciones IPC */
  const { downloadState, history, startRecording, openFolder, openFile, showInFolder } = useDownload()

  /**
   * Handler del botón "Generar".
   * Valida que la URL no esté vacía, inicia la grabación y limpia el input.
   */
  const handleGenerate = async (): Promise<void> => {
    if (!url.trim()) return
    await startRecording(url, duration, mode)
    setUrl('')
  }

  /** Abre el archivo de video con el reproductor predeterminado del sistema */
  const handlePlay = (filePath: string): void => {
    openFile(filePath)
  }

  return (
    <Layout>
      {/* ===== Header ===== */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-accent tracking-tight">Viwe</h1>
      </div>

      {/* ===== Input de URL con opciones de duración y modo ===== */}
      <URLInput
        value={url}
        onChange={setUrl}
        onSubmit={handleGenerate}
        duration={duration}
        onDurationChange={setDuration}
        mode={mode}
        onModeChange={setMode}
        disabled={downloadState.status === 'downloading'}
      />

      {/* ===== Barra de progreso (solo visible durante grabación) ===== */}
      {downloadState.status === 'downloading' && (
        <div className="mt-4">
          <ProgressBar
            percent={downloadState.progress.percent}
            speed={downloadState.progress.speed}
            eta={downloadState.progress.eta}
          />
        </div>
      )}

      {/* ===== Mensaje de error (si la grabación falla) ===== */}
      {downloadState.status === 'error' && downloadState.error && (
        <div className="mt-4 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-error text-sm">
          {downloadState.error}
        </div>
      )}

      {/* ===== Mensaje de éxito (cuando el video está listo) ===== */}
      {downloadState.status === 'done' && (
        <div className="mt-4 px-4 py-3 bg-success/10 border border-success/30 rounded-xl text-success text-sm">
          Video generado correctamente
        </div>
      )}

      {/* ===== Contenido principal: Historial + Preview de video ===== */}
      <div className="flex-1 flex gap-6 mt-6 overflow-hidden">
        {/* Lista de videos grabados (scrollable) */}
        <div className="flex-1 overflow-hidden">
          <HistoryList
            items={history}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
            onPlay={handlePlay}
            onOpenFolder={(filePath) => showInFolder(filePath)}
          />
        </div>

        {/* Reproductor de video (ancho fijo 340px) */}
        <div className="w-[340px] flex-shrink-0">
          <VideoPlayer item={selectedItem} />
        </div>
      </div>
    </Layout>
  )
}

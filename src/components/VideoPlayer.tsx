/**
 * VideoPlayer.tsx — Reproductor de preview de video
 *
 * Muestra un preview del video seleccionado del historial usando el tag
 * `<video>` nativo de HTML con controles del navegador.
 *
 * Cuando no hay item seleccionado, muestra un placeholder con un icono
 * de play y un mensaje invitando a seleccionar un video.
 *
 * Nota sobre la URL del video:
 * En Windows, las rutas de archivo usan backslashes (C:\Users\...),
 * pero el tag <video> necesita formato file:/// con forward slashes.
 * Se reemplazan los \ por / y se agrega el prefijo file:///.
 */

import { Play } from 'lucide-react'
import type { HistoryItem } from '../types'

interface VideoPlayerProps {
  item: HistoryItem | null
}

export default function VideoPlayer({ item }: VideoPlayerProps): JSX.Element {
  /** Placeholder cuando no hay video seleccionado */
  if (!item) {
    return (
      <div className="bg-bg-card rounded-2xl border border-border/30 flex flex-col items-center justify-center h-full min-h-[200px]">
        <div className="w-16 h-16 rounded-full bg-accent-deep/20 flex items-center justify-center mb-3">
          <Play className="w-8 h-8 text-accent-deep/40" />
        </div>
        <p className="text-text-muted text-sm">Selecciona un video del historial</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-card rounded-2xl border border-border/30 overflow-hidden flex flex-col h-full">
      {/* ===== Reproductor de video ===== */}
      <div className="relative bg-black aspect-video">
        <video
          src={`file:///${item.filePath.replace(/\\/g, '/')}`}
          controls
          className="w-full h-full object-contain"
        />
      </div>

      {/* ===== Info del video: título + dominio + fecha ===== */}
      <div className="p-4">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        <p className="text-xs text-text-secondary mt-1">{item.domain} — {item.date}</p>
      </div>
    </div>
  )
}

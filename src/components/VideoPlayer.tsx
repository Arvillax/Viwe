import { Play } from 'lucide-react'
import type { HistoryItem } from '../types'

interface VideoPlayerProps {
  item: HistoryItem | null
}

export default function VideoPlayer({ item }: VideoPlayerProps): JSX.Element {
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
      {/* Video container */}
      <div className="relative bg-black aspect-video">
        <video
          src={`file://${item.filePath}`}
          controls
          className="w-full h-full object-contain"
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        <p className="text-xs text-text-secondary mt-1">{item.domain} — {item.date}</p>
      </div>
    </div>
  )
}

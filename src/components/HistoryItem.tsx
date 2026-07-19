/**
 * HistoryItem.tsx — Item individual del historial de grabaciones
 *
 * Muestra un video grabado con:
 * - Botón de play (abre el reproductor del sistema)
 * - Dominio del sitio grabado + fecha
 * - Botón de carpeta (abre Explorer en la ubicación del archivo)
 *
 * El item se resalta cuando está seleccionado (borde accent + fondo sutil).
 * Los botones de play y carpeta usan `stopPropagation` para no activar
 * la selección del item al hacer click en ellos.
 */

import { Play, FolderOpen } from 'lucide-react'
import type { HistoryItem as HistoryItemType } from '../types'

interface HistoryItemProps {
  item: HistoryItemType
  isSelected: boolean
  onSelect: () => void
  onPlay: () => void
  onOpenFolder: () => void
}

export default function HistoryItem({ item, isSelected, onSelect, onPlay, onOpenFolder }: HistoryItemProps): JSX.Element {
  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all
        ${isSelected
          ? 'bg-accent/10 border border-accent/30'
          : 'bg-bg-card/50 border border-transparent hover:bg-bg-card hover:border-border/30'
        }
      `}
    >
      {/* ===== Botón de play — abre el .mp4 con el reproductor del sistema ===== */}
      <button
        onClick={(e) => { e.stopPropagation(); onPlay() }}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer
          ${isSelected ? 'bg-accent/20 hover:bg-accent/30' : 'bg-accent-deep/30 hover:bg-accent-deep/50'}
        `}
      >
        <Play className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-accent-deep'}`} />
      </button>

      {/* ===== Info del video: dominio + fecha de grabación ===== */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.domain}</p>
        <p className="text-xs text-text-secondary">{item.date}</p>
      </div>

      {/* ===== Botón de carpeta — abre Explorer en la ubicación del archivo ===== */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenFolder() }}
        className="p-1.5 rounded-lg hover:bg-accent-deep/20 transition-colors cursor-pointer"
        title="Abrir carpeta"
      >
        <FolderOpen className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  )
}

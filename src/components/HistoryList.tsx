/**
 * HistoryList.tsx — Lista colapsable de historial de grabaciones
 *
 * Muestra todos los videos generados en orden cronológico (más recientes arriba).
 * Se puede colapsar/expandir con el botón del header. Cuando está vacío,
 * muestra un placeholder informativo.
 *
 * Cada item se renderiza como `HistoryItem` con opciones de play y abrir carpeta.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import HistoryItem from './HistoryItem'
import type { HistoryItem as HistoryItemType } from '../types'

interface HistoryListProps {
  items: HistoryItemType[]
  selectedId: string | null
  onSelect: (item: HistoryItemType) => void
  onPlay: (filePath: string) => void
  onOpenFolder: (filePath: string) => void
}

export default function HistoryList({ items, selectedId, onSelect, onPlay, onOpenFolder }: HistoryListProps): JSX.Element {
  /** Estado de expansión del historial (expandido por defecto) */
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="flex flex-col">
      {/* ===== Header colapsable ===== */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center gap-2 py-3 text-accent hover:text-accent-hover transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium">Historial</span>
        {/* Flecha gira 90° cuando está colapsado */}
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
      </button>

      {/* ===== Lista de items (scrollable, max 40vh) ===== */}
      {isExpanded && (
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-1">
          {items.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-8">
              No hay videos descargados aún
            </p>
          ) : (
            items.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onSelect={() => onSelect(item)}
                onPlay={() => onPlay(item.filePath)}
                onOpenFolder={() => onOpenFolder(item.filePath)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

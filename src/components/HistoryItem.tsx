import { Play, FolderOpen, MoreVertical } from 'lucide-react'
import type { HistoryItem as HistoryItemType } from '../types'

interface HistoryItemProps {
  item: HistoryItemType
  isSelected: boolean
  onSelect: () => void
  onOpenFolder: () => void
}

export default function HistoryItem({ item, isSelected, onSelect, onOpenFolder }: HistoryItemProps): JSX.Element {
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
      {/* Play icon */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isSelected ? 'bg-accent/20' : 'bg-accent-deep/30'}
      `}>
        <Play className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-accent-deep'}`} />
      </div>

      {/* Domain + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.domain}</p>
        <p className="text-xs text-text-secondary">{item.date}</p>
      </div>

      {/* Actions */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenFolder() }}
        className="p-1.5 rounded-lg hover:bg-accent-deep/20 transition-colors cursor-pointer"
      >
        <FolderOpen className="w-4 h-4 text-text-secondary" />
      </button>
      <button
        onClick={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg hover:bg-accent-deep/20 transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  )
}

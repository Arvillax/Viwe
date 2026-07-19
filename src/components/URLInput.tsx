/**
 * URLInput.tsx — Input de URL con opciones de grabación
 *
 * Componente compuesto que incluye:
 * - Barra de URL con botón "Generar" (submit con Enter o click)
 * - Fila de opciones: duración (5-300 segundos) y modo (estático/scroll)
 *
 * Se deshabilita automáticamente durante una grabación en curso para
 * evitar grabs múltiples.
 */

import { Link } from 'lucide-react'
import type { RecordMode } from '../types'

interface URLInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  duration: number
  onDurationChange: (value: number) => void
  mode: RecordMode
  onModeChange: (value: RecordMode) => void
  disabled?: boolean
}

export default function URLInput({
  value,
  onChange,
  onSubmit,
  duration,
  onDurationChange,
  mode,
  onModeChange,
  disabled
}: URLInputProps): JSX.Element {
  /** Permite enviar con Enter (además del botón) */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ===== Barra de URL ===== */}
      <div className="flex items-center gap-3 bg-bg-card rounded-xl px-4 py-3 border border-border/30 focus-within:border-accent/50 transition-colors">
        <Link className="w-5 h-5 text-text-secondary flex-shrink-0" />
        <input
          type="url"
          placeholder="https://ejemplo.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-bg-primary font-semibold px-5 py-2 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Generar
        </button>
      </div>

      {/* ===== Fila de opciones: duración + modo ===== */}
      <div className="flex items-center gap-4 px-1">
        {/* Selector de duración (5-300 segundos) */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Duración:</label>
          <input
            type="number"
            min={5}
            max={300}
            value={duration}
            onChange={(e) => onDurationChange(Math.max(5, Math.min(300, parseInt(e.target.value) || 30)))}
            disabled={disabled}
            className="w-16 bg-bg-card border border-border/30 rounded-lg px-2 py-1 text-xs text-text-primary text-center outline-none focus:border-accent/50 transition-colors"
          />
          <span className="text-xs text-text-secondary">seg</span>
        </div>

        {/* Selector de modo de grabación */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Modo:</label>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as RecordMode)}
            disabled={disabled}
            className="bg-bg-card border border-border/30 rounded-lg px-2 py-1 text-xs text-text-primary outline-none focus:border-accent/50 transition-colors cursor-pointer"
          >
            <option value="static">Estático</option>
            <option value="scroll">Scroll</option>
          </select>
        </div>
      </div>
    </div>
  )
}

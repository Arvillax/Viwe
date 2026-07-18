import { Link } from 'lucide-react'

interface URLInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export default function URLInput({ value, onChange, onSubmit, disabled }: URLInputProps): JSX.Element {
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit()
    }
  }

  return (
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
  )
}

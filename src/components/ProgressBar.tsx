/**
 * ProgressBar.tsx — Barra de progreso de grabación
 *
 * Muestra el progreso de la grabación en tiempo real:
 * - Porcentaje de completado (con decimal)
 * - Barra visual con gradiente accent
 * - Velocidad de descarga (ej: "2.5 MB/s")
 * - Tiempo estimado restante (ETA)
 *
 * La velocidad y el ETA son opcionales: si no se proporcionan,
 * simplemente no se muestran (el backend las calcula según la red).
 */

interface ProgressBarProps {
  percent: number
  speed: string
  eta: string
}

export default function ProgressBar({ percent, speed, eta }: ProgressBarProps): JSX.Element {
  return (
    <div className="bg-bg-card rounded-xl px-4 py-3 border border-border/30">
      {/* ===== Header: label + porcentaje ===== */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">Descargando...</span>
        <span className="text-xs text-accent font-medium">{percent.toFixed(1)}%</span>
      </div>

      {/* ===== Barra visual de progreso ===== */}
      <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* ===== Estadísticas: velocidad + ETA ===== */}
      {(speed || eta) && (
        <div className="flex items-center gap-4 mt-2">
          {speed && <span className="text-xs text-text-muted">{speed}</span>}
          {eta && <span className="text-xs text-text-muted">ETA: {eta}</span>}
        </div>
      )}
    </div>
  )
}

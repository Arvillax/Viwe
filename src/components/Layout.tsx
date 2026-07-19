/**
 * Layout.tsx — Shell visual de la aplicación
 *
 * Proporciona la estructura base: fondo oscuro, texto claro, y una drag region
 * invisible en la parte superior para mover la ventana (comportamiento nativo
 * de ventanas sin decorations en Electron).
 *
 * El `drag-region` usa CSS `app-region: drag` para que el mouse pueda
 * arrastrar la ventana desde cualquier punto del header.
 */

import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      {/* Drag region — zona de arrastre para la ventana (Electron frameless) */}
      <div className="drag-region h-8 flex-shrink-0" />

      {/* Contenido principal — padding horizontal generoso, scroll interno manejado por hijos */}
      <div className="flex-1 flex flex-col px-8 pb-6 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

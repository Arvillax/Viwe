import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      {/* Title bar drag region */}
      <div className="drag-region h-8 flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 flex flex-col px-8 pb-6 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

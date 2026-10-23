import type { ReactNode } from 'react'

export function StatusBanner({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success' | 'danger'; title?: string; children: ReactNode }) {
  return (
    <div className={`status-banner ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  )
}

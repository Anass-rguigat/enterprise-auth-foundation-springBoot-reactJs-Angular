import type { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return <div className="ui-table-wrap">{children}</div>
}

import type { ReactNode } from 'react'

type Props = {
  title?: string
  message?: string
  children?: ReactNode
}

export function EmptyState({
  title = 'Nothing here yet',
  message = '',
  children,
}: Props) {
  return (
    <div className="ui-empty">
      <p className="ui-empty__title">{title}</p>
      {message ? <p className="ui-empty__message">{message}</p> : null}
      {children ? <div className="ui-empty__actions">{children}</div> : null}
    </div>
  )
}

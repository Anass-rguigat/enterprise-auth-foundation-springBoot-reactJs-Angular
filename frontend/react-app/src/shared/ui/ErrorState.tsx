import type { ReactNode } from 'react'

type Props = {
  title?: string
  message?: string
  children?: ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  message = '',
  children,
}: Props) {
  return (
    <div className="ui-error" role="alert">
      <p className="ui-error__title">{title}</p>
      {message ? <p className="ui-error__message">{message}</p> : null}
      {children ? <div className="ui-error__actions">{children}</div> : null}
    </div>
  )
}

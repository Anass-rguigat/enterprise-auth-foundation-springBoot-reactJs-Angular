import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle = '', children }: Props) {
  return (
    <header className="ui-ph">
      <div>
        <h1 className="ui-ph__title">{title}</h1>
        {subtitle ? <p className="ui-ph__subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div className="ui-ph__actions">{children}</div> : null}
    </header>
  )
}

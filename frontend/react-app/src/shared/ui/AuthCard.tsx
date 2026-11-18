import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthCard({ title, subtitle = '', children }: Props) {
  return (
    <section className="auth-card">
      <header>
        <h1 className="auth-card__title">{title}</h1>
        {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
      </header>
      <div className="auth-card__body">{children}</div>
    </section>
  )
}

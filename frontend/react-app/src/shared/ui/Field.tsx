import type { ReactNode } from 'react'

type Props = {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  errorId?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, errorId, children }: Props) {
  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? <p className="ui-field__hint">{hint}</p> : null}
      {error ? (
        <p className="ui-field__error" role="alert" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

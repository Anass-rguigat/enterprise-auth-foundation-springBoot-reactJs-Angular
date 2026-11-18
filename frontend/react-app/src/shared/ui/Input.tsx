import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function Input({ invalid, className = '', ...rest }: Props) {
  return (
    <input
      className={`ui-input ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

import type { SelectHTMLAttributes } from 'react'

export type SelectOption = { value: string; label: string }

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly SelectOption[]
  placeholder?: string
  invalid?: boolean
}

export function Select({
  options,
  placeholder,
  invalid,
  className = '',
  ...rest
}: Props) {
  return (
    <select
      className={`ui-select ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

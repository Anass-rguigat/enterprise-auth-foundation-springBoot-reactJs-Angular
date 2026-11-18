import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  children: ReactNode
}

export function Checkbox({ children, id, className = '', ...rest }: Props) {
  return (
    <label className={`ui-check ${className}`.trim()} htmlFor={id}>
      <input id={id} type="checkbox" className="ui-check__input" {...rest} />
      <span className="ui-check__label">{children}</span>
    </label>
  )
}

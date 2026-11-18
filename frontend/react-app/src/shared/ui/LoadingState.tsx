type Props = { label?: string }

export function LoadingState({ label = 'Loading…' }: Props) {
  return (
    <div className="ui-loading" role="status" aria-live="polite">
      <span className="ui-loading__spinner" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

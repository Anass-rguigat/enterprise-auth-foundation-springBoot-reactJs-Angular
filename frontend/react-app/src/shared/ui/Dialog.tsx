import { useEffect, type ReactNode } from 'react'
import { Button } from './Button'

type Props = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  confirmLoading?: boolean
  closeOnBackdrop?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function Dialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  confirmLoading = false,
  closeOnBackdrop = true,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="ui-dialog-root" role="presentation">
      <button
        type="button"
        className="ui-dialog-backdrop"
        aria-label="Close dialog"
        onClick={() => {
          if (closeOnBackdrop) onCancel()
        }}
      />
      <div className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby="ui-dialog-title">
        <header>
          <h2 id="ui-dialog-title" className="ui-dialog__title">
            {title}
          </h2>
        </header>
        <div className="ui-dialog__body">{children}</div>
        <footer className="ui-dialog__footer">
          <Button variant="secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            type="button"
            loading={confirmLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  )
}

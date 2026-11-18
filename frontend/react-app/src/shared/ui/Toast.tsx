import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

type ToastMessage = {
  id: number
  tone: ToastTone
  text: string
}

type ToastContextValue = {
  show: (text: string, tone?: ToastTone, ttlMs?: number) => void
  success: (text: string) => void
  warning: (text: string) => void
  danger: (text: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (text: string, tone: ToastTone = 'info', ttlMs = 4000) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      setToasts((list) => [...list, { id, tone, text }])
      window.setTimeout(() => dismiss(id), ttlMs)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      show,
      success: (text: string) => show(text, 'success'),
      warning: (text: string) => show(text, 'warning'),
      danger: (text: string) => show(text, 'danger'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div key={toast.id} className="ui-toast" data-tone={toast.tone} role="status">
            <span>{toast.text}</span>
            <button
              type="button"
              className="ui-toast__close"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

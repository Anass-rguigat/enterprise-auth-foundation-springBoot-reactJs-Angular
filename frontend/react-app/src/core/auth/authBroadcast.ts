import type { AuthBroadcastMessage } from './auth.models'

const CHANNEL_NAME = 'enterprise-auth'

type Listener = (msg: AuthBroadcastMessage) => void

const listeners = new Set<Listener>()
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

channel?.addEventListener('message', (event: MessageEvent<AuthBroadcastMessage>) => {
  const data = event.data
  if (!data || typeof data !== 'object' || !('type' in data)) return
  for (const listener of listeners) {
    listener(data)
  }
})

export function publishAuthMessage(message: AuthBroadcastMessage): void {
  channel?.postMessage(message)
}

export function subscribeAuthMessages(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

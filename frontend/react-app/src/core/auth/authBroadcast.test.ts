import { describe, expect, it, vi } from 'vitest'
import type { AuthBroadcastMessage } from './auth.models'
import { subscribeAuthMessages } from './authBroadcast'

describe('authBroadcast', () => {
  it('delivers same-origin messages to subscribers', async () => {
    const seen: AuthBroadcastMessage[] = []
    const unsub = subscribeAuthMessages((msg) => seen.push(msg))

    // Peer channel — BroadcastChannel does not echo to the publishing instance.
    const peer = new BroadcastChannel('enterprise-auth')
    peer.postMessage({ type: 'refresh:start' } satisfies AuthBroadcastMessage)
    peer.postMessage({ type: 'logout' } satisfies AuthBroadcastMessage)

    await vi.waitFor(() => {
      expect(seen.map((m) => m.type)).toEqual(['refresh:start', 'logout'])
    })

    unsub()
    peer.close()
  })
})

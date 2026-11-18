import { Injectable, OnDestroy } from '@angular/core';
import { AuthBroadcastMessage } from './auth.models';

const CHANNEL_NAME = 'enterprise-auth';

/**
 * Same-origin cross-tab coordination for refresh/logout.
 * Does not cross Angular (:4200) ↔ React (:5173).
 */
@Injectable({ providedIn: 'root' })
export class AuthBroadcastService implements OnDestroy {
  private readonly channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  private readonly listeners = new Set<(msg: AuthBroadcastMessage) => void>();

  constructor() {
    this.channel?.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    this.channel?.removeEventListener('message', this.onMessage);
    this.channel?.close();
  }

  publish(message: AuthBroadcastMessage): void {
    this.channel?.postMessage(message);
  }

  subscribe(listener: (msg: AuthBroadcastMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private readonly onMessage = (event: MessageEvent<AuthBroadcastMessage>): void => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !('type' in data)) {
      return;
    }
    for (const listener of this.listeners) {
      listener(data);
    }
  };
}

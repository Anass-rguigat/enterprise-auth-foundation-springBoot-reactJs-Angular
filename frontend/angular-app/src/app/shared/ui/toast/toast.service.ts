import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export type ToastMessage = {
  id: number;
  tone: ToastTone;
  text: string;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  show(text: string, tone: ToastTone = 'info', ttlMs = 4000): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, tone, text }]);
    window.setTimeout(() => this.dismiss(id), ttlMs);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  warning(text: string): void {
    this.show(text, 'warning');
  }

  danger(text: string): void {
    this.show(text, 'danger');
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

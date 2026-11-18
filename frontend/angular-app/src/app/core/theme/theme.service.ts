import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'ea.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readInitial());

  constructor() {
    effect(() => {
      const mode = this.mode();
      document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* ignore quota / private mode */
      }
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private readInitial(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      /* ignore */
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  }
}

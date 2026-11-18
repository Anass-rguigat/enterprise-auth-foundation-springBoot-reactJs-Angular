import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'ui-toast-host',
  standalone: true,
  template: `
    <div class="ui-toasts" aria-live="polite" aria-relevant="additions">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="ui-toast" [attr.data-tone]="toast.tone" role="status">
          <span>{{ toast.text }}</span>
          <button
            type="button"
            class="ui-toast__close"
            aria-label="Dismiss"
            (click)="toastService.dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .ui-toasts {
      position: fixed;
      right: var(--space-4);
      bottom: var(--space-4);
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: min(22rem, calc(100vw - 2rem));
    }
    .ui-toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
      font-size: 0.875rem;
    }
    .ui-toast[data-tone='success'] {
      border-color: var(--color-success);
    }
    .ui-toast[data-tone='warning'] {
      border-color: var(--color-warning);
    }
    .ui-toast[data-tone='danger'] {
      border-color: var(--color-danger);
    }
    .ui-toast__close {
      border: 0;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
    }
  `,
})
export class UiToastHost {
  readonly toastService = inject(ToastService);
}

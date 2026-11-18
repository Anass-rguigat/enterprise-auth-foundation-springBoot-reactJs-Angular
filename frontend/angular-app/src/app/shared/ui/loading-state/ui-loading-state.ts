import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-loading-state',
  standalone: true,
  template: `
    <div class="ui-loading" role="status" aria-live="polite">
      <span class="ui-loading__spinner" aria-hidden="true"></span>
      <span>{{ label }}</span>
    </div>
  `,
  styles: `
    .ui-loading {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .ui-loading__spinner {
      width: 1.1rem;
      height: 1.1rem;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: ui-spin 0.7s linear infinite;
    }
    @keyframes ui-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class UiLoadingState {
  @Input() label = 'Loading…';
}

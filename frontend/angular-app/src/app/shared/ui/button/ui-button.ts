import { Component, Input } from '@angular/core';

export type UiButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

@Component({
  selector: 'ui-button',
  standalone: true,
  template: `
    <button
      class="ui-btn"
      [attr.type]="type"
      [class.ui-btn--primary]="variant === 'primary'"
      [class.ui-btn--secondary]="variant === 'secondary'"
      [class.ui-btn--danger]="variant === 'danger'"
      [class.ui-btn--ghost]="variant === 'ghost'"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading || null"
    >
      @if (loading) {
        <span class="ui-btn__spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
  styles: `
    .ui-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: 2.25rem;
      padding: 0.4rem 0.9rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      font: 500 0.875rem/1.25 var(--font-sans);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .ui-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .ui-btn--primary {
      background: var(--color-accent);
      color: var(--color-accent-contrast);
    }
    .ui-btn--primary:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
    .ui-btn--secondary {
      background: var(--color-surface);
      border-color: var(--color-border);
      color: var(--color-text);
    }
    .ui-btn--secondary:hover:not(:disabled) {
      background: var(--color-surface-muted);
    }
    .ui-btn--danger {
      background: var(--color-danger);
      color: #fff;
    }
    .ui-btn--ghost {
      background: transparent;
      color: var(--color-text-muted);
    }
    .ui-btn--ghost:hover:not(:disabled) {
      color: var(--color-text);
      background: var(--color-surface-muted);
    }
    .ui-btn__spinner {
      width: 0.85rem;
      height: 0.85rem;
      border: 2px solid currentColor;
      border-right-color: transparent;
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
export class UiButton {
  @Input() variant: UiButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
}

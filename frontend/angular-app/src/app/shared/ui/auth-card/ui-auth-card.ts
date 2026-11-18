import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-auth-card',
  standalone: true,
  template: `
    <section class="auth-card">
      <header class="auth-card__header">
        <h1 class="auth-card__title">{{ title }}</h1>
        @if (subtitle) {
          <p class="auth-card__subtitle">{{ subtitle }}</p>
        }
      </header>
      <div class="auth-card__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .auth-card {
      width: min(24rem, 100%);
      padding: var(--space-8) var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .auth-card__title {
      margin: 0;
      font: 600 1.35rem/1.2 var(--font-display);
      letter-spacing: -0.02em;
    }
    .auth-card__subtitle {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .auth-card__body {
      margin-top: var(--space-6);
    }
  `,
})
export class UiAuthCard {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
}

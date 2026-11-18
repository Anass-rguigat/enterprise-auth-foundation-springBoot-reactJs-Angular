import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  standalone: true,
  template: `
    <header class="ui-ph">
      <div class="ui-ph__text">
        <h1 class="ui-ph__title">{{ title }}</h1>
        @if (subtitle) {
          <p class="ui-ph__subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="ui-ph__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .ui-ph {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .ui-ph__title {
      margin: 0;
      font: 600 1.5rem/1.2 var(--font-display);
      letter-spacing: -0.02em;
    }
    .ui-ph__subtitle {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      max-width: 40rem;
    }
    .ui-ph__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  `,
})
export class UiPageHeader {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
}

import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';

export type FeaturePlaceholderData = {
  title: string;
  subtitle?: string;
  phase?: number;
  apiHints?: string[];
};

@Component({
  selector: 'app-feature-placeholder-page',
  standalone: true,
  imports: [UiPageHeader, UiEmptyState],
  template: `
    @if (data(); as d) {
      <ui-page-header [title]="d.title" [subtitle]="d.subtitle || defaultSubtitle(d)" />
      <ui-empty-state
        title="Route scaffold ready"
        [message]="
          'Implemented in Phase ' +
          (d.phase ?? '20+') +
          '. This page is a Phase 19 placeholder for functional equivalence coverage.'
        "
      />
      @if (d.apiHints?.length) {
        <section class="hints">
          <h2 class="hints__title">Planned API surface</h2>
          <ul>
            @for (hint of d.apiHints; track hint) {
              <li><code>{{ hint }}</code></li>
            }
          </ul>
        </section>
      }
    }
  `,
  styles: `
    .hints {
      margin-top: var(--space-6);
      padding: var(--space-4);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .hints__title {
      margin: 0 0 var(--space-3);
      font: 600 0.9rem/1.3 var(--font-sans);
    }
    ul {
      margin: 0;
      padding-left: 1.1rem;
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }
    code {
      font-size: 0.8rem;
      color: var(--color-text);
    }
  `,
})
export class FeaturePlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  readonly data = toSignal(
    this.route.data.pipe(map((d) => d as FeaturePlaceholderData)),
    { initialValue: { title: 'Feature' } as FeaturePlaceholderData }
  );

  defaultSubtitle(d: FeaturePlaceholderData): string {
    return `Placeholder for Phase ${d.phase ?? '20+'} feature work.`;
  }
}

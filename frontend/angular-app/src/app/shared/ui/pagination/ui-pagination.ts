import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiButton } from '../button/ui-button';

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) {
      result.push('ellipsis');
    }
    result.push(p);
    prev = p;
  }
  return result;
}

@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [UiButton],
  template: `
    <nav class="ui-page" aria-label="Pagination">
      <span class="ui-page__meta">
        @if (totalItems != null) {
          Showing <strong>{{ rangeFrom }}</strong
          >–<strong>{{ rangeTo }}</strong> of <strong>{{ totalItems }}</strong>
        } @else {
          Page {{ safePage }} of {{ safeTotal }}
        }
      </span>
      <div class="ui-page__actions">
        <ui-button variant="secondary" [disabled]="safePage <= 1" (click)="emitPage(safePage - 1)">
          Previous
        </ui-button>
        <div class="ui-page__numbers" role="list">
          @for (item of window; track trackWindow($index, item)) {
            @if (item === 'ellipsis') {
              <span class="ui-page__ellipsis" aria-hidden="true">…</span>
            } @else {
              <button
                type="button"
                role="listitem"
                class="ui-page__num"
                [class.ui-page__num--active]="item === safePage"
                [attr.aria-current]="item === safePage ? 'page' : null"
                (click)="emitPage(item)"
              >
                {{ item }}
              </button>
            }
          }
        </div>
        <ui-button
          variant="secondary"
          [disabled]="safePage >= safeTotal"
          (click)="emitPage(safePage + 1)"
        >
          Next
        </ui-button>
      </div>
    </nav>
  `,
})
export class UiPagination {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() totalItems: number | null = null;
  @Input() pageSize = 20;
  @Output() readonly pageChange = new EventEmitter<number>();

  get safeTotal(): number {
    return Math.max(this.totalPages || 1, 1);
  }

  get safePage(): number {
    return Math.min(Math.max(this.page, 1), this.safeTotal);
  }

  get rangeFrom(): number {
    if (this.totalItems == null || this.totalItems === 0) {
      return 0;
    }
    return (this.safePage - 1) * this.pageSize + 1;
  }

  get rangeTo(): number {
    if (this.totalItems == null) {
      return 0;
    }
    return Math.min(this.safePage * this.pageSize, this.totalItems);
  }

  get window(): (number | 'ellipsis')[] {
    return pageWindow(this.safePage, this.safeTotal);
  }

  trackWindow(index: number, item: number | 'ellipsis'): string {
    return item === 'ellipsis' ? `e-${index}` : String(item);
  }

  emitPage(next: number): void {
    if (next < 1 || next > this.safeTotal || next === this.safePage) {
      return;
    }
    this.pageChange.emit(next);
  }
}
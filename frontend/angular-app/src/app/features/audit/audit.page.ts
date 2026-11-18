import { DatePipe, NgClass } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AuditEventType, AuditLog } from '../../core/api/page.types';
import { AuditApi } from './audit.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiSelect, UiSelectOption } from '../../shared/ui/select/ui-select';
import { UiTable } from '../../shared/ui/table/ui-table';
import { UiPagination } from '../../shared/ui/pagination/ui-pagination';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';

const PAGE_SIZE = 50;

function auditOutcomeClass(outcome: string): string {
  const upper = (outcome || '').toUpperCase();
  if (upper === 'SUCCESS' || upper === 'OK') return 'admin-status admin-status--ok';
  if (upper === 'FAILURE' || upper === 'DENIED' || upper === 'ERROR') {
    return 'admin-status admin-status--danger';
  }
  return 'admin-status admin-status--warn';
}

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    RouterLink,
    UiPageHeader,
    UiButton,
    UiField,
    UiInput,
    UiSelect,
    UiTable,
    UiPagination,
    UiLoadingState,
    UiErrorState,
    UiEmptyState,
  ],
  template: `
    <div class="admin-page">
      <ui-page-header
        title="Activity log"
        subtitle="Plain-language record of sign-ins, account changes, and security actions."
      />

      <section class="admin-card">
        <div class="admin-card__head">
          <p class="admin-card__eyebrow">Security</p>
          <h2 class="admin-card__title">What happened</h2>
          <p class="admin-card__desc">
            Filter by activity or person. Open an event to see who did what, and from where.
          </p>
        </div>
        <div class="admin-card__body">
          <div class="fp-filters">
            <ui-field label="Activity" forId="audit-event">
              <ui-select
                inputId="audit-event"
                name="event"
                [(ngModel)]="eventType"
                (ngModelChange)="onEventTypeChange()"
                [options]="eventOptions()"
              />
            </ui-field>
            <ui-field label="Person (name or email)" forId="audit-actor">
              <ui-input
                inputId="audit-actor"
                name="actor"
                [(ngModel)]="actor"
                (ngModelChange)="onActorInput()"
                placeholder="Who performed the action"
              />
            </ui-field>
          </div>

          @if (loading()) {
            <ui-loading-state />
          } @else if (error()) {
            <ui-error-state title="Could not load activity" [message]="error()!">
              <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
            </ui-error-state>
          } @else if (!rows().length) {
            <ui-empty-state title="No matching activity" />
          } @else {
            <ui-table>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>What happened</th>
                    <th>Result</th>
                    <th>Who</th>
                    <th>Affected user</th>
                    <th>Where</th>
                    <th class="admin-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rows(); track row.id) {
                    <tr>
                      <td>{{ row.createdAt | date: 'medium' }}</td>
                      <td>
                        <strong>{{ row.actionTitle || row.eventType }}</strong>
                        <div class="fp-muted" style="font-size: 0.75rem">{{ row.category }}</div>
                      </td>
                      <td>
                        <span [ngClass]="auditOutcomeClass(row.outcome)">
                          {{ row.outcomeLabel || row.outcome }}
                        </span>
                      </td>
                      <td>{{ row.actorDisplayName || row.actorEmail || '—' }}</td>
                      <td>{{ row.targetDisplayName || row.targetEmail || '—' }}</td>
                      <td>{{ row.locationSummary || row.country || '—' }}</td>
                      <td>
                        <div class="admin-actions">
                          <a
                            class="admin-action"
                            [routerLink]="['/audit', row.id]"
                            title="View details"
                            aria-label="View details"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path
                                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                                stroke="currentColor"
                                stroke-width="1.75"
                              />
                              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.75" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </ui-table>
            <ui-pagination
              [page]="page() + 1"
              [totalPages]="totalPages()"
              [totalItems]="totalElements()"
              [pageSize]="pageSize"
              (pageChange)="goPage($event)"
            />
          }
        </div>
      </section>
    </div>
  `,
})
export class AuditPage implements OnInit {
  private readonly api = inject(AuditApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actorSearch$ = new Subject<string>();

  readonly auditOutcomeClass = auditOutcomeClass;
  readonly pageSize = PAGE_SIZE;

  eventType = '';
  actor = '';
  private debouncedActor = '';

  readonly eventOptions = signal<UiSelectOption[]>([{ value: '', label: 'All activities' }]);
  readonly rows = signal<AuditLog[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(0);
  readonly totalPages = signal(1);
  readonly totalElements = signal(0);

  ngOnInit(): void {
    this.actorSearch$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.debouncedActor = value;
      this.page.set(0);
      void this.reload();
    });

    void this.api
      .eventTypes()
      .then((types: AuditEventType[]) => {
        this.eventOptions.set([
          { value: '', label: 'All activities' },
          ...types.map((t) => ({ value: t.code, label: `${t.title} (${t.category})` })),
        ]);
      })
      .catch(() => undefined);

    void this.reload();
  }

  onActorInput(): void {
    this.actorSearch$.next(this.actor);
  }

  onEventTypeChange(): void {
    this.page.set(0);
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.api.search({
        eventType: this.eventType || undefined,
        actor: this.debouncedActor.trim() || undefined,
        page: this.page(),
        size: PAGE_SIZE,
      });
      this.rows.set(result.content);
      this.totalPages.set(Math.max(result.totalPages, 1));
      this.totalElements.set(result.totalElements);
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load activity'));
    } finally {
      this.loading.set(false);
    }
  }

  goPage(oneBased: number): void {
    this.page.set(oneBased - 1);
    void this.reload();
  }
}

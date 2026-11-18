import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuditLog } from '../../core/api/page.types';
import { AuditApi } from './audit.api';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';

function auditOutcomeClass(outcome: string): string {
  const upper = (outcome || '').toUpperCase();
  if (upper === 'SUCCESS' || upper === 'OK') return 'admin-status admin-status--ok';
  if (upper === 'FAILURE' || upper === 'DENIED' || upper === 'ERROR') {
    return 'admin-status admin-status--danger';
  }
  return 'admin-status admin-status--warn';
}

@Component({
  selector: 'app-audit-detail-page',
  standalone: true,
  imports: [DatePipe, NgClass, RouterLink, UiButton, UiLoadingState, UiErrorState],
  template: `
    <div class="admin-page">
      <p class="fp-back">
        <a class="fp-link" routerLink="/audit">← Activity log</a>
      </p>

      @if (loading()) {
        <ui-loading-state />
      } @else if (error()) {
        <ui-error-state title="Activity not available" [message]="error()!">
          <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
        </ui-error-state>
      } @else if (row(); as r) {
        <section class="admin-card">
          <div class="admin-card__body">
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between">
              <div>
                <p class="admin-card__eyebrow">{{ r.category || 'Activity' }}</p>
                <h1 style="margin: 0.2rem 0; font: 600 1.35rem/1.25 var(--font-display)">
                  {{ r.actionTitle || r.eventType }}
                </h1>
                <p class="fp-muted" style="margin: 0.5rem 0 0; max-width: 40rem">
                  {{ r.actionSummary }}
                </p>
              </div>
              <span [ngClass]="auditOutcomeClass(r.outcome)">{{ r.outcomeLabel || r.outcome }}</span>
            </div>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Action</p>
            <h2 class="admin-card__title">What happened</h2>
          </div>
          <div class="admin-card__body">
            <dl class="fp-dl fp-dl--cols">
              <div>
                <dt>When</dt>
                <dd>{{ r.createdAt | date: 'full' }}</dd>
              </div>
              <div>
                <dt>Activity</dt>
                <dd>{{ r.actionTitle }}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{{ r.category || '—' }}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>
                  <span [ngClass]="auditOutcomeClass(r.outcome)">{{ r.outcomeLabel || r.outcome }}</span>
                </dd>
              </div>
              <div class="admin-grid--full">
                <dt>In plain words</dt>
                <dd>{{ r.actionSummary }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">People</p>
            <h2 class="admin-card__title">Who was involved</h2>
          </div>
          <div class="admin-card__body">
            <dl class="fp-dl fp-dl--cols">
              <div>
                <dt>Performed by</dt>
                <dd>{{ r.actorDisplayName || 'Unknown / system' }}</dd>
              </div>
              <div>
                <dt>Their email</dt>
                <dd>{{ r.actorEmail || '—' }}</dd>
              </div>
              <div>
                <dt>Affected user</dt>
                <dd>{{ r.targetDisplayName || '—' }}</dd>
              </div>
              <div>
                <dt>Affected email</dt>
                <dd>{{ r.targetEmail || '—' }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Location &amp; device</p>
            <h2 class="admin-card__title">Where it came from</h2>
            <p class="admin-card__desc">
              Network and device details from the request. MAC address is not available for browser
              sessions.
            </p>
          </div>
          <div class="admin-card__body">
            <dl class="fp-dl fp-dl--cols">
              <div>
                <dt>Country</dt>
                <dd>{{ r.country || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{{ r.city || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{{ r.locationSummary || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>IP address</dt>
                <dd>{{ r.clientIp || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>MAC address</dt>
                <dd>{{ r.macAddress || 'Not available for web sessions' }}</dd>
              </div>
              <div>
                <dt>Device</dt>
                <dd>{{ r.deviceSummary || 'Unknown device' }}</dd>
              </div>
              <div class="admin-grid--full">
                <dt>Browser details</dt>
                <dd style="word-break: break-word">{{ r.userAgent || 'Not recorded' }}</dd>
              </div>
            </dl>
          </div>
        </section>
      }
    </div>
  `,
})
export class AuditDetailPage implements OnInit {
  private readonly api = inject(AuditApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly auditOutcomeClass = auditOutcomeClass;

  readonly row = signal<AuditLog | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.row.set(await this.api.getById(this.id));
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load activity'));
    } finally {
      this.loading.set(false);
    }
  }
}

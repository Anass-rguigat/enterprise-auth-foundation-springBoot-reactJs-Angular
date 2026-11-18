import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SecurityOverview, SessionSummary } from '../../core/api/page.types';
import { SecurityApi } from './security.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiTable } from '../../shared/ui/table/ui-table';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [
    DatePipe,
    UiPageHeader,
    UiButton,
    UiTable,
    UiLoadingState,
    UiErrorState,
    UiEmptyState,
  ],
  template: `
    <ui-page-header
      title="Security"
      subtitle="Self-service sessions and security overview — any signed-in user."
    >
      <ui-button variant="secondary" type="button" (click)="reload()">Refresh</ui-button>
    </ui-page-header>

    @if (loading()) {
      <ui-loading-state />
    } @else if (error()) {
      <ui-error-state title="Failed to load security data" [message]="error()!">
        <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
      </ui-error-state>
    } @else {
      @if (overview(); as o) {
        <section class="fp-panel">
          <h2>Overview</h2>
          <dl class="fp-dl fp-dl--cols">
            <div><dt>Email verified</dt><dd>{{ o.emailVerified ? 'Yes' : 'No' }}</dd></div>
            <div><dt>Pending email</dt><dd>{{ o.pendingEmail || '—' }}</dd></div>
            <div><dt>MFA enabled</dt><dd>{{ o.mfaEnabled ? 'Yes' : 'No' }}</dd></div>
            <div><dt>Must change password</dt><dd>{{ o.mustChangePassword ? 'Yes' : 'No' }}</dd></div>
            <div><dt>Active sessions</dt><dd>{{ o.activeSessionCount }}</dd></div>
          </dl>
        </section>
      }

      <section class="fp-panel">
        <h2>Sessions</h2>
        @if (!sessions().length) {
          <ui-empty-state title="No active sessions" />
        } @else {
          <ui-table>
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Current</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (s of sessions(); track s.familyId) {
                  <tr>
                    <td>{{ s.label || s.familyId }}</td>
                    <td>{{ s.createdAt | date: 'medium' }}</td>
                    <td>{{ s.lastUsedAt ? (s.lastUsedAt | date: 'medium') : '—' }}</td>
                    <td>{{ s.current ? 'Yes' : 'No' }}</td>
                    <td>
                      @if (!s.current) {
                        <ui-button
                          variant="danger"
                          type="button"
                          [loading]="busyId() === s.familyId"
                          (click)="revoke(s.familyId)"
                        >
                          Revoke
                        </ui-button>
                      } @else {
                        <span class="fp-muted">Use Sign out</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </ui-table>
        }
      </section>
    }
  `,
})
export class SecurityPage implements OnInit {
  private readonly api = inject(SecurityApi);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  readonly overview = signal<SecurityOverview | null>(null);
  readonly sessions = signal<SessionSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [overview, sessions] = await Promise.all([this.api.overview(), this.api.sessions()]);
      this.overview.set(overview);
      this.sessions.set(sessions);
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load security data'));
    } finally {
      this.loading.set(false);
    }
  }

  async revoke(familyId: string): Promise<void> {
    this.busyId.set(familyId);
    try {
      await this.api.revokeSession(familyId);
      this.toasts.success('Session revoked');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Could not revoke session'));
    } finally {
      this.busyId.set(null);
    }
  }
}

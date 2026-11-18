import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { SecurityApi } from '../security/security.api';
import { SecurityOverview } from '../../core/api/page.types';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiButton } from '../../shared/ui/button/ui-button';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, UiPageHeader, UiLoadingState, UiButton],
  template: `
    <ui-page-header
      title="Dashboard"
      [subtitle]="'Welcome back, ' + (auth.displayName() || 'user')"
    />

    @if (loading()) {
      <ui-loading-state />
    } @else {
      <div class="fp-grid">
        <section class="fp-panel">
          <h2>Session</h2>
          @if (auth.user(); as user) {
            <dl class="fp-dl">
              <div><dt>Email</dt><dd>{{ user.email }}</dd></div>
              <div><dt>Status</dt><dd>{{ user.status }}</dd></div>
              <div><dt>MFA</dt><dd>{{ user.mfaEnabled ? 'Enabled' : 'Off' }}</dd></div>
              <div><dt>Roles</dt><dd>{{ user.roles.join(', ') || '—' }}</dd></div>
              <div><dt>Permissions</dt><dd>{{ user.permissions.length }}</dd></div>
            </dl>
          }
          <div class="fp-row">
            <a routerLink="/profile"><ui-button variant="secondary">Profile</ui-button></a>
            <a routerLink="/security"><ui-button variant="secondary">Security</ui-button></a>
            <a routerLink="/settings/mfa"><ui-button variant="secondary">MFA</ui-button></a>
          </div>
        </section>

        <section class="fp-panel">
          <h2>Security overview</h2>
          @if (overview(); as o) {
            <dl class="fp-dl">
              <div><dt>Email verified</dt><dd>{{ o.emailVerified ? 'Yes' : 'No' }}</dd></div>
              <div><dt>Pending email</dt><dd>{{ o.pendingEmail || '—' }}</dd></div>
              <div><dt>Active sessions</dt><dd>{{ o.activeSessionCount }}</dd></div>
              <div><dt>Must change password</dt><dd>{{ o.mustChangePassword ? 'Yes' : 'No' }}</dd></div>
            </dl>
          } @else {
            <p class="fp-muted">Could not load security overview.</p>
          }
        </section>

        @if (
          perms.hasAny([
            'USER_READ',
            'ROLE_READ',
            'PERMISSION_READ',
            'AUDIT_READ',
            'NOTE_READ',
          ])
        ) {
          <section class="fp-panel">
            <h2>Administration</h2>
            <div class="fp-row">
              @if (perms.has('USER_READ')) {
                <a routerLink="/users"><ui-button variant="secondary">Users</ui-button></a>
              }
              @if (perms.has('ROLE_READ')) {
                <a routerLink="/roles"><ui-button variant="secondary">Roles</ui-button></a>
              }
              @if (perms.has('PERMISSION_READ')) {
                <a routerLink="/permissions"><ui-button variant="secondary">Permissions</ui-button></a>
              }
              @if (perms.has('AUDIT_READ')) {
                <a routerLink="/audit"><ui-button variant="secondary">Activity log</ui-button></a>
              }
              @if (perms.has('NOTE_READ')) {
                <a routerLink="/notes"><ui-button variant="secondary">Demo notes</ui-button></a>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly perms = inject(PermissionService);
  private readonly securityApi = inject(SecurityApi);

  readonly loading = signal(true);
  readonly overview = signal<SecurityOverview | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.overview.set(await this.securityApi.overview());
    } catch {
      this.overview.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}

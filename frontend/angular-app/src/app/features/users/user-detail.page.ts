import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { AdminUser } from '../../core/api/page.types';
import { UsersApi } from './users.api';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';

function initials(user: AdminUser): string {
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  return (user.email || '?').slice(0, 2).toUpperCase();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

@Component({
  selector: 'app-user-detail-page',
  standalone: true,
  imports: [NgClass, RouterLink, UiButton, UiLoadingState, UiErrorState],
  template: `
    <div class="admin-page">
      <p class="fp-back">
        <a class="fp-link" routerLink="/users">← Users</a>
      </p>

      @if (loading()) {
        <ui-loading-state />
      } @else if (error()) {
        <ui-error-state title="User not available" [message]="error()!">
          <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
        </ui-error-state>
      } @else if (user(); as u) {
        <section class="admin-card">
          <div class="admin-card__body">
            <div class="users-hero">
              <div class="users-hero__main">
                <div class="users-avatar" aria-hidden="true">{{ initials(u) }}</div>
                <div>
                  <h1 class="users-hero__email">
                    {{ displayName(u) }}
                  </h1>
                  <p class="users-hero__meta">{{ u.email }}</p>
                  <div class="users-hero__badges">
                    <span
                      class="admin-status"
                      [ngClass]="loginEnabled(u) ? 'admin-status--ok' : 'admin-status--danger'"
                    >
                      {{ loginEnabled(u) ? 'Can sign in' : 'Cannot sign in' }}
                    </span>
                    <span class="admin-status">{{ formatStatus(u.status) }}</span>
                    <span
                      class="admin-status"
                      [ngClass]="u.emailVerified ? 'admin-status--ok' : 'admin-status--warn'"
                    >
                      {{ u.emailVerified ? 'Email verified' : 'Email not verified' }}
                    </span>
                  </div>
                </div>
              </div>
              @if (perms.has('USER_UPDATE')) {
                <a [routerLink]="['/users', u.id, 'edit']">
                  <ui-button type="button">Edit user</ui-button>
                </a>
              }
            </div>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Overview</p>
            <h2 class="admin-card__title">Account information</h2>
            <p class="admin-card__desc">Read-only snapshot. Use Edit to change profile or access.</p>
          </div>
          <div class="admin-card__body">
            <dl class="fp-dl fp-dl--cols">
              <div>
                <dt>Email</dt>
                <dd>{{ u.email }}</dd>
              </div>
              <div>
                <dt>Pending email</dt>
                <dd>{{ u.pendingEmail || '—' }}</dd>
              </div>
              <div>
                <dt>First name</dt>
                <dd>{{ u.firstName || '—' }}</dd>
              </div>
              <div>
                <dt>Last name</dt>
                <dd>{{ u.lastName || '—' }}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{{ u.phone || '—' }}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{{ formatStatus(u.status) }}</dd>
              </div>
              <div>
                <dt>Login</dt>
                <dd>{{ loginEnabled(u) ? 'Enabled' : 'Disabled' }}</dd>
              </div>
              <div>
                <dt>Must change password</dt>
                <dd>{{ u.mustChangePassword ? 'Yes' : 'No' }}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{{ formatDate(u.createdAt) }}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{{ formatDate(u.updatedAt) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Authorization</p>
            <h2 class="admin-card__title">Roles</h2>
          </div>
          <div class="admin-card__body">
            @if (u.roles.length) {
              <ul class="users-role-list">
                @for (role of u.roles; track role) {
                  <li>{{ role }}</li>
                }
              </ul>
            } @else {
              <p class="fp-muted">No roles assigned</p>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class UserDetailPage implements OnInit {
  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly perms = inject(PermissionService);

  readonly user = signal<AdminUser | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly initials = initials;
  readonly formatDate = formatDate;
  readonly formatStatus = formatStatus;

  private userId = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    void this.reload();
  }

  displayName(u: AdminUser): string {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return name || u.email;
  }

  loginEnabled(u: AdminUser): boolean {
    return u.status === 'ACTIVE' && u.emailVerified;
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.user.set(await this.api.get(this.userId));
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load user'));
    } finally {
      this.loading.set(false);
    }
  }
}
import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AdminUser, Role } from '../../core/api/page.types';
import { UsersApi } from './users.api';
import { RolesApi } from '../roles/roles.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiCheckbox } from '../../shared/ui/checkbox/ui-checkbox';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';

@Component({
  selector: 'app-user-edit-page',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    RouterLink,
    UiPageHeader,
    UiButton,
    UiField,
    UiInput,
    UiCheckbox,
    UiLoadingState,
    UiErrorState,
  ],
  template: `
    <div class="admin-page">
      <p class="fp-back">
        <a class="fp-link" [routerLink]="['/users', userId]">← Back to details</a>
      </p>

      @if (loading()) {
        <ui-loading-state />
      } @else if (error()) {
        <ui-error-state title="User not available" [message]="error()!">
          <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
        </ui-error-state>
      } @else if (user(); as u) {
        <ui-page-header [title]="'Edit ' + (u.firstName || u.email)" [subtitle]="u.email">
          <span
            class="admin-status"
            [ngClass]="loginEnabled() ? 'admin-status--ok' : 'admin-status--danger'"
          >
            {{ loginEnabled() ? 'Can sign in' : 'Cannot sign in' }}
          </span>
        </ui-page-header>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Profile</p>
            <h2 class="admin-card__title">Personal information</h2>
            <p class="admin-card__desc">
              Update names and contact details. Email changes are handled by the user from their
              profile.
            </p>
          </div>
          <div class="admin-card__body">
            <form (ngSubmit)="saveProfile()" novalidate>
              <div class="admin-grid">
                <ui-field label="Email" forId="ue-email">
                  <ui-input inputId="ue-email" name="email" [ngModel]="u.email" [disabled]="true" />
                </ui-field>
                <ui-field label="Phone" forId="ue-phone">
                  <ui-input inputId="ue-phone" name="phone" [(ngModel)]="phone" />
                </ui-field>
                <ui-field label="First name" forId="ue-first">
                  <ui-input inputId="ue-first" name="first" [(ngModel)]="firstName" required />
                </ui-field>
                <ui-field label="Last name" forId="ue-last">
                  <ui-input inputId="ue-last" name="last" [(ngModel)]="lastName" required />
                </ui-field>
                <ui-field label="Job title" forId="ue-job">
                  <ui-input inputId="ue-job" name="jobTitle" [(ngModel)]="jobTitle" />
                </ui-field>
                <ui-field label="Department" forId="ue-dept">
                  <ui-input inputId="ue-dept" name="department" [(ngModel)]="department" />
                </ui-field>
                <ui-field label="Organization" forId="ue-org">
                  <ui-input inputId="ue-org" name="organization" [(ngModel)]="organization" />
                </ui-field>
                <ui-field label="City" forId="ue-city">
                  <ui-input inputId="ue-city" name="city" [(ngModel)]="city" />
                </ui-field>
                <ui-field label="Country" forId="ue-country">
                  <ui-input inputId="ue-country" name="country" [(ngModel)]="country" />
                </ui-field>
                <ui-field label="Language" forId="ue-lang">
                  <ui-input inputId="ue-lang" name="lang" [(ngModel)]="preferredLanguage" />
                </ui-field>
                <ui-field label="Timezone" forId="ue-tz">
                  <ui-input inputId="ue-tz" name="tz" [(ngModel)]="timezone" />
                </ui-field>
                <div class="admin-grid--full">
                  <ui-field label="About" forId="ue-bio">
                    <textarea
                      id="ue-bio"
                      name="bio"
                      class="fp-textarea"
                      rows="3"
                      [(ngModel)]="bio"
                    ></textarea>
                  </ui-field>
                </div>
              </div>

              @if (perms.has('USER_ASSIGN_ROLE')) {
                <hr class="users-edit-divider" />
                <p class="admin-card__eyebrow">Roles</p>
                <h3 class="admin-card__title users-edit-roles-title">Assign roles</h3>
                <p class="admin-card__desc users-edit-roles-desc">
                  Tick the roles this user should have. Changes are saved with the form.
                </p>
                <div class="users-role-grid">
                  @for (role of assignableRoles(); track role.code) {
                    <div class="users-role-chip">
                      <ui-checkbox
                        [inputId]="'ue-role-' + role.code"
                        [name]="'role-' + role.code"
                        [ngModel]="selectedRoles().has(role.code)"
                        (ngModelChange)="toggleRole(role.code, $event)"
                      >
                        <strong>{{ role.name }}</strong>
                        <span>{{ role.code }}</span>
                      </ui-checkbox>
                    </div>
                  }
                </div>
                @if (u.roles.includes('SUPER_ADMIN')) {
                  <p class="fp-muted users-edit-super-note">
                    This user also has SUPER_ADMIN (managed separately below).
                  </p>
                }
              }

              @if (formError()) {
                <p class="fp-err" role="alert">{{ formError() }}</p>
              }
              <div class="fp-row users-edit-actions">
                <ui-button type="submit" [loading]="saving()">Save changes</ui-button>
                <a [routerLink]="['/users', userId]">
                  <ui-button variant="secondary" type="button">Cancel</ui-button>
                </a>
              </div>
            </form>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Security</p>
            <h2 class="admin-card__title">Access controls</h2>
            <p class="admin-card__desc">
              Each action is explained below so you know what happens before you click.
            </p>
          </div>
          <div class="admin-card__body">
            <div class="users-action-grid">
              @if (perms.has('USER_ACTIVATE') && u.status !== 'ACTIVE') {
                <div class="users-action-card">
                  <h3>Enable login</h3>
                  <p>
                    Sets the account to Active so the user can sign in again (if their email is
                    verified).
                  </p>
                  <ui-button type="button" [loading]="busy()" (click)="runActivate()">
                    Enable login
                  </ui-button>
                </div>
              }
              @if (perms.has('USER_SUSPEND') && u.status === 'ACTIVE') {
                <div class="users-action-card">
                  <h3>Disable login</h3>
                  <p>
                    Blocks sign-in immediately and ends their current sessions. They cannot use the
                    API until you enable them again.
                  </p>
                  <ui-button variant="danger" type="button" [loading]="busy()" (click)="runDisable()">
                    Disable login
                  </ui-button>
                </div>
              }
              @if (perms.has('USER_REVOKE_TOKENS')) {
                <div class="users-action-card">
                  <h3>Revoke sessions</h3>
                  <p>
                    Signs the user out everywhere now, without disabling the account. Useful if a
                    device is lost or a session looks suspicious.
                  </p>
                  <ui-button variant="secondary" type="button" [loading]="busy()" (click)="runRevoke()">
                    Revoke all sessions
                  </ui-button>
                </div>
              }
              @if (perms.has('USER_RESET_PASSWORD')) {
                <div class="users-action-card">
                  <h3>Reset password</h3>
                  <p>
                    Sends a password-reset email, forces a password change, and ends current
                    sessions. The user picks a new password from the email link.
                  </p>
                  <ui-button
                    variant="secondary"
                    type="button"
                    [loading]="busy()"
                    [disabled]="u.status !== 'ACTIVE'"
                    (click)="runPasswordReset()"
                  >
                    Send password reset
                  </ui-button>
                </div>
              }
              @if (perms.has('MFA_ADMIN_RESET')) {
                <div class="users-action-card">
                  <h3>Reset MFA</h3>
                  <p>
                    Removes their authenticator setup so they can enroll MFA again. Use when they
                    lost their phone or authenticator app.
                  </p>
                  <ui-button variant="secondary" type="button" [loading]="busy()" (click)="runResetMfa()">
                    Reset MFA
                  </ui-button>
                </div>
              }
              @if (perms.has('USER_INVITE') && u.status === 'PENDING_ACTIVATION') {
                <div class="users-action-card">
                  <h3>Resend invitation</h3>
                  <p>
                    Sends a fresh invite email so they can verify their address and set a password.
                  </p>
                  <ui-button variant="secondary" type="button" [loading]="busy()" (click)="runInvite()">
                    Resend invite
                  </ui-button>
                </div>
              }
              @if (isSuperAdmin() && !u.roles.includes('SUPER_ADMIN')) {
                <div class="users-action-card">
                  <h3>Grant SUPER_ADMIN</h3>
                  <p>
                    Highest privilege. Confirm with your own password. Prefer ordinary roles when
                    possible.
                  </p>
                  <ui-field label="Your password" forId="grant-pw">
                    <ui-input
                      inputId="grant-pw"
                      type="password"
                      name="grantPw"
                      [(ngModel)]="grantPassword"
                    />
                  </ui-field>
                  <ui-button variant="danger" type="button" [loading]="busy()" (click)="runGrantSuper()">
                    Grant SUPER_ADMIN
                  </ui-button>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .users-edit-divider {
      margin: 1.25rem 0;
      border: 0;
      border-top: 1px solid var(--color-border);
    }
    .users-edit-roles-title {
      margin-bottom: 0.75rem;
    }
    .users-edit-roles-desc {
      margin-bottom: 1rem;
    }
    .users-edit-super-note {
      margin-top: 0.75rem;
    }
    .users-edit-actions {
      margin-top: 1rem;
    }
  `,
})
export class UserEditPage implements OnInit {
  private readonly api = inject(UsersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  readonly perms = inject(PermissionService);

  readonly user = signal<AdminUser | null>(null);
  readonly catalog = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly selectedRoles = signal<Set<string>>(new Set());

  firstName = '';
  lastName = '';
  phone = '';
  jobTitle = '';
  department = '';
  organization = '';
  city = '';
  country = '';
  preferredLanguage = '';
  timezone = '';
  bio = '';
  grantPassword = '';
  userId = '';

  readonly assignableRoles = computed(() =>
    this.catalog().filter((r) => r.code !== 'SUPER_ADMIN')
  );

  readonly loginEnabled = computed(() => {
    const u = this.user();
    return !!u && u.status === 'ACTIVE' && u.emailVerified;
  });

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    void this.reload();
    void this.loadCatalog();
  }

  isSuperAdmin(): boolean {
    return !!this.auth.user()?.roles.includes('SUPER_ADMIN');
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const u = await this.api.get(this.userId);
      this.user.set(u);
      this.firstName = u.firstName ?? '';
      this.lastName = u.lastName ?? '';
      this.phone = u.phone ?? '';
      this.selectedRoles.set(new Set(u.roles.filter((r) => r !== 'SUPER_ADMIN')));
      try {
        const profile = await this.api.getProfile(this.userId);
        this.jobTitle = profile.jobTitle ?? '';
        this.department = profile.department ?? '';
        this.organization = profile.organization ?? '';
        this.city = profile.city ?? '';
        this.country = profile.country ?? '';
        this.preferredLanguage = profile.preferredLanguage ?? '';
        this.timezone = profile.timezone ?? '';
        this.bio = profile.bio ?? '';
      } catch {
        /* extended profile optional */
      }
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load user'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCatalog(): Promise<void> {
    if (!this.perms.has('ROLE_READ') && !this.perms.has('USER_ASSIGN_ROLE')) {
      return;
    }
    try {
      this.catalog.set(await this.rolesApi.list());
    } catch {
      this.catalog.set([]);
    }
  }

  toggleRole(code: string, checked: boolean): void {
    this.selectedRoles.update((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(code);
      } else {
        next.delete(code);
      }
      return next;
    });
  }

  async saveProfile(): Promise<void> {
    if (!this.perms.has('USER_UPDATE')) {
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const u = this.user();
    try {
      await this.api.update(this.userId, {
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone,
        jobTitle: this.jobTitle || undefined,
        department: this.department || undefined,
        organization: this.organization || undefined,
        city: this.city || undefined,
        country: this.country || undefined,
        preferredLanguage: this.preferredLanguage || undefined,
        timezone: this.timezone || undefined,
        bio: this.bio || undefined,
      });

      if (this.perms.has('USER_ASSIGN_ROLE') && u) {
        const current = new Set(u.roles.filter((r) => r !== 'SUPER_ADMIN'));
        for (const code of this.selectedRoles()) {
          if (!current.has(code)) {
            await this.api.assignRole(this.userId, code);
          }
        }
        for (const code of current) {
          if (!this.selectedRoles().has(code)) {
            await this.api.removeRole(this.userId, code);
          }
        }
      }

      this.toasts.success('User updated');
      await this.reload();
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not save user'));
    } finally {
      this.saving.set(false);
    }
  }

  runActivate(): Promise<void> {
    return this.run(() => this.api.activate(this.userId), 'Login enabled');
  }

  runDisable(): Promise<void> {
    return this.run(() => this.api.disable(this.userId), 'Login disabled');
  }

  runRevoke(): Promise<void> {
    return this.run(() => this.api.revokeSessions(this.userId), 'All sessions revoked');
  }

  runPasswordReset(): Promise<void> {
    return this.run(() => this.api.forcePasswordReset(this.userId), 'Password reset sent');
  }

  runResetMfa(): Promise<void> {
    return this.run(() => this.api.resetMfa(this.userId), 'MFA reset');
  }

  runInvite(): Promise<void> {
    return this.run(() => this.api.sendInvitation(this.userId), 'Invitation sent');
  }

  async runGrantSuper(): Promise<void> {
    if (!this.grantPassword) {
      this.toasts.warning('Password required');
      return;
    }
    await this.run(async () => {
      await this.api.grantSuperAdmin(this.userId, this.grantPassword);
      this.grantPassword = '';
    }, 'SUPER_ADMIN granted');
  }

  async run(action: () => Promise<unknown>, success: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.toasts.success(success);
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Action failed'));
    } finally {
      this.busy.set(false);
    }
  }
}
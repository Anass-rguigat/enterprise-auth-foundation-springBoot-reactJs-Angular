import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  MfaEnrollmentStart,
  MfaStatus,
  SecurityOverview,
  SessionSummary,
} from '../../core/api/page.types';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ProfileApi } from './profile.api';
import { MfaApi } from '../mfa-settings/mfa.api';
import { SecurityApi } from '../security/security.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';
import { UiTable } from '../../shared/ui/table/ui-table';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    FormsModule,
    UiPageHeader,
    UiButton,
    UiField,
    UiInput,
    UiLoadingState,
    UiErrorState,
    UiEmptyState,
    UiTable,
  ],
  template: `
    <ui-page-header
      title="Profile"
      subtitle="Manage your account, MFA, password, and sessions."
    />

    @if (loading()) {
      <ui-loading-state />
    } @else if (loadError()) {
      <ui-error-state title="Could not load profile" [message]="loadError()!">
        <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
      </ui-error-state>
    } @else {
      <div class="profile">
        <header class="profile__hero">
          <div class="profile__avatar" aria-hidden="true">{{ avatarInitials() }}</div>
          <div>
            <h2 class="profile__name">{{ displayName() }}</h2>
            <p class="profile__email">{{ auth.user()?.email }}</p>
            <div class="profile__badges">
              <span class="profile__badge" [class.profile__badge--ok]="auth.user()?.emailVerified" [class.profile__badge--warn]="!auth.user()?.emailVerified">
                {{ auth.user()?.emailVerified ? 'Email verified' : 'Email unverified' }}
              </span>
              <span class="profile__badge" [class.profile__badge--ok]="mfaStatus()?.enabled">
                MFA {{ mfaStatus()?.enabled ? 'enabled' : 'disabled' }}
              </span>
              @if (overview()?.pendingEmail; as pending) {
                <span class="profile__badge profile__badge--warn">Pending: {{ pending }}</span>
              }
            </div>
          </div>
        </header>

        <section class="profile__card">
          <div class="profile__card-head">
            <p class="profile__card-eyebrow">Account</p>
            <h3 class="profile__card-title">Personal information</h3>
            <p class="profile__card-desc">
              Update how you appear in the product. Email changes require verification on the new
              address.
            </p>
          </div>
          <div class="profile__card-body">
            <form (ngSubmit)="saveProfile()">
              <div class="profile__grid">
                <ui-field label="First name" forId="pf-first">
                  <ui-input inputId="pf-first" name="firstName" [(ngModel)]="firstName" />
                </ui-field>
                <ui-field label="Last name" forId="pf-last">
                  <ui-input inputId="pf-last" name="lastName" [(ngModel)]="lastName" />
                </ui-field>
                <ui-field label="Job title" forId="pf-job">
                  <ui-input inputId="pf-job" name="jobTitle" [(ngModel)]="jobTitle" />
                </ui-field>
                <ui-field label="Department" forId="pf-dept">
                  <ui-input inputId="pf-dept" name="department" [(ngModel)]="department" />
                </ui-field>
                <ui-field label="Organization" forId="pf-org">
                  <ui-input inputId="pf-org" name="organization" [(ngModel)]="organization" />
                </ui-field>
                <ui-field label="Phone" forId="pf-phone">
                  <ui-input inputId="pf-phone" name="phone" [(ngModel)]="phone" />
                </ui-field>
                <ui-field label="City" forId="pf-city">
                  <ui-input inputId="pf-city" name="city" [(ngModel)]="city" />
                </ui-field>
                <ui-field label="Country" forId="pf-country">
                  <ui-input inputId="pf-country" name="country" [(ngModel)]="country" />
                </ui-field>
                <ui-field label="Preferred language" forId="pf-lang">
                  <ui-input inputId="pf-lang" name="lang" [(ngModel)]="preferredLanguage" />
                </ui-field>
                <ui-field label="Timezone" forId="pf-tz">
                  <ui-input inputId="pf-tz" name="tz" [(ngModel)]="timezone" />
                </ui-field>
                <div class="profile__grid--full">
                  <ui-field label="About" forId="pf-bio">
                    <textarea id="pf-bio" name="bio" class="profile__textarea" rows="4" [(ngModel)]="bio"></textarea>
                  </ui-field>
                </div>
              </div>
              @if (profileError()) {
                <p class="profile__err" role="alert">{{ profileError() }}</p>
              }
              <div class="profile__actions">
                <ui-button type="submit" [loading]="savingProfile()">Save information</ui-button>
              </div>
            </form>

            <hr class="profile__divider" />

            <form (ngSubmit)="changeEmail()">
              <p class="profile__card-eyebrow">Email address</p>
              <h4 class="profile__card-title">Update email</h4>
              <div class="profile__grid">
                <ui-field label="Current email" forId="pf-email-current">
                  <ui-input
                    inputId="pf-email-current"
                    name="currentEmail"
                    [ngModel]="auth.user()?.email || ''"
                    [disabled]="true"
                  />
                </ui-field>
                <ui-field label="New email" forId="pf-email-new" [error]="emailError()">
                  <ui-input
                    inputId="pf-email-new"
                    type="email"
                    name="newEmail"
                    autocomplete="email"
                    [(ngModel)]="newEmail"
                  />
                </ui-field>
              </div>
              @if (overview()?.pendingEmail; as pending) {
                <p class="profile__hint">
                  Pending verification for <strong>{{ pending }}</strong>. Your login email stays the
                  same until you open the confirmation link. In local development, open
                  <a class="fp-link" href="http://localhost:8026" target="_blank" rel="noreferrer">Mailpit</a>
                  to find that message (it is not delivered to real Gmail).
                </p>
              } @else {
                <p class="profile__hint">
                  Your email does not change immediately. We send a confirmation link to the new
                  address first. After you confirm it, the new email becomes your login email.
                  Locally, messages appear in
                  <a class="fp-link" href="http://localhost:8026" target="_blank" rel="noreferrer">Mailpit</a>,
                  not in Gmail.
                </p>
              }
              <div class="profile__actions">
                <ui-button type="submit" variant="secondary" [loading]="emailBusy()">
                  Send verification email
                </ui-button>
              </div>
            </form>
          </div>
        </section>

        <section class="profile__card">
          <div class="profile__card-head">
            <p class="profile__card-eyebrow">Authentication</p>
            <h3 class="profile__card-title">Multi-factor authentication</h3>
            <p class="profile__card-desc">Use an authenticator app for a second factor when signing in.</p>
          </div>
          <div class="profile__card-body">
            <div class="profile__switch-row">
              <div class="profile__switch-copy">
                <h3>{{ mfaStatus()?.enabled ? 'MFA is enabled' : 'MFA is disabled' }}</h3>
                <p class="profile__hint">
                  @if (mfaStatus()?.enrollmentPending) {
                    Enrollment pending — confirm with a code from your app.
                  } @else if (mfaStatus()?.enabled) {
                    {{ mfaStatus()!.unusedRecoveryCodes }} recovery codes remaining.
                  } @else {
                    Slide the switch on to start enrollment.
                  }
                </p>
              </div>
              <label class="profile__switch">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Enable MFA"
                  [checked]="mfaOn()"
                  [disabled]="mfaBusy()"
                  (change)="onMfaToggle($any($event.target).checked)"
                />
                <span class="profile__switch-track" aria-hidden="true"></span>
              </label>
            </div>

            @if (enrollment(); as enr) {
              <div class="profile__secret">
                <p class="profile__hint">Add this secret to your authenticator app, then confirm with a TOTP code.</p>
                <p><strong>Secret:</strong> <code>{{ enr.secretBase32 }}</code></p>
                <p><strong>otpauth:</strong> <code>{{ enr.otpauthUri }}</code></p>
                <ui-field label="Confirmation code" forId="mfa-confirm">
                  <ui-input inputId="mfa-confirm" name="confirm" [(ngModel)]="confirmCode" />
                </ui-field>
                <div class="profile__actions">
                  <ui-button type="button" [loading]="mfaBusy()" (click)="confirmEnroll()">Confirm MFA</ui-button>
                  <ui-button variant="secondary" type="button" [loading]="mfaBusy()" (click)="onMfaToggle(false)">
                    Cancel
                  </ui-button>
                </div>
              </div>
            }

            @if (recoveryCodes().length) {
              <div class="profile__secret">
                <strong>Recovery codes (shown once)</strong>
                <ul class="profile__codes">
                  @for (c of recoveryCodes(); track c) {
                    <li><code>{{ c }}</code></li>
                  }
                </ul>
              </div>
            }

            @if (showDisableForm() && mfaStatus()?.enabled) {
              <form (ngSubmit)="disableMfa()">
                <p class="profile__hint">Confirm with your password and a TOTP or recovery code to disable MFA.</p>
                <div class="profile__grid">
                  <ui-field label="Password" forId="dis-pw">
                    <ui-input inputId="dis-pw" type="password" name="disPw" [(ngModel)]="disablePassword" />
                  </ui-field>
                  <ui-field label="TOTP / recovery code" forId="dis-code">
                    <ui-input inputId="dis-code" name="disCode" [(ngModel)]="disableCode" />
                  </ui-field>
                </div>
                <div class="profile__actions">
                  <ui-button variant="danger" type="submit" [loading]="mfaBusy()">Disable MFA</ui-button>
                  <ui-button variant="secondary" type="button" (click)="cancelDisable()">Cancel</ui-button>
                </div>
              </form>
            }
          </div>
        </section>

        <section class="profile__card">
          <div class="profile__card-head">
            <p class="profile__card-eyebrow">Authentication</p>
            <h3 class="profile__card-title">Change password</h3>
            <p class="profile__card-desc">
              Updates your password and signs you out of every session so you can sign in again.
            </p>
          </div>
          <div class="profile__card-body">
            <form (ngSubmit)="changePassword()">
              <div class="profile__grid">
                <ui-field label="Current password" forId="chg-current">
                  <ui-input
                    inputId="chg-current"
                    type="password"
                    name="currentPassword"
                    autocomplete="current-password"
                    [(ngModel)]="currentPassword"
                  />
                </ui-field>
                <ui-field label="New password" forId="chg-new">
                  <ui-input
                    inputId="chg-new"
                    type="password"
                    name="newPassword"
                    autocomplete="new-password"
                    [(ngModel)]="newPassword"
                  />
                </ui-field>
              </div>
              @if (passwordError()) {
                <p class="profile__err" role="alert">{{ passwordError() }}</p>
              }
              <div class="profile__actions">
                <ui-button type="submit" [loading]="passwordBusy()">Update password</ui-button>
              </div>
            </form>
          </div>
        </section>

        <section class="profile__card">
          <div class="profile__card-head">
            <p class="profile__card-eyebrow">Security</p>
            <h3 class="profile__card-title">Sessions</h3>
            <p class="profile__card-desc">
              Review where you are signed in. Sign out all ends every active session immediately.
            </p>
          </div>
          <div class="profile__card-body">
            <div class="profile__actions">
              <ui-button variant="danger" type="button" [loading]="signingOutAll()" (click)="signOutAll()">
                Sign out all sessions
              </ui-button>
              @if (overview(); as o) {
                <p class="profile__hint">{{ o.activeSessionCount }} active session(s)</p>
              }
            </div>
            @if (!sessions().length) {
              <ui-empty-state title="No active sessions" />
            } @else {
              <div class="profile__sessions">
                <ui-table>
                  <table>
                    <thead>
                      <tr>
                        <th>Device / label</th>
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
                          <td>{{ formatDate(s.createdAt) }}</td>
                          <td>{{ formatDate(s.lastUsedAt) }}</td>
                          <td>{{ s.current ? 'Yes' : 'No' }}</td>
                          <td>
                            @if (!s.current) {
                              <ui-button
                                variant="danger"
                                type="button"
                                [loading]="sessionBusyId() === s.familyId"
                                (click)="revoke(s.familyId)"
                              >
                                Revoke
                              </ui-button>
                            } @else {
                              <span class="profile__hint">This device</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </ui-table>
              </div>
            }
          </div>
        </section>
      </div>
    }
  `,

})
export class ProfilePage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ProfileApi);
  private readonly mfaApi = inject(MfaApi);
  private readonly securityApi = inject(SecurityApi);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  firstName = '';
  lastName = '';
  phone = '';
  preferredLanguage = '';
  timezone = '';
  jobTitle = '';
  department = '';
  organization = '';
  city = '';
  country = '';
  bio = '';
  newEmail = '';
  confirmCode = '';
  disablePassword = '';
  disableCode = '';
  currentPassword = '';
  newPassword = '';

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly savingProfile = signal(false);
  readonly profileError = signal('');
  readonly emailBusy = signal(false);
  readonly emailError = signal('');
  readonly overview = signal<SecurityOverview | null>(null);
  readonly mfaStatus = signal<MfaStatus | null>(null);
  readonly enrollment = signal<MfaEnrollmentStart | null>(null);
  readonly recoveryCodes = signal<string[]>([]);
  readonly mfaBusy = signal(false);
  readonly showDisableForm = signal(false);
  readonly passwordBusy = signal(false);
  readonly passwordError = signal('');
  readonly sessions = signal<SessionSummary[]>([]);
  readonly sessionBusyId = signal<string | null>(null);
  readonly signingOutAll = signal(false);

  readonly displayName = computed(() => this.auth.displayName() || this.auth.user()?.email || 'Account');
  readonly avatarInitials = computed(() => {
    const name = this.displayName();
    const email = this.auth.user()?.email ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase();
    return (email || '?').slice(0, 2).toUpperCase();
  });

  mfaOn(): boolean {
    const status = this.mfaStatus();
    return Boolean(status?.enabled || this.enrollment() || status?.enrollmentPending);
  }

  ngOnInit(): void {
    void this.reload();
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [profile, mfa, sessionList, security] = await Promise.all([
        this.api.getMine(),
        this.mfaApi.status(),
        this.securityApi.sessions(),
        this.securityApi.overview(),
      ]);
      this.firstName = profile.firstName ?? '';
      this.lastName = profile.lastName ?? '';
      this.phone = profile.phone ?? '';
      this.preferredLanguage = profile.preferredLanguage ?? '';
      this.timezone = profile.timezone ?? '';
      this.jobTitle = profile.jobTitle ?? '';
      this.department = profile.department ?? '';
      this.organization = profile.organization ?? '';
      this.city = profile.city ?? '';
      this.country = profile.country ?? '';
      this.bio = profile.bio ?? '';
      this.mfaStatus.set(mfa);
      this.overview.set(security);
      if (!mfa.enrollmentPending) this.enrollment.set(null);
      if (!mfa.enabled) this.showDisableForm.set(false);
      this.sessions.set(sessionList);
    } catch (err) {
      this.loadError.set(this.auth.problemMessage(err, 'Failed to load profile'));
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfile(): Promise<void> {
    this.savingProfile.set(true);
    this.profileError.set('');
    try {
      await this.api.updateMine({
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone,
        preferredLanguage: this.preferredLanguage,
        timezone: this.timezone,
        jobTitle: this.jobTitle,
        department: this.department,
        organization: this.organization,
        city: this.city,
        country: this.country,
        bio: this.bio,
      });
      this.toasts.success('Profile updated');
      await this.reload();
    } catch (err) {
      this.profileError.set(this.auth.problemMessage(err, 'Could not save profile'));
    } finally {
      this.savingProfile.set(false);
    }
  }

  async changeEmail(): Promise<void> {
    const value = this.newEmail.trim();
    this.emailError.set(value.includes('@') ? '' : 'Enter a valid email');
    if (!value.includes('@')) return;
    this.emailBusy.set(true);
    try {
      await this.auth.beginEmailChange(value);
      this.toasts.success(
        'Verification email sent. Open Mailpit (localhost:8026) in local dev, then confirm the link.'
      );
      this.newEmail = '';
      await this.reload();
    } catch (err) {
      this.emailError.set(this.auth.problemMessage(err, 'Could not start email change'));
    } finally {
      this.emailBusy.set(false);
    }
  }

  async onMfaToggle(wantEnabled: boolean): Promise<void> {
    const status = this.mfaStatus();
    if (!status || this.mfaBusy()) return;
    if (wantEnabled && !status.enabled) {
      this.mfaBusy.set(true);
      try {
        this.enrollment.set(await this.mfaApi.enroll());
        this.showDisableForm.set(false);
        await this.reload();
      } catch (err) {
        this.toasts.danger(this.auth.problemMessage(err, 'Could not start MFA enrollment'));
      } finally {
        this.mfaBusy.set(false);
      }
      return;
    }
    if (!wantEnabled && status.enabled) {
      this.showDisableForm.set(true);
      return;
    }
    if (!wantEnabled && (this.enrollment() || status.enrollmentPending)) {
      this.mfaBusy.set(true);
      try {
        await this.mfaApi.cancelEnroll();
        this.enrollment.set(null);
        this.toasts.success('Enrollment cancelled');
        await this.reload();
      } catch (err) {
        this.toasts.danger(this.auth.problemMessage(err, 'Cancel failed'));
      } finally {
        this.mfaBusy.set(false);
      }
    }
  }

  async confirmEnroll(): Promise<void> {
    this.mfaBusy.set(true);
    try {
      const result = await this.mfaApi.confirm(this.confirmCode.trim());
      this.recoveryCodes.set(result.recoveryCodes);
      this.enrollment.set(null);
      this.confirmCode = '';
      this.toasts.success('MFA enabled — store your recovery codes');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Confirmation failed'));
    } finally {
      this.mfaBusy.set(false);
    }
  }

  cancelDisable(): void {
    this.showDisableForm.set(false);
    this.disablePassword = '';
    this.disableCode = '';
  }

  async disableMfa(): Promise<void> {
    this.mfaBusy.set(true);
    try {
      await this.mfaApi.disable(this.disablePassword, this.disableCode.trim());
      this.disablePassword = '';
      this.disableCode = '';
      this.showDisableForm.set(false);
      this.recoveryCodes.set([]);
      this.toasts.success('MFA disabled');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Disable failed'));
    } finally {
      this.mfaBusy.set(false);
    }
  }

  async changePassword(): Promise<void> {
    this.passwordError.set('');
    if (!this.currentPassword || this.newPassword.length < 8) {
      this.passwordError.set(
        'Current password required; new password must be at least 8 characters'
      );
      return;
    }
    this.passwordBusy.set(true);
    try {
      await this.auth.changePassword(this.currentPassword, this.newPassword);
      this.toasts.success('Password updated. Sign in again.');
      await this.router.navigateByUrl('/login');
    } catch (err) {
      this.passwordError.set(this.auth.problemMessage(err, 'Could not change password'));
    } finally {
      this.passwordBusy.set(false);
    }
  }

  async revoke(familyId: string): Promise<void> {
    this.sessionBusyId.set(familyId);
    try {
      await this.securityApi.revokeSession(familyId);
      this.toasts.success('Session revoked');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Could not revoke session'));
    } finally {
      this.sessionBusyId.set(null);
    }
  }

  async signOutAll(): Promise<void> {
    this.signingOutAll.set(true);
    try {
      await this.auth.logoutAll();
      this.toasts.success('Signed out of all sessions');
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Could not sign out all sessions'));
    } finally {
      this.signingOutAll.set(false);
    }
  }
}

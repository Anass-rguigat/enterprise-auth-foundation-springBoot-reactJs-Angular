import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Role } from '../../core/api/page.types';
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
  selector: 'app-user-create-page',
  standalone: true,
  imports: [
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
        <a class="fp-link" routerLink="/users">← Users</a>
      </p>
      <ui-page-header
        title="Create user"
        subtitle="We always send an invite. They verify email and choose their own password."
      />

      @if (rolesLoading()) {
        <ui-loading-state />
      }
      @if (rolesError()) {
        <ui-error-state title="Could not load roles" [message]="rolesError()!">
          <ui-button variant="secondary" type="button" (click)="loadRoles()">Retry</ui-button>
        </ui-error-state>
      }

      <form (ngSubmit)="submit()" novalidate>
        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Invite</p>
            <h2 class="admin-card__title">Account &amp; profile</h2>
            <p class="admin-card__desc">
              No admin password is set. The invite link activates the account.
            </p>
          </div>
          <div class="admin-card__body">
            <div class="admin-grid">
              <ui-field label="Email" forId="uc-email">
                <ui-input inputId="uc-email" type="email" name="email" [(ngModel)]="email" required />
              </ui-field>
              <ui-field label="Phone" forId="uc-phone">
                <ui-input inputId="uc-phone" name="phone" [(ngModel)]="phone" />
              </ui-field>
              <ui-field label="First name" forId="uc-first">
                <ui-input inputId="uc-first" name="first" [(ngModel)]="firstName" required />
              </ui-field>
              <ui-field label="Last name" forId="uc-last">
                <ui-input inputId="uc-last" name="last" [(ngModel)]="lastName" required />
              </ui-field>
              <ui-field label="Job title" forId="uc-job">
                <ui-input inputId="uc-job" name="jobTitle" [(ngModel)]="jobTitle" />
              </ui-field>
              <ui-field label="Department" forId="uc-dept">
                <ui-input inputId="uc-dept" name="department" [(ngModel)]="department" />
              </ui-field>
              <ui-field label="Organization" forId="uc-org">
                <ui-input inputId="uc-org" name="organization" [(ngModel)]="organization" />
              </ui-field>
              <ui-field label="City" forId="uc-city">
                <ui-input inputId="uc-city" name="city" [(ngModel)]="city" />
              </ui-field>
              <ui-field label="Country" forId="uc-country">
                <ui-input inputId="uc-country" name="country" [(ngModel)]="country" />
              </ui-field>
              <ui-field label="Language" forId="uc-lang">
                <ui-input inputId="uc-lang" name="lang" [(ngModel)]="preferredLanguage" />
              </ui-field>
              <ui-field label="Timezone" forId="uc-tz">
                <ui-input inputId="uc-tz" name="tz" [(ngModel)]="timezone" />
              </ui-field>
              <div class="admin-grid--full">
                <ui-field label="About" forId="uc-bio">
                  <textarea
                    id="uc-bio"
                    name="bio"
                    class="fp-textarea"
                    rows="3"
                    [(ngModel)]="bio"
                  ></textarea>
                </ui-field>
              </div>
            </div>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Authorization</p>
            <h2 class="admin-card__title">Assign roles</h2>
            <p class="admin-card__desc">
              Optional. You can also assign roles later from the edit screen.
            </p>
          </div>
          <div class="admin-card__body">
            <div class="users-role-grid">
              @for (role of assignableRoles(); track role.code) {
                <div class="users-role-chip">
                  <ui-checkbox
                    [inputId]="'uc-role-' + role.code"
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
            @if (formError()) {
              <p class="fp-err" role="alert">{{ formError() }}</p>
            }
            <div class="fp-row">
              <ui-button type="submit" [loading]="saving()">Create &amp; send invite</ui-button>
              <a routerLink="/users">
                <ui-button variant="secondary" type="button">Cancel</ui-button>
              </a>
            </div>
          </div>
        </section>
      </form>
    </div>
  `,
})
export class UserCreatePage implements OnInit {
  private readonly api = inject(UsersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  readonly perms = inject(PermissionService);

  email = '';
  firstName = '';
  lastName = '';
  phone = '';
  jobTitle = '';
  department = '';
  organization = '';
  city = '';
  country = '';
  bio = '';
  preferredLanguage = '';
  timezone = '';

  readonly assignableRoles = signal<Role[]>([]);
  readonly selectedRoles = signal<Set<string>>(new Set());
  readonly rolesLoading = signal(false);
  readonly rolesError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');

  ngOnInit(): void {
    void this.loadRoles();
  }

  async loadRoles(): Promise<void> {
    this.rolesLoading.set(true);
    this.rolesError.set(null);
    try {
      const roles = await this.rolesApi.list();
      this.assignableRoles.set(roles.filter((r) => r.code !== 'SUPER_ADMIN'));
    } catch (err) {
      this.rolesError.set(this.auth.problemMessage(err, 'Failed to load roles'));
    } finally {
      this.rolesLoading.set(false);
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

  async submit(): Promise<void> {
    this.formError.set('');
    if (!this.email.trim() || !this.firstName.trim() || !this.lastName.trim()) {
      this.formError.set('Email, first name, and last name are required');
      return;
    }
    this.saving.set(true);
    try {
      const created = await this.api.create({
        email: this.email.trim(),
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        phone: this.phone.trim() || undefined,
        jobTitle: this.jobTitle.trim() || undefined,
        department: this.department.trim() || undefined,
        organization: this.organization.trim() || undefined,
        city: this.city.trim() || undefined,
        country: this.country.trim() || undefined,
        preferredLanguage: this.preferredLanguage.trim() || undefined,
        timezone: this.timezone.trim() || undefined,
        bio: this.bio.trim() || undefined,
        roleCodes: [...this.selectedRoles()],
      });
      this.toasts.success('User created — invitation email sent');
      await this.router.navigate(['/users', created.id]);
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Create failed'));
    } finally {
      this.saving.set(false);
    }
  }
}
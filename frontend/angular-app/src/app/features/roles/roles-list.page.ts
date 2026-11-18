import { NgClass } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { Role } from '../../core/api/page.types';
import { RolesApi } from './roles.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiSelect } from '../../shared/ui/select/ui-select';
import { UiTable } from '../../shared/ui/table/ui-table';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';

const TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'custom', label: 'Custom' },
  { value: 'system', label: 'System' },
];

@Component({
  selector: 'app-roles-list-page',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    RouterLink,
    UiPageHeader,
    UiButton,
    UiField,
    UiInput,
    UiSelect,
    UiTable,
    UiLoadingState,
    UiErrorState,
    UiEmptyState,
  ],
  template: `
    <div class="admin-page">
      <ui-page-header
        title="Roles"
        subtitle="Group permissions into roles. Changes apply immediately to role holders."
      >
        @if (perms.has('ROLE_CREATE')) {
          <a routerLink="/roles/new"><ui-button type="button">Create role</ui-button></a>
        }
      </ui-page-header>

      <section class="admin-card">
        <div class="admin-card__head">
          <p class="admin-card__eyebrow">Authorization</p>
          <h2 class="admin-card__title">Role catalog</h2>
          <p class="admin-card__desc">
            Results update as you type. View details or open the edit form from Actions.
          </p>
        </div>
        <div class="admin-card__body">
          <div class="fp-filters">
            <ui-field label="Search" forId="roles-q">
              <ui-input
                inputId="roles-q"
                name="q"
                [(ngModel)]="q"
                (ngModelChange)="onSearchInput()"
                placeholder="Code, name, or description"
              />
            </ui-field>
            <ui-field label="Type" forId="roles-type">
              <ui-select
                inputId="roles-type"
                name="type"
                [(ngModel)]="typeFilter"
                [options]="typeOptions"
              />
            </ui-field>
          </div>

          @if (loading()) {
            <ui-loading-state />
          } @else if (error()) {
            <ui-error-state title="Failed to load roles" [message]="error()!">
              <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
            </ui-error-state>
          } @else if (!filteredRoles().length) {
            <ui-empty-state
              title="No roles found"
              message="Try a different search or create a role."
            />
          } @else {
            <ui-table>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Permissions</th>
                    <th>Users</th>
                    <th class="admin-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of filteredRoles(); track r.code) {
                    <tr>
                      <td><code>{{ r.code }}</code></td>
                      <td>{{ r.name }}</td>
                      <td>
                        <span [ngClass]="r.systemRole ? 'admin-status admin-status--warn' : 'admin-status'">
                          {{ r.systemRole ? 'System' : 'Custom' }}
                        </span>
                      </td>
                      <td>{{ r.permissionCodes.length }}</td>
                      <td>{{ r.assignedUserCount }}</td>
                      <td>
                        <div class="admin-actions">
                          <a
                            class="admin-action"
                            [routerLink]="['/roles', r.code]"
                            title="View details"
                            [attr.aria-label]="'View ' + r.code"
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
                          @if (perms.has('ROLE_UPDATE') || perms.has('ROLE_ASSIGN_PERMISSION')) {
                            <a
                              class="admin-action"
                              [routerLink]="['/roles', r.code, 'edit']"
                              title="Edit role"
                              [attr.aria-label]="'Edit ' + r.code"
                            >
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                  d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                                  stroke="currentColor"
                                  stroke-width="1.75"
                                  stroke-linejoin="round"
                                />
                                <path d="M13 6.5 17.5 11" stroke="currentColor" stroke-width="1.75" />
                              </svg>
                            </a>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </ui-table>
          }
        </div>
      </section>
    </div>
  `,
})
export class RolesListPage implements OnInit {
  private readonly api = inject(RolesApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly perms = inject(PermissionService);

  readonly typeOptions = TYPE_OPTIONS;

  q = '';
  private debouncedQ = '';
  typeFilter = '';

  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly search$ = new Subject<void>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.debouncedQ = this.q;
      });
    void this.reload();
  }

  onSearchInput(): void {
    this.search$.next();
  }

  filteredRoles(): Role[] {
    const needle = this.debouncedQ.trim().toLowerCase();
    return this.roles().filter((r) => {
      if (this.typeFilter === 'system' && !r.systemRole) return false;
      if (this.typeFilter === 'custom' && r.systemRole) return false;
      if (!needle) return true;
      return (
        r.code.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.description || '').toLowerCase().includes(needle)
      );
    });
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.roles.set(await this.api.list());
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load roles'));
    } finally {
      this.loading.set(false);
    }
  }
}
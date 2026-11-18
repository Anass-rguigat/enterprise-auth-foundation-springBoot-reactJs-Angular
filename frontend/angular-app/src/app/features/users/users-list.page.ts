import { NgClass } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { AdminUser } from '../../core/api/page.types';
import { UsersApi } from './users.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiSelect } from '../../shared/ui/select/ui-select';
import { UiTable } from '../../shared/ui/table/ui-table';
import { UiPagination } from '../../shared/ui/pagination/ui-pagination';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';

const PAGE_SIZE = 20;

function userStatusClass(status: string): string {
  if (status === 'ACTIVE') return 'admin-status admin-status--ok';
  if (status === 'PENDING_ACTIVATION') return 'admin-status admin-status--warn';
  if (status === 'DISABLED' || status === 'SUSPENDED') return 'admin-status admin-status--danger';
  return 'admin-status';
}

function loginLabel(u: AdminUser): string {
  return u.status === 'ACTIVE' && u.emailVerified ? 'Enabled' : 'Disabled';
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

@Component({
  selector: 'app-users-list-page',
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
    UiPagination,
    UiLoadingState,
    UiErrorState,
    UiEmptyState,
  ],
  template: `
    <div class="admin-page">
      <ui-page-header title="Users" subtitle="Invite people, control login access, and manage roles.">
        @if (perms.has('USER_CREATE')) {
          <a routerLink="/users/new"><ui-button type="button">Create user</ui-button></a>
        }
      </ui-page-header>

      <section class="admin-card">
        <div class="admin-card__head">
          <p class="admin-card__eyebrow">Directory</p>
          <h2 class="admin-card__title">All users</h2>
          <p class="admin-card__desc">
            Results update as you type or change status. View details or open the edit form from
            Actions.
          </p>
        </div>
        <div class="admin-card__body">
          <div class="fp-filters">
            <ui-field label="Search" forId="users-q">
              <ui-input
                inputId="users-q"
                name="q"
                [(ngModel)]="q"
                (ngModelChange)="onSearchInput()"
                placeholder="Email or name"
              />
            </ui-field>
            <ui-field label="Status" forId="users-status">
              <ui-select
                inputId="users-status"
                name="status"
                [(ngModel)]="status"
                (ngModelChange)="onStatusChange()"
                [options]="statusOptions"
                placeholder="Any status"
              />
            </ui-field>
          </div>

          @if (loading()) {
            <ui-loading-state />
          } @else if (error()) {
            <ui-error-state title="Failed to load users" [message]="error()!">
              <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
            </ui-error-state>
          } @else if (!users().length) {
            <ui-empty-state title="No users found" message="Try a different search or create a user." />
          } @else {
            <ui-table>
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Login</th>
                    <th>Roles</th>
                    <th class="users-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of users(); track u.id) {
                    <tr>
                      <td>{{ u.email }}</td>
                      <td>{{ u.firstName }} {{ u.lastName }}</td>
                      <td>
                        <span [ngClass]="userStatusClass(u.status)">{{ formatStatus(u.status) }}</span>
                      </td>
                      <td>{{ u.emailVerified ? 'Yes' : 'No' }}</td>
                      <td>{{ loginLabel(u) }}</td>
                      <td>{{ u.roles.join(', ') || '—' }}</td>
                      <td>
                        <div class="users-actions">
                          <a
                            class="users-action"
                            [routerLink]="['/users', u.id]"
                            title="View details"
                            [attr.aria-label]="'View ' + u.email"
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
                          @if (perms.has('USER_UPDATE')) {
                            <a
                              class="users-action"
                              [routerLink]="['/users', u.id, 'edit']"
                              title="Edit user"
                              [attr.aria-label]="'Edit ' + u.email"
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
export class UsersListPage implements OnInit {
  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly perms = inject(PermissionService);

  readonly userStatusClass = userStatusClass;
  readonly loginLabel = loginLabel;
  readonly formatStatus = formatStatus;
  readonly pageSize = PAGE_SIZE;

  q = '';
  private debouncedQ = '';
  status = '';
  readonly statusOptions = [
    { value: '', label: 'Any status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_ACTIVATION', label: 'Pending activation' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'DISABLED', label: 'Disabled' },
  ];

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(0);
  readonly totalPages = signal(1);
  readonly totalElements = signal(0);

  private readonly search$ = new Subject<void>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.debouncedQ = this.q;
        this.page.set(0);
        void this.reload();
      });
    void this.reload();
  }

  onSearchInput(): void {
    this.search$.next();
  }

  onStatusChange(): void {
    this.page.set(0);
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.api.list({
        q: this.debouncedQ.trim() || undefined,
        status: this.status || undefined,
        page: this.page(),
        size: PAGE_SIZE,
      });
      this.users.set(result.content);
      this.totalPages.set(Math.max(result.totalPages, 1));
      this.totalElements.set(result.totalElements);
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load users'));
    } finally {
      this.loading.set(false);
    }
  }

  goPage(oneBased: number): void {
    this.page.set(oneBased - 1);
    void this.reload();
  }
}
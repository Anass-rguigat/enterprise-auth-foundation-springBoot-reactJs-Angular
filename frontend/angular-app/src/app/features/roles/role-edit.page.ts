import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { CatalogPermission, Role } from '../../core/api/page.types';
import { PermissionsApi } from '../permissions/permissions.api';
import { RolesApi } from './roles.api';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiCheckbox } from '../../shared/ui/checkbox/ui-checkbox';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiDialog } from '../../shared/ui/dialog/ui-dialog';

@Component({
  selector: 'app-role-edit-page',
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
    UiDialog,
  ],
  template: `
    <div class="admin-page">
      <p class="fp-back">
        <a class="fp-link" [routerLink]="['/roles', roleCode]">← Back to details</a>
      </p>

      @if (loading()) {
        <ui-loading-state />
      } @else if (error()) {
        <ui-error-state title="Role not available" [message]="error()!">
          <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
        </ui-error-state>
      } @else if (role(); as r) {
        <ui-page-header [title]="'Edit ' + r.name" [subtitle]="r.code">
          @if (perms.has('ROLE_DELETE') && !r.systemRole) {
            <ui-button variant="danger" type="button" (click)="deleteOpen.set(true)">Delete role</ui-button>
          }
        </ui-page-header>

        @if (r.systemRole) {
          <section class="admin-card">
            <div class="admin-card__body">
              <p class="fp-muted" style="margin: 0">
                System roles are immutable. You can review permissions but cannot change them here.
              </p>
            </div>
          </section>
        }

        <form (ngSubmit)="save()" novalidate>
          <section class="admin-card">
            <div class="admin-card__head">
              <p class="admin-card__eyebrow">Role</p>
              <h2 class="admin-card__title">Basics</h2>
              <p class="admin-card__desc">Update the display name and description.</p>
            </div>
            <div class="admin-card__body">
              <div class="admin-grid">
                <ui-field label="Code" forId="re-code">
                  <ui-input inputId="re-code" name="code" [ngModel]="r.code" [disabled]="true" />
                </ui-field>
                <ui-field label="Name" forId="re-name">
                  <ui-input
                    inputId="re-name"
                    name="name"
                    [(ngModel)]="name"
                    [disabled]="metaDisabled()"
                    required
                  />
                </ui-field>
                <div class="admin-grid--full">
                  <ui-field label="Description" forId="re-desc">
                    <ui-input
                      inputId="re-desc"
                      name="desc"
                      [(ngModel)]="description"
                      [disabled]="metaDisabled()"
                    />
                  </ui-field>
                </div>
              </div>
            </div>
          </section>

          <section class="admin-card">
            <div class="admin-card__head">
              <p class="admin-card__eyebrow">Authorization</p>
              <h2 class="admin-card__title">Permissions</h2>
              <p class="admin-card__desc">
                {{ selected().size }} selected. Tick boxes to grant access; holders update on the next
                request.
              </p>
            </div>
            <div class="admin-card__body">
              <ui-field label="Filter permissions" forId="re-perm-q">
                <ui-input
                  inputId="re-perm-q"
                  name="permFilter"
                  [(ngModel)]="permFilter"
                  placeholder="Search code, module, or description"
                />
              </ui-field>
              <div class="admin-perm-modules">
                @for (group of permissionModules(); track group.module) {
                  <div class="admin-perm-module">
                    <div class="admin-perm-module__head">{{ group.module }}</div>
                    <div class="admin-perm-module__body">
                      @for (p of group.items; track p.code) {
                        <div class="admin-perm-chip">
                          <ui-checkbox
                            [inputId]="'re-' + p.code"
                            [name]="'re-' + p.code"
                            [ngModel]="selected().has(p.code)"
                            [disabled]="permsDisabled()"
                            (ngModelChange)="togglePermission(p.code, $event)"
                          >
                            <strong>{{ p.code }}</strong>
                            <span>{{ p.description || 'No description' }}</span>
                          </ui-checkbox>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
              @if (formError()) {
                <p class="fp-err" role="alert">{{ formError() }}</p>
              }
              <div class="fp-row">
                @if (!r.systemRole) {
                  <ui-button type="submit" [loading]="saving()">Save changes</ui-button>
                }
                <a [routerLink]="['/roles', roleCode]">
                  <ui-button variant="secondary" type="button">Cancel</ui-button>
                </a>
              </div>
            </div>
          </section>
        </form>
      }

      <ui-dialog
        [open]="deleteOpen()"
        title="Delete role?"
        confirmLabel="Delete"
        [danger]="true"
        [confirmLoading]="busy()"
        (confirm)="deleteRole()"
        (cancel)="deleteOpen.set(false)"
      >
        This fails if any users still have the role. System roles cannot be deleted.
      </ui-dialog>
    </div>
  `,
})
export class RoleEditPage implements OnInit {
  private readonly api = inject(RolesApi);
  private readonly permissionsApi = inject(PermissionsApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  readonly perms = inject(PermissionService);

  readonly role = signal<Role | null>(null);
  readonly catalog = signal<CatalogPermission[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly busy = signal(false);
  readonly formError = signal('');
  readonly deleteOpen = signal(false);
  readonly selected = signal<Set<string>>(new Set());

  roleCode = '';
  name = '';
  description = '';
  permFilter = '';

  readonly metaDisabled = computed(() => {
    const r = this.role();
    return !!r?.systemRole || !this.perms.has('ROLE_UPDATE');
  });

  readonly permsDisabled = computed(() => {
    const r = this.role();
    return !!r?.systemRole || !this.perms.has('ROLE_ASSIGN_PERMISSION');
  });

  permissionModules(): { module: string; items: CatalogPermission[] }[] {
    const needle = this.permFilter.trim().toLowerCase();
    const groups = new Map<string, CatalogPermission[]>();
    for (const p of this.catalog()) {
      if (
        needle &&
        !p.code.toLowerCase().includes(needle) &&
        !(p.description || '').toLowerCase().includes(needle) &&
        !p.module.toLowerCase().includes(needle)
      ) {
        continue;
      }
      const list = groups.get(p.module) ?? [];
      list.push(p);
      groups.set(p.module, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, items]) => ({ module, items }));
  }

  ngOnInit(): void {
    this.roleCode = this.route.snapshot.paramMap.get('roleCode') ?? '';
    void this.reload();
    void this.loadCatalog();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.api.get(this.roleCode);
      this.role.set(r);
      this.name = r.name;
      this.description = r.description ?? '';
      this.selected.set(new Set(r.permissionCodes));
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load role'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCatalog(): Promise<void> {
    if (!this.perms.has('PERMISSION_READ')) {
      return;
    }
    try {
      this.catalog.set(await this.permissionsApi.list());
    } catch {
      this.catalog.set([]);
    }
  }

  togglePermission(code: string, checked: boolean): void {
    this.selected.update((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(code);
      } else {
        next.delete(code);
      }
      return next;
    });
  }

  async save(): Promise<void> {
    const r = this.role();
    if (!r) return;
    this.saving.set(true);
    this.formError.set('');
    try {
      if (this.perms.has('ROLE_UPDATE') && !r.systemRole) {
        await this.api.update(this.roleCode, { name: this.name, description: this.description });
      }

      if (this.perms.has('ROLE_ASSIGN_PERMISSION') && !r.systemRole) {
        const current = new Set(r.permissionCodes);
        for (const code of this.selected()) {
          if (!current.has(code)) {
            await this.api.attachPermission(this.roleCode, code);
          }
        }
        for (const code of current) {
          if (!this.selected().has(code)) {
            await this.api.detachPermission(this.roleCode, code);
          }
        }
      }

      this.toasts.success('Role updated');
      await this.reload();
      await this.router.navigate(['/roles', this.roleCode]);
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not save role'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRole(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.delete(this.roleCode);
      this.toasts.success('Role deleted');
      await this.router.navigateByUrl('/roles');
    } catch (err) {
      this.toasts.danger(
        this.auth.problemMessage(err, 'Delete failed — role may still be assigned to users')
      );
      this.deleteOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }
}
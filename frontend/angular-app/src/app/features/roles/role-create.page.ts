import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogPermission } from '../../core/api/page.types';
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

function slugRoleCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return '';
  return /^[A-Z]/.test(slug) ? slug.slice(0, 64) : `R_${slug}`.slice(0, 64);
}

@Component({
  selector: 'app-role-create-page',
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
        <a class="fp-link" routerLink="/roles">← Roles</a>
      </p>
      <ui-page-header
        title="Create role"
        subtitle="Name the role, then tick the permissions it should grant."
      />

      @if (loading()) {
        <ui-loading-state />
      }
      @if (loadError()) {
        <ui-error-state title="Could not load permissions" [message]="loadError()!" />
      }

      <form (ngSubmit)="submit()" novalidate>
        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Role</p>
            <h2 class="admin-card__title">Basics</h2>
            <p class="admin-card__desc">Code is derived from the name; you can override it.</p>
          </div>
          <div class="admin-card__body">
            <div class="admin-grid">
              <ui-field label="Name" forId="rc-name">
                <ui-input
                  inputId="rc-name"
                  name="name"
                  [(ngModel)]="name"
                  (ngModelChange)="onNameChange($event)"
                  required
                />
              </ui-field>
              <ui-field label="Code" forId="rc-code" hint="[A-Z][A-Z0-9_]{1,63}">
                <ui-input
                  inputId="rc-code"
                  name="code"
                  [(ngModel)]="code"
                  (ngModelChange)="onCodeChange($event)"
                  required
                />
              </ui-field>
              <div class="admin-grid--full">
                <ui-field label="Description" forId="rc-desc">
                  <ui-input inputId="rc-desc" name="desc" [(ngModel)]="description" />
                </ui-field>
              </div>
            </div>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Authorization</p>
            <h2 class="admin-card__title">Permissions</h2>
            <p class="admin-card__desc">{{ selected().size }} selected. Grouped by module for easier scanning.</p>
          </div>
          <div class="admin-card__body">
            <ui-field label="Filter permissions" forId="rc-perm-q">
              <ui-input
                inputId="rc-perm-q"
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
                          [inputId]="'rc-' + p.code"
                          [name]="'rc-' + p.code"
                          [ngModel]="selected().has(p.code)"
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
              <ui-button type="submit" [loading]="saving()">Create role</ui-button>
              <a routerLink="/roles">
                <ui-button variant="secondary" type="button">Cancel</ui-button>
              </a>
            </div>
          </div>
        </section>
      </form>
    </div>
  `,
})
export class RoleCreatePage implements OnInit {
  private readonly api = inject(RolesApi);
  private readonly permissionsApi = inject(PermissionsApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  readonly catalog = signal<CatalogPermission[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly selected = signal<Set<string>>(new Set());

  code = '';
  name = '';
  description = '';
  permFilter = '';
  private codeTouched = false;

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
    void this.loadCatalog();
  }

  private async loadCatalog(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.catalog.set(await this.permissionsApi.list());
    } catch (err) {
      this.loadError.set(this.auth.problemMessage(err, 'Failed to load permissions'));
    } finally {
      this.loading.set(false);
    }
  }

  onNameChange(value: string): void {
    this.name = value;
    if (!this.codeTouched) {
      this.code = slugRoleCode(value);
    }
  }

  onCodeChange(value: string): void {
    this.code = value.toUpperCase();
    this.codeTouched = true;
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

  async submit(): Promise<void> {
    this.formError.set('');
    if (!this.code.trim() || !this.name.trim()) {
      this.formError.set('Code and name are required');
      return;
    }
    this.saving.set(true);
    try {
      const created = await this.api.create({
        code: this.code.trim(),
        name: this.name.trim(),
        description: this.description.trim() || undefined,
        permissionCodes: [...this.selected()],
      });
      this.toasts.success('Role created');
      await this.router.navigate(['/roles', created.code]);
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Create failed'));
    } finally {
      this.saving.set(false);
    }
  }
}
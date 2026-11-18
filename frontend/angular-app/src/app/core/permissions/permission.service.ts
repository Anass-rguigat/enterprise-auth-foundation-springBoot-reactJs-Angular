import { Injectable, computed, signal } from '@angular/core';

/**
 * UI permission gate from GET /auth/me (nav + routes). Backend @PreAuthorize remains authoritative.
 * Before /me has loaded, has/hasAny return true so shell scaffolding stays visible during boot.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly permissions = signal<readonly string[]>([]);
  readonly loaded = signal(false);

  readonly permissionSet = computed(() => new Set(this.permissions()));

  setPermissions(codes: readonly string[]): void {
    this.permissions.set([...codes]);
    this.loaded.set(true);
  }

  clear(): void {
    this.permissions.set([]);
    this.loaded.set(false);
  }

  has(code: string): boolean {
    if (!this.loaded()) {
      return true;
    }
    return this.permissionSet().has(code);
  }

  /** Empty required → visible. Before /me load → visible (Phase 19 scaffold). */
  hasAny(required?: readonly string[]): boolean {
    if (!required?.length) {
      return true;
    }
    if (!this.loaded()) {
      return true;
    }
    const set = this.permissionSet();
    return required.some((code) => set.has(code));
  }

  hasAll(required?: readonly string[]): boolean {
    if (!required?.length) {
      return true;
    }
    if (!this.loaded()) {
      return true;
    }
    const set = this.permissionSet();
    return required.every((code) => set.has(code));
  }
}

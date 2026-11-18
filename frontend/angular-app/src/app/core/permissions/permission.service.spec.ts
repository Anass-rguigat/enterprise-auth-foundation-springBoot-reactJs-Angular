import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let perms: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    perms = TestBed.inject(PermissionService);
  });

  it('shows all gates before /me load', () => {
    expect(perms.loaded()).toBe(false);
    expect(perms.has('USER_READ')).toBe(true);
    expect(perms.hasAny(['ROLE_READ'])).toBe(true);
  });

  it('enforces advisory gates after permissions are set', () => {
    perms.setPermissions(['USER_READ', 'NOTE_READ']);
    expect(perms.loaded()).toBe(true);
    expect(perms.has('USER_READ')).toBe(true);
    expect(perms.has('ROLE_READ')).toBe(false);
    expect(perms.hasAny(['ROLE_READ', 'NOTE_READ'])).toBe(true);
    expect(perms.hasAll(['USER_READ', 'NOTE_READ'])).toBe(true);
    expect(perms.hasAll(['USER_READ', 'AUDIT_READ'])).toBe(false);
  });

  it('clears loaded state on logout', () => {
    perms.setPermissions(['USER_READ']);
    perms.clear();
    expect(perms.loaded()).toBe(false);
    expect(perms.permissions()).toEqual([]);
  });
});

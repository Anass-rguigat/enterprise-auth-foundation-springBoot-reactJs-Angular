import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { PermissionService } from './permission.service';
import { RequirePermissionComponent } from './require-permission.component';

@Component({
  standalone: true,
  template: `<div>roles-ok</div>`,
})
class RolesStubPage {}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
class TestHost {}

describe('RequirePermissionComponent', () => {
  let perms: PermissionService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, RequirePermissionComponent, RolesStubPage],
      providers: [
        provideRouter([
          {
            path: 'roles',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['ROLE_READ'] },
            children: [{ path: '', component: RolesStubPage }],
          },
        ]),
      ],
    }).compileComponents();

    perms = TestBed.inject(PermissionService);
    router = TestBed.inject(Router);
  });

  async function go(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(TestHost);
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders outlet when permission is present', async () => {
    perms.setPermissions(['ROLE_READ']);
    const el = await go('/roles');
    expect(el.textContent).toContain('roles-ok');
  });

  it('shows no-access when permission is missing', async () => {
    perms.setPermissions(['USER_READ']);
    const el = await go('/roles');
    expect(el.textContent).toContain('No access');
    expect(el.textContent).not.toContain('roles-ok');
  });

  it('waits while permissions are loading', async () => {
    perms.clear();
    const el = await go('/roles');
    expect(el.textContent).toContain('Checking access…');
  });
});

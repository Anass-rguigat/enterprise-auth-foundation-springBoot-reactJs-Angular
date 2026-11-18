import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginPage } from './login.page';
import { AuthService } from '../../../core/auth/auth.service';

describe('LoginPage', () => {
  const login = vi.fn();
  const problemMessage = vi.fn((err: unknown, fallback?: string) => fallback ?? 'error');
  const status = vi.fn(() => 'authenticated' as const);

  beforeEach(async () => {
    login.mockReset();
    problemMessage.mockClear();
    status.mockReturnValue('authenticated');

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([{ path: 'dashboard', children: [] }, { path: 'mfa', children: [] }]),
        {
          provide: AuthService,
          useValue: { login, problemMessage, status },
        },
      ],
    }).compileComponents();
  });

  it('validates required fields before calling auth', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();

    await page.submit();
    expect(login).not.toHaveBeenCalled();
    expect(page.emailError()).toBeTruthy();
    expect(page.passwordError()).toBeTruthy();
  });

  it('navigates to dashboard after successful session login', async () => {
    login.mockResolvedValue('session');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.email = 'admin@example.com';
    page.password = 'secret';
    await page.submit();

    expect(login).toHaveBeenCalledWith('admin@example.com', 'secret');
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to MFA challenge when required', async () => {
    login.mockResolvedValue('mfaRequired');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.email = 'admin@example.com';
    page.password = 'secret';
    await page.submit();

    expect(navigateSpy).toHaveBeenCalledWith('/mfa');
  });

  it('shows generic failure message on login error', async () => {
    login.mockRejectedValue(new Error('nope'));
    problemMessage.mockReturnValue('Invalid email or password');

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.email = 'admin@example.com';
    page.password = 'bad';
    await page.submit();

    expect(page.formError()).toBe('Invalid email or password');
  });
});

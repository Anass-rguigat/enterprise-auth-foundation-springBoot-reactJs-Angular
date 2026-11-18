import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MfaChallengePage } from './mfa-challenge.page';
import { AuthService } from '../../../core/auth/auth.service';

describe('MfaChallengePage', () => {
  const verifyMfa = vi.fn();
  const recoverMfa = vi.fn();
  const problemMessage = vi.fn((err: unknown, fallback?: string) => fallback ?? 'error');
  const status = vi.fn(() => 'authenticated' as const);

  beforeEach(async () => {
    verifyMfa.mockReset();
    recoverMfa.mockReset();
    problemMessage.mockClear();
    status.mockReturnValue('authenticated');

    await TestBed.configureTestingModule({
      imports: [MfaChallengePage],
      providers: [
        provideRouter([{ path: 'dashboard', children: [] }]),
        {
          provide: AuthService,
          useValue: { verifyMfa, recoverMfa, problemMessage, status },
        },
      ],
    }).compileComponents();
  });

  it('requires a code before verify', async () => {
    const fixture = TestBed.createComponent(MfaChallengePage);
    const page = fixture.componentInstance;
    await page.submitTotp();
    expect(verifyMfa).not.toHaveBeenCalled();
    expect(page.codeError()).toBeTruthy();
  });

  it('verifies TOTP and navigates to dashboard', async () => {
    verifyMfa.mockResolvedValue(undefined);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(MfaChallengePage);
    const page = fixture.componentInstance;
    page.code = '123456';
    await page.submitTotp();

    expect(verifyMfa).toHaveBeenCalledWith('123456');
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('uses recovery code path', async () => {
    recoverMfa.mockResolvedValue(undefined);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(MfaChallengePage);
    const page = fixture.componentInstance;
    page.code = 'ABCD-EFGH';
    await page.submitRecovery();

    expect(recoverMfa).toHaveBeenCalledWith('ABCD-EFGH');
  });
});

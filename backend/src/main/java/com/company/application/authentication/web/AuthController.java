package com.company.application.authentication.web;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthCookieService;
import com.company.application.authentication.AuthenticatedUser;
import com.company.application.authentication.AuthenticationFailedException;
import com.company.application.authentication.AuthenticationService;
import com.company.application.authentication.LoginResult;
import com.company.application.authentication.LogoutService;
import com.company.application.authentication.RefreshService;
import com.company.application.authentication.TokenIssuanceService;
import com.company.application.authorization.PermissionQueryService;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.email.EmailVerificationService;
import com.company.application.email.web.VerifyEmailRequest;
import com.company.application.mfa.MfaService;
import com.company.application.password.PasswordResetService;
import com.company.application.password.web.ForgotPasswordRequest;
import com.company.application.password.web.ResetPasswordRequest;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationService authenticationService;
    private final RefreshService refreshService;
    private final LogoutService logoutService;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService emailVerificationService;
    private final PermissionQueryService permissionQueryService;
    private final AuthCookieService authCookieService;
    private final UserRepository userRepository;
    private final MfaService mfaService;

    public AuthController(
            AuthenticationService authenticationService,
            RefreshService refreshService,
            LogoutService logoutService,
            PasswordResetService passwordResetService,
            EmailVerificationService emailVerificationService,
            PermissionQueryService permissionQueryService,
            AuthCookieService authCookieService,
            UserRepository userRepository,
            MfaService mfaService
    ) {
        this.authenticationService = authenticationService;
        this.refreshService = refreshService;
        this.logoutService = logoutService;
        this.passwordResetService = passwordResetService;
        this.emailVerificationService = emailVerificationService;
        this.permissionQueryService = permissionQueryService;
        this.authCookieService = authCookieService;
        this.userRepository = userRepository;
        this.mfaService = mfaService;
    }

    /**
     * Sibling-host CSRF bootstrap: sets host-only CSRF cookie on the API host and returns
     * the raw token in the body for frontend in-memory storage ({@code X-XSRF-TOKEN}).
     */
    @GetMapping("/csrf")
    public CsrfTokenResponse csrf(CsrfToken csrfToken) {
        return new CsrfTokenResponse(csrfToken.getToken());
    }

    @PostMapping("/login")
    public Object login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        LoginResult result = authenticationService.login(
                request.email(),
                request.password(),
                httpRequest.getHeader("User-Agent"),
                httpRequest.getRemoteAddr()
        );
        return switch (result) {
            case LoginResult.Complete complete -> {
                authCookieService.writeAccessAndRefreshCookies(
                        httpResponse,
                        complete.tokens().accessToken(),
                        complete.tokens().refreshToken()
                );
                httpResponse.setStatus(HttpStatus.NO_CONTENT.value());
                yield null;
            }
            case LoginResult.MfaRequired mfa -> {
                authCookieService.writeMfaChallengeCookie(httpResponse, mfa.rawChallengeToken());
                httpResponse.setStatus(HttpStatus.OK.value());
                yield LoginResponse.mfaChallenge();
            }
        };
    }

    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String refreshToken = authCookieService.readRefreshToken(httpRequest);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthenticationFailedException("Invalid refresh token");
        }
        TokenIssuanceService.IssuedTokens tokens = refreshService.refresh(refreshToken);
        authCookieService.writeAccessAndRefreshCookies(httpResponse, tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        logoutService.logout(
                authCookieService.readAccessToken(httpRequest),
                authCookieService.readRefreshToken(httpRequest)
        );
        authCookieService.clearAuthCookies(httpResponse);
    }

    @PostMapping("/logout-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logoutAll(
            @AuthenticationPrincipal AuthenticatedUser principal,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        logoutService.logoutAll(
                principal.getUser().getId(),
                authCookieService.readAccessToken(httpRequest)
        );
        authCookieService.clearAuthCookies(httpResponse);
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.forgotPassword(request.email());
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.password());
    }

    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verifyEmail(request.token());
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public CurrentUserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        User user = userRepository.findByIdWithProfile(principal.getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : null;
        String lastName = user.getProfile() != null ? user.getProfile().getLastName() : null;
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                firstName,
                lastName,
                user.getStatus(),
                user.isEmailVerified(),
                user.isMustChangePassword(),
                mfaService.isEnabled(user.getId()),
                permissionQueryService.findRoleCodes(user.getId()),
                permissionQueryService.findPermissionCodes(user.getId()),
                user.getTokenVersion(),
                user.getAuthzVersion()
        );
    }
}

package com.company.application.password.web;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthCookieService;
import com.company.application.authentication.AuthenticatedUser;
import com.company.application.password.PasswordChangeService;

@RestController
@RequestMapping("/api/v1/me")
public class PasswordController {

    private final PasswordChangeService passwordChangeService;
    private final AuthCookieService authCookieService;

    public PasswordController(PasswordChangeService passwordChangeService, AuthCookieService authCookieService) {
        this.passwordChangeService = passwordChangeService;
        this.authCookieService = authCookieService;
    }

    /**
     * Changes password, clears {@code must_change_password}, bumps {@code token_version},
     * revokes all sessions, and clears auth cookies — client must re-login.
     */
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletResponse response
    ) {
        passwordChangeService.changePassword(
                principal.getUser().getId(),
                request.currentPassword(),
                request.newPassword()
        );
        authCookieService.clearAuthCookies(response);
    }
}

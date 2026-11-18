package com.company.application.email.web;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.email.EmailVerificationService;
import com.company.application.user.UserAccountService;

@RestController
@RequestMapping("/api/v1/me")
public class MeEmailController {

    private final UserAccountService userAccountService;
    private final EmailVerificationService emailVerificationService;

    public MeEmailController(
            UserAccountService userAccountService,
            EmailVerificationService emailVerificationService
    ) {
        this.userAccountService = userAccountService;
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/email-change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void beginEmailChange(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody BeginEmailChangeRequest request
    ) {
        userAccountService.beginEmailChange(principal.getUser().getId(), request.newEmail());
        emailVerificationService.startPendingEmailVerification(principal.getUser().getId());
    }
}

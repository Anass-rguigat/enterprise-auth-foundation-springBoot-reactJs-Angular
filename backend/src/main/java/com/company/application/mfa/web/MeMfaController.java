package com.company.application.mfa.web;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.mfa.MfaService;

@RestController
@RequestMapping("/api/v1/me/mfa")
public class MeMfaController {

    private final MfaService mfaService;

    public MeMfaController(MfaService mfaService) {
        this.mfaService = mfaService;
    }

    @GetMapping
    public MfaStatusResponse status(@AuthenticationPrincipal AuthenticatedUser principal) {
        MfaService.MfaStatus status = mfaService.status(principal.getUser().getId());
        return new MfaStatusResponse(status.enabled(), status.enrollmentPending(), status.unusedRecoveryCodes());
    }

    @PostMapping("/enroll")
    public MfaEnrollmentStartResponse enroll(@AuthenticationPrincipal AuthenticatedUser principal) {
        MfaService.EnrollmentStart start = mfaService.startEnrollment(principal.getUser().getId());
        return new MfaEnrollmentStartResponse(start.secretBase32(), start.otpauthUri(), start.expiresAt());
    }

    @DeleteMapping("/enroll")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelEnroll(@AuthenticationPrincipal AuthenticatedUser principal) {
        mfaService.cancelEnrollment(principal.getUser().getId());
    }

    @PostMapping("/confirm")
    public MfaRecoveryCodesResponse confirm(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody MfaConfirmRequest request
    ) {
        MfaService.ConfirmResult result = mfaService.confirmEnrollment(principal.getUser().getId(), request.code());
        return new MfaRecoveryCodesResponse(result.recoveryCodes());
    }

    @PostMapping("/recovery-codes/regenerate")
    public MfaRecoveryCodesResponse regenerateRecoveryCodes(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody MfaRegenerateRecoveryRequest request
    ) {
        List<String> codes = mfaService.regenerateRecoveryCodes(
                principal.getUser().getId(),
                request.password(),
                request.code()
        );
        return new MfaRecoveryCodesResponse(codes);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disable(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody MfaDisableRequest request
    ) {
        mfaService.disable(principal.getUser().getId(), request.password(), request.code());
    }
}

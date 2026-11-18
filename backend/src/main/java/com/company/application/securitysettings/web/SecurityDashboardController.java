package com.company.application.securitysettings.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.mfa.MfaService;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@RestController
@RequestMapping("/api/v1/me/security")
public class SecurityDashboardController {

    private final UserRepository userRepository;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final MfaService mfaService;

    public SecurityDashboardController(
            UserRepository userRepository,
            TokenFamilyRepository tokenFamilyRepository,
            MfaService mfaService
    ) {
        this.userRepository = userRepository;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.mfaService = mfaService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public SecurityOverviewResponse overview(@AuthenticationPrincipal AuthenticatedUser principal) {
        User user = userRepository.findById(principal.getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        int sessions = tokenFamilyRepository.findActiveByUserId(user.getId()).size();
        return new SecurityOverviewResponse(
                user.isEmailVerified(),
                user.getPendingEmail(),
                user.isMustChangePassword(),
                mfaService.isEnabled(user.getId()),
                sessions
        );
    }

    @GetMapping("/sessions")
    @Transactional(readOnly = true)
    public List<SessionSummaryResponse> sessions(@AuthenticationPrincipal AuthenticatedUser principal) {
        UUID currentFamily = principal.getFamilyId();
        return tokenFamilyRepository.findActiveByUserId(principal.getUser().getId()).stream()
                .map(family -> SessionSummaryResponse.from(family, currentFamily))
                .toList();
    }

    @DeleteMapping("/sessions/{familyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void revokeOwnSession(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID familyId
    ) {
        TokenFamily family = tokenFamilyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!family.getUserId().equals(principal.getUser().getId())) {
            throw new ApplicationException(ErrorCode.NOT_FOUND, "Session not found");
        }
        if (family.getId().equals(principal.getFamilyId())) {
            throw new ApplicationException(
                    ErrorCode.VALIDATION_FAILED,
                    "Use logout to end the current session"
            );
        }
        if (!family.isRevoked()) {
            family.revoke("USER_REVOKE_OWN_SESSION");
        }
    }
}

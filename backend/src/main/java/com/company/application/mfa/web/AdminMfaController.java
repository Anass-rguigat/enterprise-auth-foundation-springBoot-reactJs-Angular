package com.company.application.mfa.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authorization.Permissions;
import com.company.application.mfa.MfaService;

@RestController
@RequestMapping("/api/v1/admin/users/{userId}/mfa")
public class AdminMfaController {

    private final MfaService mfaService;

    public AdminMfaController(MfaService mfaService) {
        this.mfaService = mfaService;
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.MFA_ADMIN_RESET + "')")
    public void reset(@PathVariable UUID userId) {
        mfaService.adminReset(userId);
    }
}

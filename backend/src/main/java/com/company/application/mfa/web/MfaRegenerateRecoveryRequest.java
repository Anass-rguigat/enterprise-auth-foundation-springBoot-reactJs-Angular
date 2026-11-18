package com.company.application.mfa.web;

import jakarta.validation.constraints.NotBlank;

public record MfaRegenerateRecoveryRequest(
        @NotBlank String password,
        @NotBlank String code
) {
}

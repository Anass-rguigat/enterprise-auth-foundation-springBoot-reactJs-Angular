package com.company.application.mfa.web;

import jakarta.validation.constraints.NotBlank;

public record MfaDisableRequest(
        @NotBlank String password,
        @NotBlank String code
) {
}

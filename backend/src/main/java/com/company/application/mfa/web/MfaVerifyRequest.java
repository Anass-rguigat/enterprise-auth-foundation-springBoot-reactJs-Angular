package com.company.application.mfa.web;

import jakarta.validation.constraints.NotBlank;

public record MfaVerifyRequest(@NotBlank String code) {
}

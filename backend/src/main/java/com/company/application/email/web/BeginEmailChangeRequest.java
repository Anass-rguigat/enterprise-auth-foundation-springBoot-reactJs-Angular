package com.company.application.email.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record BeginEmailChangeRequest(
        @NotBlank @Email String newEmail
) {
}

package com.company.application.invitation.web;

import jakarta.validation.constraints.NotBlank;

public record AcceptInvitationRequest(
        @NotBlank String token,
        @NotBlank String password
) {
}

package com.company.application.authorization.web;

import jakarta.validation.constraints.Size;

/**
 * PATCH body. Omitted/null fields are unchanged. {@code description: ""} clears description.
 * Empty PATCH (both null) is rejected in the service layer.
 */
public record UpdateRoleRequest(
        @Size(max = 120)
        String name,
        @Size(max = 512)
        String description
) {
}

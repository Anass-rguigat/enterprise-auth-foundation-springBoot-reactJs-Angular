package com.company.application.authentication.web;

/**
 * Returned when password login succeeds but MFA is still required.
 */
public record LoginResponse(boolean mfaRequired) {
    public static LoginResponse mfaChallenge() {
        return new LoginResponse(true);
    }
}

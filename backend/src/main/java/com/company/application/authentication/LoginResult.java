package com.company.application.authentication;

/**
 * Login either completes with session tokens or requires MFA challenge completion.
 */
public sealed interface LoginResult {

    record Complete(TokenIssuanceService.IssuedTokens tokens) implements LoginResult {
    }

    record MfaRequired(String rawChallengeToken) implements LoginResult {
    }
}

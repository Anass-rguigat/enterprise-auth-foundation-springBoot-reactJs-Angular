package com.company.application.authentication;

import org.springframework.stereotype.Service;

import com.company.application.authentication.jwt.AccessTokenClaims;
import com.company.application.authentication.token.RevokedAccessToken;
import com.company.application.authentication.token.RevokedAccessTokenRepository;

@Service
public class AccessTokenRevocationService {

    private final RevokedAccessTokenRepository revokedAccessTokenRepository;

    public AccessTokenRevocationService(RevokedAccessTokenRepository revokedAccessTokenRepository) {
        this.revokedAccessTokenRepository = revokedAccessTokenRepository;
    }

    public void denylist(AccessTokenClaims claims, String reason) {
        if (revokedAccessTokenRepository.existsByJti(claims.jti())) {
            return;
        }
        RevokedAccessToken revoked = new RevokedAccessToken();
        revoked.setJti(claims.jti());
        revoked.setUserId(claims.subject());
        revoked.setFamilyId(claims.familyId());
        revoked.setExpiresAt(claims.expiresAt());
        revoked.setReason(reason);
        revokedAccessTokenRepository.save(revoked);
    }
}

package com.company.application.authentication;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.authentication.jwt.JwtProperties;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.jwt.JwtValidationException;
import com.company.application.authentication.jwt.RefreshTokenClaims;
import com.company.application.authentication.token.RefreshTokenEntity;
import com.company.application.authentication.token.RefreshTokenRepository;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@Service
public class RefreshService {

    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public RefreshService(
            JwtService jwtService,
            JwtProperties jwtProperties,
            TokenFamilyRepository tokenFamilyRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserRepository userRepository
    ) {
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    /**
     * Rotates refresh + issues new access. Caller must set cookies only after this method returns
     * (transaction commits before cookies).
     */
    @Transactional
    public TokenIssuanceService.IssuedTokens refresh(String rawRefreshToken) {
        RefreshTokenClaims claims;
        try {
            claims = jwtService.parseRefreshToken(rawRefreshToken);
        } catch (JwtValidationException ex) {
            throw new AuthenticationFailedException("Invalid refresh token");
        }

        TokenFamily family = tokenFamilyRepository.findByIdForUpdate(claims.familyId())
                .orElseThrow(() -> new AuthenticationFailedException("Invalid refresh token"));

        if (family.isRevoked() || !family.getUserId().equals(claims.subject())) {
            throw new AuthenticationFailedException("Invalid refresh token");
        }

        String tokenHash = TokenHashing.sha256Hex(rawRefreshToken);
        RefreshTokenEntity stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new AuthenticationFailedException("Invalid refresh token"));

        if (!stored.getFamilyId().equals(family.getId()) || !stored.getJti().equals(claims.jti())) {
            throw new AuthenticationFailedException("Invalid refresh token");
        }

        if (stored.isUsed()) {
            family.revoke("REFRESH_REUSE");
            throw new AuthenticationFailedException("Refresh token reuse detected");
        }

        User user = userRepository.findById(family.getUserId())
                .orElseThrow(() -> new AuthenticationFailedException("Invalid refresh token"));
        if (!user.getStatus().allowsLogin()) {
            throw new AuthenticationFailedException("Invalid refresh token");
        }

        Instant now = Instant.now();
        stored.markUsed();
        family.setLastUsedAt(now);

        UUID newRefreshJti = UUID.randomUUID();
        Instant refreshExpiresAt = now.plus(jwtProperties.getRefreshTokenTtl());
        String newRefreshJwt = jwtService.createRefreshToken(
                user.getId(),
                family.getId(),
                newRefreshJti,
                refreshExpiresAt
        );

        RefreshTokenEntity newRefresh = new RefreshTokenEntity();
        newRefresh.setFamilyId(family.getId());
        newRefresh.setJti(newRefreshJti);
        newRefresh.setTokenHash(TokenHashing.sha256Hex(newRefreshJwt));
        newRefresh.setExpiresAt(refreshExpiresAt);
        refreshTokenRepository.save(newRefresh);

        String accessJwt = jwtService.createAccessToken(user.getId(), family.getId(), user.getTokenVersion());
        return new TokenIssuanceService.IssuedTokens(accessJwt, newRefreshJwt, family.getId());
    }
}

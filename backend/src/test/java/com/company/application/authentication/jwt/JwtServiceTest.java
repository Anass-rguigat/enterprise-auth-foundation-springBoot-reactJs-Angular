package com.company.application.authentication.jwt;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        JwtSigningKeyProvider keyProvider = new JwtSigningKeyProvider(properties);
        jwtService = new JwtService(properties, keyProvider);
    }

    @Test
    void accessTokenContainsRequiredClaims() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();

        String token = jwtService.createAccessToken(userId, familyId, 7L);
        AccessTokenClaims claims = jwtService.parseAccessToken(token);

        assertThat(claims.subject()).isEqualTo(userId);
        assertThat(claims.familyId()).isEqualTo(familyId);
        assertThat(claims.tokenVersion()).isEqualTo(7L);
        assertThat(claims.jti()).isNotNull();
    }

    @Test
    void refreshTokenRejectedAsAccessToken() {
        UUID userId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        String refresh = jwtService.createRefreshToken(
                userId,
                familyId,
                UUID.randomUUID(),
                java.time.Instant.now().plusSeconds(60)
        );

        assertThatThrownBy(() -> jwtService.parseAccessToken(refresh))
                .isInstanceOf(JwtValidationException.class)
                .hasMessageContaining("token_use");
    }

    @Test
    void accessTokenRejectedAsRefreshToken() {
        String access = jwtService.createAccessToken(UUID.randomUUID(), UUID.randomUUID(), 0L);

        assertThatThrownBy(() -> jwtService.parseRefreshToken(access))
                .isInstanceOf(JwtValidationException.class)
                .hasMessageContaining("token_use");
    }

    @Test
    void refreshTokenContainsRequiredClaims() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        UUID jti = UUID.randomUUID();
        java.time.Instant exp = java.time.Instant.now().plusSeconds(120);

        String refresh = jwtService.createRefreshToken(userId, familyId, jti, exp);
        RefreshTokenClaims claims = jwtService.parseRefreshToken(refresh);

        assertThat(claims.subject()).isEqualTo(userId);
        assertThat(claims.familyId()).isEqualTo(familyId);
        assertThat(claims.jti()).isEqualTo(jti);
    }

    @Test
    void tamperedTokenIsRejected() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.createAccessToken(userId, UUID.randomUUID(), 0L);
        String tampered = token.substring(0, token.length() - 4) + "AAAA";

        assertThatThrownBy(() -> jwtService.parseAccessToken(tampered))
                .isInstanceOf(JwtValidationException.class);
    }
}

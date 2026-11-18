package com.company.application.authentication;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.authentication.jwt.JwtProperties;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.jwt.RefreshTokenClaims;
import com.company.application.authentication.token.RefreshTokenEntity;
import com.company.application.authentication.token.RefreshTokenRepository;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshServiceTest {

    @Mock
    private JwtService jwtService;
    @Mock
    private TokenFamilyRepository tokenFamilyRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private UserRepository userRepository;

    private RefreshService refreshService;
    private final UUID userId = UUID.randomUUID();
    private final UUID familyId = UUID.randomUUID();
    private final UUID jti = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.setRefreshTokenTtl(Duration.ofDays(7));
        refreshService = new RefreshService(
                jwtService,
                props,
                tokenFamilyRepository,
                refreshTokenRepository,
                userRepository
        );
    }

    @Test
    void reusedRefreshRevokesFamilyAndFails() throws Exception {
        when(jwtService.parseRefreshToken("old-refresh")).thenReturn(new RefreshTokenClaims(
                userId, jti, familyId, Instant.now(), Instant.now().plusSeconds(3600)
        ));
        TokenFamily family = new TokenFamily();
        family.setId(familyId);
        family.setUserId(userId);
        when(tokenFamilyRepository.findByIdForUpdate(familyId)).thenReturn(Optional.of(family));

        RefreshTokenEntity stored = new RefreshTokenEntity();
        stored.setFamilyId(familyId);
        stored.setJti(jti);
        stored.setTokenHash(TokenHashing.sha256Hex("old-refresh"));
        stored.setExpiresAt(Instant.now().plusSeconds(3600));
        stored.markUsed();
        when(refreshTokenRepository.findByTokenHash(TokenHashing.sha256Hex("old-refresh")))
                .thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> refreshService.refresh("old-refresh"))
                .isInstanceOf(AuthenticationFailedException.class)
                .hasMessageContaining("reuse");
        assertThat(family.isRevoked()).isTrue();
        assertThat(family.getRevokeReason()).isEqualTo("REFRESH_REUSE");
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void successfulRotationMarksUsedAndIssuesNewTokens() throws Exception {
        when(jwtService.parseRefreshToken("refresh-raw")).thenReturn(new RefreshTokenClaims(
                userId, jti, familyId, Instant.now(), Instant.now().plusSeconds(3600)
        ));
        TokenFamily family = new TokenFamily();
        family.setId(familyId);
        family.setUserId(userId);
        when(tokenFamilyRepository.findByIdForUpdate(familyId)).thenReturn(Optional.of(family));

        RefreshTokenEntity stored = new RefreshTokenEntity();
        stored.setFamilyId(familyId);
        stored.setJti(jti);
        stored.setTokenHash(TokenHashing.sha256Hex("refresh-raw"));
        stored.setExpiresAt(Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.findByTokenHash(TokenHashing.sha256Hex("refresh-raw")))
                .thenReturn(Optional.of(stored));

        User user = new User();
        user.setId(userId);
        user.setStatus(UserStatus.ACTIVE);
        user.setTokenVersion(0L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(jwtService.createRefreshToken(any(), any(), any(), any())).thenReturn("new-refresh");
        when(jwtService.createAccessToken(userId, familyId, 0L)).thenReturn("new-access");

        TokenIssuanceService.IssuedTokens tokens = refreshService.refresh("refresh-raw");

        assertThat(stored.isUsed()).isTrue();
        assertThat(family.getLastUsedAt()).isNotNull();
        assertThat(tokens.accessToken()).isEqualTo("new-access");
        assertThat(tokens.refreshToken()).isEqualTo("new-refresh");
        verify(refreshTokenRepository).save(any(RefreshTokenEntity.class));
    }
}

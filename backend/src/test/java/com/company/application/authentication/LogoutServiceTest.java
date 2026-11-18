package com.company.application.authentication;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.audit.AuditService;
import com.company.application.authentication.jwt.AccessTokenClaims;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.jwt.JwtValidationException;
import com.company.application.authentication.jwt.RefreshTokenClaims;
import com.company.application.authentication.token.RefreshTokenEntity;
import com.company.application.authentication.token.RefreshTokenRepository;
import com.company.application.authentication.token.RevokedAccessTokenRepository;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LogoutServiceTest {

    @Mock
    private JwtService jwtService;
    @Mock
    private TokenFamilyRepository tokenFamilyRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private RevokedAccessTokenRepository revokedAccessTokenRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AccessTokenRevocationService accessTokenRevocationService;
    @Mock
    private AuditService auditService;

    private LogoutService logoutService;

    private final UUID userId = UUID.randomUUID();
    private final UUID familyId = UUID.randomUUID();
    private final UUID refreshJti = UUID.randomUUID();
    private final UUID accessJti = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        logoutService = new LogoutService(
                jwtService,
                tokenFamilyRepository,
                refreshTokenRepository,
                revokedAccessTokenRepository,
                userRepository,
                accessTokenRevocationService,
                auditService
        );
    }

    @Test
    void validRefreshRevokesFamilyEvenWithoutAccess() throws Exception {
        stubValidRefresh("refresh-raw");

        logoutService.logout(null, "refresh-raw");

        TokenFamily family = tokenFamilyRepository.findById(familyId).orElseThrow();
        assertThat(family.isRevoked()).isTrue();
        assertThat(family.getRevokeReason()).isEqualTo("LOGOUT");
        verify(accessTokenRevocationService, never()).denylist(any(), any());
    }

    @Test
    void invalidRefreshAloneRevokesNothing() throws Exception {
        when(jwtService.parseRefreshToken("bad-refresh")).thenThrow(new JwtValidationException("bad"));

        logoutService.logout(null, "bad-refresh");

        verify(tokenFamilyRepository, never()).findById(any());
        verifyNoInteractions(accessTokenRevocationService);
    }

    @Test
    void invalidRefreshWithValidAccessRevokesAccessFamilyOnly() throws Exception {
        when(jwtService.parseRefreshToken("bad-refresh")).thenThrow(new JwtValidationException("bad"));
        stubValidAccess("access-raw");

        logoutService.logout("access-raw", "bad-refresh");

        TokenFamily family = tokenFamilyRepository.findById(familyId).orElseThrow();
        assertThat(family.isRevoked()).isTrue();
        verify(accessTokenRevocationService).denylist(any(AccessTokenClaims.class), eq("LOGOUT"));
    }

    @Test
    void mismatchedValidAccessAndRefreshRevokesNeither() throws Exception {
        UUID otherFamily = UUID.randomUUID();
        stubValidRefresh("refresh-raw");

        AccessTokenClaims accessClaims = new AccessTokenClaims(
                userId, accessJti, otherFamily, 0L, Instant.now(), Instant.now().plusSeconds(60)
        );
        when(jwtService.parseAccessToken("access-raw")).thenReturn(accessClaims);
        when(revokedAccessTokenRepository.existsByJti(accessJti)).thenReturn(false);

        TokenFamily accessFamily = activeFamily(otherFamily, userId);
        when(tokenFamilyRepository.findById(otherFamily)).thenReturn(Optional.of(accessFamily));
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser()));

        logoutService.logout("access-raw", "refresh-raw");

        assertThat(tokenFamilyRepository.findById(familyId).orElseThrow().isRevoked()).isFalse();
        assertThat(accessFamily.isRevoked()).isFalse();
        verify(accessTokenRevocationService, never()).denylist(any(), any());
    }

    @Test
    void mismatchedDifferentUsersRevokesNeither() throws Exception {
        UUID otherUser = UUID.randomUUID();
        UUID otherFamily = UUID.randomUUID();
        stubValidRefresh("refresh-raw");

        AccessTokenClaims accessClaims = new AccessTokenClaims(
                otherUser, accessJti, otherFamily, 0L, Instant.now(), Instant.now().plusSeconds(60)
        );
        when(jwtService.parseAccessToken("access-raw")).thenReturn(accessClaims);
        when(revokedAccessTokenRepository.existsByJti(accessJti)).thenReturn(false);
        TokenFamily accessFamily = activeFamily(otherFamily, otherUser);
        when(tokenFamilyRepository.findById(otherFamily)).thenReturn(Optional.of(accessFamily));
        User other = activeUser();
        other.setId(otherUser);
        when(userRepository.findById(otherUser)).thenReturn(Optional.of(other));

        logoutService.logout("access-raw", "refresh-raw");

        assertThat(tokenFamilyRepository.findById(familyId).orElseThrow().isRevoked()).isFalse();
        assertThat(accessFamily.isRevoked()).isFalse();
        verify(accessTokenRevocationService, never()).denylist(any(), any());
    }

    @Test
    void expiredAccessWithValidRefreshStillRevokesRefreshFamily() throws Exception {
        stubValidRefresh("refresh-raw");
        when(jwtService.parseAccessToken("expired-access"))
                .thenThrow(new JwtValidationException("expired"));
        AccessTokenClaims expiredClaims = new AccessTokenClaims(
                userId, accessJti, familyId, 0L, Instant.now().minusSeconds(120), Instant.now().minusSeconds(60)
        );
        when(jwtService.parseAccessTokenIgnoringExpiry("expired-access")).thenReturn(expiredClaims);

        logoutService.logout("expired-access", "refresh-raw");

        assertThat(tokenFamilyRepository.findById(familyId).orElseThrow().isRevoked()).isTrue();
        verify(accessTokenRevocationService).denylist(any(AccessTokenClaims.class), eq("LOGOUT"));
    }

    @Test
    void logoutAllBumpsTokenVersionAndRevokesFamilies() throws Exception {
        User user = activeUser();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(jwtService.parseAccessToken("access-raw")).thenReturn(new AccessTokenClaims(
                userId, accessJti, familyId, 0L, Instant.now(), Instant.now().plusSeconds(60)
        ));

        logoutService.logoutAll(userId, "access-raw");

        assertThat(user.getTokenVersion()).isEqualTo(1L);
        verify(tokenFamilyRepository).revokeAllActiveByUserId(eq(userId), any(Instant.class), eq("LOGOUT_ALL"));
        verify(accessTokenRevocationService).denylist(any(AccessTokenClaims.class), eq("LOGOUT_ALL"));
    }

    private void stubValidRefresh(String raw) throws Exception {
        RefreshTokenClaims claims = new RefreshTokenClaims(
                userId, refreshJti, familyId, Instant.now(), Instant.now().plusSeconds(3600)
        );
        when(jwtService.parseRefreshToken(raw)).thenReturn(claims);

        TokenFamily family = activeFamily(familyId, userId);
        when(tokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));

        RefreshTokenEntity entity = new RefreshTokenEntity();
        entity.setFamilyId(familyId);
        entity.setJti(refreshJti);
        entity.setTokenHash(TokenHashing.sha256Hex(raw));
        entity.setExpiresAt(Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.findByTokenHash(TokenHashing.sha256Hex(raw))).thenReturn(Optional.of(entity));
    }

    private void stubValidAccess(String raw) throws Exception {
        AccessTokenClaims claims = new AccessTokenClaims(
                userId, accessJti, familyId, 0L, Instant.now(), Instant.now().plusSeconds(60)
        );
        when(jwtService.parseAccessToken(raw)).thenReturn(claims);
        when(revokedAccessTokenRepository.existsByJti(accessJti)).thenReturn(false);

        TokenFamily family = activeFamily(familyId, userId);
        when(tokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser()));
    }

    private static TokenFamily activeFamily(UUID id, UUID owner) {
        TokenFamily family = new TokenFamily();
        family.setId(id);
        family.setUserId(owner);
        return family;
    }

    private User activeUser() {
        User user = new User();
        user.setId(userId);
        user.setEmail("u@example.com");
        user.setEmailNormalized("u@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setTokenVersion(0L);
        user.setAuthzVersion(0L);
        return user;
    }
}

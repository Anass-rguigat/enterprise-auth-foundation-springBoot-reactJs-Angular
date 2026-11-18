package com.company.application.authentication;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
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

@Service
public class LogoutService {

    private final JwtService jwtService;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RevokedAccessTokenRepository revokedAccessTokenRepository;
    private final UserRepository userRepository;
    private final AccessTokenRevocationService accessTokenRevocationService;
    private final AuditService auditService;

    public LogoutService(
            JwtService jwtService,
            TokenFamilyRepository tokenFamilyRepository,
            RefreshTokenRepository refreshTokenRepository,
            RevokedAccessTokenRepository revokedAccessTokenRepository,
            UserRepository userRepository,
            AccessTokenRevocationService accessTokenRevocationService,
            AuditService auditService
    ) {
        this.jwtService = jwtService;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.revokedAccessTokenRepository = revokedAccessTokenRepository;
        this.userRepository = userRepository;
        this.accessTokenRevocationService = accessTokenRevocationService;
        this.auditService = auditService;
    }

    /**
     * Independent credential evaluation + mismatch rule. Always safe to clear cookies after commit.
     * Does not throw for invalid credentials — returns quietly (HTTP 204 contract).
     */
    @Transactional
    public void logout(String rawAccessToken, String rawRefreshToken) {
        Optional<ValidatedRefresh> refresh = evaluateRefresh(rawRefreshToken);
        Optional<ValidatedAccess> access = evaluateAccess(rawAccessToken);

        if (refresh.isPresent() && access.isPresent()) {
            ValidatedRefresh r = refresh.get();
            ValidatedAccess a = access.get();
            if (!r.subject().equals(a.subject()) || !r.familyId().equals(a.familyId())) {
                // Mismatch: both independently valid but disagree — revoke neither.
                auditService.record(
                        AuditEventTypes.AUTH_LOGOUT,
                        AuditModules.AUTHENTICATION,
                        AuditOutcome.INFO,
                        a.subject(),
                        a.subject(),
                        Map.of("action", "mismatch_no_revoke")
                );
                return;
            }
        }

        if (refresh.isPresent()) {
            ValidatedRefresh r = refresh.get();
            revokeFamily(r.familyId(), "LOGOUT");
            denylistAccessIfMatchesFamily(rawAccessToken, r.subject(), r.familyId(), "LOGOUT");
            auditService.record(
                    AuditEventTypes.AUTH_LOGOUT,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.SUCCESS,
                    r.subject(),
                    r.subject(),
                    Map.of("familyId", r.familyId().toString(), "path", "refresh")
            );
            return;
        }

        if (access.isPresent()) {
            ValidatedAccess a = access.get();
            accessTokenRevocationService.denylist(a.claims(), "LOGOUT");
            revokeFamily(a.familyId(), "LOGOUT");
            auditService.record(
                    AuditEventTypes.AUTH_LOGOUT,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.SUCCESS,
                    a.subject(),
                    a.subject(),
                    Map.of("familyId", a.familyId().toString(), "path", "access")
            );
        }
    }

    @Transactional
    public void logoutAll(UUID userId, String rawAccessToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationFailedException("User session is not valid"));
        user.setTokenVersion(user.getTokenVersion() + 1);
        tokenFamilyRepository.revokeAllActiveByUserId(user.getId(), Instant.now(), "LOGOUT_ALL");

        tryParseAccessForDenylist(rawAccessToken).ifPresent(claims -> {
            if (claims.subject().equals(userId)) {
                accessTokenRevocationService.denylist(claims, "LOGOUT_ALL");
            }
        });
        auditService.record(
                AuditEventTypes.AUTH_LOGOUT_ALL,
                AuditModules.AUTHENTICATION,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of()
        );
    }

    Optional<ValidatedRefresh> evaluateRefresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return Optional.empty();
        }
        RefreshTokenClaims claims;
        try {
            claims = jwtService.parseRefreshToken(rawRefreshToken);
        } catch (JwtValidationException ex) {
            return Optional.empty();
        }

        Optional<TokenFamily> familyOpt = tokenFamilyRepository.findById(claims.familyId());
        if (familyOpt.isEmpty()) {
            return Optional.empty();
        }
        TokenFamily family = familyOpt.get();
        if (family.isRevoked() || !family.getUserId().equals(claims.subject())) {
            return Optional.empty();
        }

        String hash = TokenHashing.sha256Hex(rawRefreshToken);
        Optional<RefreshTokenEntity> storedOpt = refreshTokenRepository.findByTokenHash(hash);
        if (storedOpt.isEmpty()) {
            return Optional.empty();
        }
        RefreshTokenEntity stored = storedOpt.get();
        if (stored.isUsed()
                || !stored.getFamilyId().equals(family.getId())
                || !stored.getJti().equals(claims.jti())) {
            return Optional.empty();
        }

        return Optional.of(new ValidatedRefresh(claims.subject(), claims.familyId(), claims.jti()));
    }

    Optional<ValidatedAccess> evaluateAccess(String rawAccessToken) {
        if (rawAccessToken == null || rawAccessToken.isBlank()) {
            return Optional.empty();
        }
        AccessTokenClaims claims;
        try {
            claims = jwtService.parseAccessToken(rawAccessToken);
        } catch (JwtValidationException ex) {
            return Optional.empty();
        }

        if (revokedAccessTokenRepository.existsByJti(claims.jti())) {
            return Optional.empty();
        }

        Optional<TokenFamily> familyOpt = tokenFamilyRepository.findById(claims.familyId());
        if (familyOpt.isEmpty()) {
            return Optional.empty();
        }
        TokenFamily family = familyOpt.get();
        if (family.isRevoked() || !family.getUserId().equals(claims.subject())) {
            return Optional.empty();
        }

        Optional<User> userOpt = userRepository.findById(claims.subject());
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        User user = userOpt.get();
        if (!user.getStatus().allowsLogin() || user.getTokenVersion() != claims.tokenVersion()) {
            return Optional.empty();
        }

        return Optional.of(new ValidatedAccess(claims));
    }

    private void revokeFamily(UUID familyId, String reason) {
        tokenFamilyRepository.findById(familyId).ifPresent(family -> {
            if (!family.isRevoked()) {
                family.revoke(reason);
            }
        });
    }

    private void denylistAccessIfMatchesFamily(
            String rawAccessToken,
            UUID expectedSubject,
            UUID expectedFamilyId,
            String reason
    ) {
        tryParseAccessForDenylist(rawAccessToken).ifPresent(claims -> {
            if (claims.subject().equals(expectedSubject) && claims.familyId().equals(expectedFamilyId)) {
                accessTokenRevocationService.denylist(claims, reason);
            }
        });
    }

    private Optional<AccessTokenClaims> tryParseAccessForDenylist(String rawAccessToken) {
        if (rawAccessToken == null || rawAccessToken.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(jwtService.parseAccessToken(rawAccessToken));
        } catch (JwtValidationException ignored) {
            try {
                return Optional.of(jwtService.parseAccessTokenIgnoringExpiry(rawAccessToken));
            } catch (JwtValidationException ex) {
                return Optional.empty();
            }
        }
    }

    record ValidatedRefresh(UUID subject, UUID familyId, UUID jti) {
    }

    record ValidatedAccess(AccessTokenClaims claims) {
        UUID subject() {
            return claims.subject();
        }

        UUID familyId() {
            return claims.familyId();
        }
    }
}

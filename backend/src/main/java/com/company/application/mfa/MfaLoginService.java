package com.company.application.mfa;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.authentication.AuthenticationFailedException;
import com.company.application.authentication.TokenHashing;
import com.company.application.authentication.TokenIssuanceService;
import com.company.application.common.exception.ApplicationException;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

@Service
public class MfaLoginService {

    private final MfaChallengeService challengeService;
    private final MfaConfigurationRepository configurationRepository;
    private final MfaRecoveryCodeRepository recoveryCodeRepository;
    private final MfaTotpVerifier totpVerifier;
    private final MfaAttemptLimiter attemptLimiter;
    private final TokenIssuanceService tokenIssuanceService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public MfaLoginService(
            MfaChallengeService challengeService,
            MfaConfigurationRepository configurationRepository,
            MfaRecoveryCodeRepository recoveryCodeRepository,
            MfaTotpVerifier totpVerifier,
            MfaAttemptLimiter attemptLimiter,
            TokenIssuanceService tokenIssuanceService,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.challengeService = challengeService;
        this.configurationRepository = configurationRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.totpVerifier = totpVerifier;
        this.attemptLimiter = attemptLimiter;
        this.tokenIssuanceService = tokenIssuanceService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public TokenIssuanceService.IssuedTokens verifyTotp(String rawChallengeToken, String code) {
        MfaChallenge challenge = challengeService.requireUsableChallenge(rawChallengeToken);
        UUID userId = challenge.getUserId();
        attemptLimiter.checkAndRecord(userId);

        MfaConfiguration config = configurationRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new AuthenticationFailedException("MFA is not configured"));
        if (!config.isEnabled()) {
            throw new AuthenticationFailedException("MFA is not configured");
        }

        try {
            totpVerifier.acceptAgainstConfiguration(config, code);
        } catch (ApplicationException ex) {
            auditService.record(
                    AuditEventTypes.AUTH_MFA_VERIFY_FAILURE,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.FAILURE,
                    userId,
                    userId,
                    Map.of()
            );
            throw new AuthenticationFailedException("Invalid MFA code");
        }

        challengeService.consume(challenge);
        attemptLimiter.clear(userId);
        TokenIssuanceService.IssuedTokens tokens = issueSession(userId, challenge);
        auditService.record(
                AuditEventTypes.AUTH_MFA_VERIFY_SUCCESS,
                AuditModules.AUTHENTICATION,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of("familyId", tokens.familyId().toString())
        );
        return tokens;
    }

    @Transactional
    public TokenIssuanceService.IssuedTokens verifyRecoveryCode(String rawChallengeToken, String recoveryCode) {
        MfaChallenge challenge = challengeService.requireUsableChallenge(rawChallengeToken);
        UUID userId = challenge.getUserId();
        attemptLimiter.checkAndRecord(userId);

        String normalized = RecoveryCodeGenerator.normalize(recoveryCode);
        if (normalized.isBlank()) {
            auditService.record(
                    AuditEventTypes.AUTH_MFA_RECOVERY_FAILURE,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.FAILURE,
                    userId,
                    userId,
                    Map.of()
            );
            throw new AuthenticationFailedException("Invalid recovery code");
        }
        String hash = TokenHashing.sha256Hex(normalized);
        MfaRecoveryCode stored = recoveryCodeRepository.findUnusedByHashForUpdate(hash)
                .filter(c -> c.getUserId().equals(userId))
                .orElse(null);
        if (stored == null) {
            auditService.record(
                    AuditEventTypes.AUTH_MFA_RECOVERY_FAILURE,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.FAILURE,
                    userId,
                    userId,
                    Map.of()
            );
            throw new AuthenticationFailedException("Invalid recovery code");
        }
        stored.markUsed(Instant.now());

        challengeService.consume(challenge);
        attemptLimiter.clear(userId);
        TokenIssuanceService.IssuedTokens tokens = issueSession(userId, challenge);
        auditService.record(
                AuditEventTypes.AUTH_MFA_RECOVERY_SUCCESS,
                AuditModules.AUTHENTICATION,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of("familyId", tokens.familyId().toString())
        );
        return tokens;
    }

    private TokenIssuanceService.IssuedTokens issueSession(UUID userId, MfaChallenge challenge) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationFailedException("Invalid MFA challenge"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AuthenticationFailedException("Invalid MFA challenge");
        }
        return tokenIssuanceService.issueSession(user, challenge.getUserAgentHash(), challenge.getIpHash());
    }
}

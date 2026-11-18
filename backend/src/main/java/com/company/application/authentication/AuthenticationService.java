package com.company.application.authentication;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.common.util.EmailNormalizer;
import com.company.application.mfa.MfaChallengeService;
import com.company.application.mfa.MfaService;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

@Service
public class AuthenticationService {

    static final String GENERIC_LOGIN_FAILURE = "Invalid email or password";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenIssuanceService tokenIssuanceService;
    private final MfaService mfaService;
    private final MfaChallengeService mfaChallengeService;
    private final AuditService auditService;
    private final String timingPadHash;

    public AuthenticationService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TokenIssuanceService tokenIssuanceService,
            MfaService mfaService,
            MfaChallengeService mfaChallengeService,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenIssuanceService = tokenIssuanceService;
        this.mfaService = mfaService;
        this.mfaChallengeService = mfaChallengeService;
        this.auditService = auditService;
        this.timingPadHash = passwordEncoder.encode("timing-pad-not-a-real-password");
    }

    @Transactional
    public LoginResult login(String email, String password, String userAgent, String ipAddress) {
        String normalized = EmailNormalizer.normalize(email);
        Optional<User> maybeUser = userRepository.findByEmailNormalized(normalized);

        if (maybeUser.isEmpty()) {
            passwordEncoder.matches(password, timingPadHash);
            auditService.record(
                    AuditEventTypes.AUTH_LOGIN_FAILURE,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.FAILURE,
                    null,
                    null,
                    ipAddress,
                    userAgent,
                    Map.of("reason", "unknown_user")
            );
            throw new AuthenticationFailedException(GENERIC_LOGIN_FAILURE);
        }

        User user = maybeUser.get();
        boolean passwordOk = user.getPasswordHash() != null
                && passwordEncoder.matches(password, user.getPasswordHash());
        if (!passwordOk
                || user.getStatus() != UserStatus.ACTIVE
                || !user.isEmailVerified()
                || isLocked(user)) {
            auditService.record(
                    AuditEventTypes.AUTH_LOGIN_FAILURE,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.FAILURE,
                    user.getId(),
                    user.getId(),
                    ipAddress,
                    userAgent,
                    Map.of("reason", "credentials_or_status")
            );
            throw new AuthenticationFailedException(GENERIC_LOGIN_FAILURE);
        }

        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        if (passwordEncoder.upgradeEncoding(user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }

        String uaHash = hashMeta(userAgent);
        String ipHash = hashMeta(ipAddress);
        if (mfaService.isEnabled(user.getId())) {
            String challenge = mfaChallengeService.issueChallenge(user.getId(), uaHash, ipHash);
            auditService.record(
                    AuditEventTypes.AUTH_LOGIN_MFA_REQUIRED,
                    AuditModules.AUTHENTICATION,
                    AuditOutcome.INFO,
                    user.getId(),
                    user.getId(),
                    ipAddress,
                    userAgent,
                    Map.of()
            );
            return new LoginResult.MfaRequired(challenge);
        }
        TokenIssuanceService.IssuedTokens tokens = tokenIssuanceService.issueSession(user, uaHash, ipHash);
        auditService.record(
                AuditEventTypes.AUTH_LOGIN_SUCCESS,
                AuditModules.AUTHENTICATION,
                AuditOutcome.SUCCESS,
                user.getId(),
                user.getId(),
                ipAddress,
                userAgent,
                Map.of("familyId", tokens.familyId().toString())
        );
        return new LoginResult.Complete(tokens);
    }

    private static boolean isLocked(User user) {
        return user.getLockedUntil() != null && user.getLockedUntil().isAfter(java.time.Instant.now());
    }

    private static String hashMeta(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            return null;
        }
    }
}

package com.company.application.mfa;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.authentication.TokenHashing;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@Service
public class MfaService {

    private final MfaConfigurationRepository configurationRepository;
    private final MfaEnrollmentRepository enrollmentRepository;
    private final MfaRecoveryCodeRepository recoveryCodeRepository;
    private final MfaChallengeRepository challengeRepository;
    private final MfaCryptoService cryptoService;
    private final TotpService totpService;
    private final MfaTotpVerifier totpVerifier;
    private final MfaProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public MfaService(
            MfaConfigurationRepository configurationRepository,
            MfaEnrollmentRepository enrollmentRepository,
            MfaRecoveryCodeRepository recoveryCodeRepository,
            MfaChallengeRepository challengeRepository,
            MfaCryptoService cryptoService,
            TotpService totpService,
            MfaTotpVerifier totpVerifier,
            MfaProperties properties,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService
    ) {
        this.configurationRepository = configurationRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.challengeRepository = challengeRepository;
        this.cryptoService = cryptoService;
        this.totpService = totpService;
        this.totpVerifier = totpVerifier;
        this.properties = properties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(UUID userId) {
        return configurationRepository.existsByUserIdAndEnabledTrue(userId);
    }

    @Transactional(readOnly = true)
    public MfaStatus status(UUID userId) {
        boolean enabled = isEnabled(userId);
        long remaining = enabled ? recoveryCodeRepository.countByUserIdAndUsedAtIsNull(userId) : 0L;
        boolean pending = enrollmentRepository.findByUserId(userId)
                .filter(e -> !e.isExpired(Instant.now()))
                .isPresent();
        return new MfaStatus(enabled, pending, remaining);
    }

    public record MfaStatus(boolean enabled, boolean enrollmentPending, long unusedRecoveryCodes) {
    }

    public record EnrollmentStart(String secretBase32, String otpauthUri, Instant expiresAt) {
    }

    public record ConfirmResult(List<String> recoveryCodes) {
    }

    @Transactional
    public EnrollmentStart startEnrollment(UUID userId) {
        if (isEnabled(userId)) {
            throw new ApplicationException(ErrorCode.CONFLICT, "MFA is already enabled");
        }
        enrollmentRepository.deleteExpired(Instant.now());
        enrollmentRepository.deleteByUserId(userId);

        byte[] secret = totpService.generateSecret();
        MfaCryptoService.EncryptedSecret encrypted = cryptoService.encrypt(
                userId,
                MfaCryptoService.CONTEXT_ENROLLMENT,
                secret
        );
        Instant expiresAt = Instant.now().plus(properties.getEnrollmentTtl());
        MfaEnrollment enrollment = new MfaEnrollment();
        enrollment.setUserId(userId);
        enrollment.setSecretEncrypted(encrypted.ciphertext());
        enrollment.setNonce(encrypted.nonce());
        enrollment.setKekId(encrypted.kekId());
        enrollment.setExpiresAt(expiresAt);
        enrollmentRepository.save(enrollment);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        auditService.record(
                AuditEventTypes.MFA_ENROLL_START,
                AuditModules.MFA,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of()
        );
        return new EnrollmentStart(
                totpService.encodeSecret(secret),
                totpService.otpauthUri(properties.getIssuer(), user.getEmail(), secret),
                expiresAt
        );
    }

    @Transactional
    public void cancelEnrollment(UUID userId) {
        enrollmentRepository.deleteByUserId(userId);
        auditService.record(
                AuditEventTypes.MFA_ENROLL_CANCEL,
                AuditModules.MFA,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of()
        );
    }

    @Transactional
    public ConfirmResult confirmEnrollment(UUID userId, String code) {
        MfaEnrollment enrollment = enrollmentRepository.findByUserId(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.VALIDATION_FAILED, "No pending MFA enrollment"));
        if (enrollment.isExpired(Instant.now())) {
            enrollmentRepository.deleteByUserId(userId);
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "MFA enrollment expired; start again");
        }
        byte[] secret = cryptoService.decrypt(
                userId,
                MfaCryptoService.CONTEXT_ENROLLMENT,
                enrollment.getKekId(),
                enrollment.getNonce(),
                enrollment.getSecretEncrypted()
        );
        long step = totpVerifier.acceptEnrollmentSecret(userId, secret, code, null);

        MfaCryptoService.EncryptedSecret encrypted = cryptoService.encrypt(
                userId,
                MfaCryptoService.CONTEXT_CONFIGURATION,
                secret
        );
        MfaConfiguration config = configurationRepository.findById(userId).orElseGet(MfaConfiguration::new);
        config.setUserId(userId);
        config.setSecretEncrypted(encrypted.ciphertext());
        config.setNonce(encrypted.nonce());
        config.setKekId(encrypted.kekId());
        config.setEnabled(true);
        config.setEnabledAt(Instant.now());
        config.setLastTotpStep(step);
        configurationRepository.save(config);
        enrollmentRepository.deleteByUserId(userId);

        List<String> rawCodes = replaceRecoveryCodes(userId);
        auditService.record(
                AuditEventTypes.MFA_ENROLL_CONFIRM,
                AuditModules.MFA,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of("recoveryCodesIssued", rawCodes.size())
        );
        return new ConfirmResult(rawCodes);
    }

    @Transactional
    public List<String> regenerateRecoveryCodes(UUID userId, String password, String totpCode) {
        requirePassword(userId, password);
        MfaConfiguration config = requireEnabledLocked(userId);
        totpVerifier.acceptAgainstConfiguration(config, totpCode);
        List<String> codes = replaceRecoveryCodes(userId);
        auditService.record(
                AuditEventTypes.MFA_RECOVERY_REGENERATE,
                AuditModules.MFA,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of("recoveryCodesIssued", codes.size())
        );
        return codes;
    }

    @Transactional
    public void disable(UUID userId, String password, String totpCode) {
        requirePassword(userId, password);
        MfaConfiguration config = requireEnabledLocked(userId);
        totpVerifier.acceptAgainstConfiguration(config, totpCode);
        clearMfaState(userId);
        auditService.record(
                AuditEventTypes.MFA_DISABLE,
                AuditModules.MFA,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of()
        );
    }

    /**
     * Admin reset — never returns secret. Clears enrollment, configuration, recovery codes, challenges.
     */
    @Transactional
    public void adminReset(UUID userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        clearMfaState(userId);
        auditService.record(
                AuditEventTypes.MFA_ADMIN_RESET,
                AuditModules.MFA,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
    }

    private void clearMfaState(UUID userId) {
        Instant now = Instant.now();
        challengeRepository.consumeAllActiveForUser(userId, now);
        enrollmentRepository.deleteByUserId(userId);
        recoveryCodeRepository.deleteByUserId(userId);
        configurationRepository.findById(userId).ifPresent(configurationRepository::delete);
    }

    private List<String> replaceRecoveryCodes(UUID userId) {
        recoveryCodeRepository.deleteByUserId(userId);
        List<String> raw = RecoveryCodeGenerator.generate(properties.getRecoveryCodeCount());
        for (String code : raw) {
            MfaRecoveryCode entity = new MfaRecoveryCode();
            entity.setUserId(userId);
            entity.setCodeHash(TokenHashing.sha256Hex(RecoveryCodeGenerator.normalize(code)));
            recoveryCodeRepository.save(entity);
        }
        return raw;
    }

    private MfaConfiguration requireEnabledLocked(UUID userId) {
        MfaConfiguration config = configurationRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.VALIDATION_FAILED, "MFA is not enabled"));
        if (!config.isEnabled()) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "MFA is not enabled");
        }
        return config;
    }

    private void requirePassword(UUID userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid password");
        }
    }
}

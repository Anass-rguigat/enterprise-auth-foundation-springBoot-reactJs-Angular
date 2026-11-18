package com.company.application.mfa;

import java.time.Instant;
import java.util.OptionalLong;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

/**
 * Shared atomic TOTP acceptance for login verify, enrollment confirm, and disable flows.
 */
@Service
public class MfaTotpVerifier {

    private final MfaConfigurationRepository configurationRepository;
    private final MfaCryptoService cryptoService;
    private final TotpService totpService;
    private final MfaProperties properties;

    public MfaTotpVerifier(
            MfaConfigurationRepository configurationRepository,
            MfaCryptoService cryptoService,
            TotpService totpService,
            MfaProperties properties
    ) {
        this.configurationRepository = configurationRepository;
        this.cryptoService = cryptoService;
        this.totpService = totpService;
        this.properties = properties;
    }

    /**
     * Validates code against encrypted secret and atomically advances {@code last_totp_step}.
     *
     * @return accepted step
     */
    @Transactional
    public long acceptAgainstConfiguration(MfaConfiguration config, String code) {
        byte[] secret = cryptoService.decrypt(
                config.getUserId(),
                MfaCryptoService.CONTEXT_CONFIGURATION,
                config.getKekId(),
                config.getNonce(),
                config.getSecretEncrypted()
        );
        Instant now = Instant.now();
        OptionalLong step = totpService.findAcceptableStep(
                secret,
                code,
                now,
                properties.getTotpWindow(),
                config.getLastTotpStep()
        );
        if (step.isEmpty()) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid MFA code");
        }
        int updated = configurationRepository.advanceLastTotpStep(config.getUserId(), step.getAsLong(), now);
        if (updated != 1) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid MFA code");
        }
        config.setLastTotpStep(step.getAsLong());
        return step.getAsLong();
    }

    @Transactional
    public long acceptEnrollmentSecret(UUID userId, byte[] secret, String code, Long lastAcceptedStep) {
        Instant now = Instant.now();
        OptionalLong step = totpService.findAcceptableStep(
                secret,
                code,
                now,
                properties.getTotpWindow(),
                lastAcceptedStep
        );
        if (step.isEmpty()) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid MFA code");
        }
        return step.getAsLong();
    }
}

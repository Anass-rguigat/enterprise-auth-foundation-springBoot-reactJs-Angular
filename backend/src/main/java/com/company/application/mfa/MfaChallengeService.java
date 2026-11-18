package com.company.application.mfa;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.authentication.AuthenticationFailedException;
import com.company.application.authentication.TokenHashing;
import com.company.application.common.util.SecureTokenGenerator;

@Service
public class MfaChallengeService {

    private final MfaChallengeRepository challengeRepository;
    private final MfaProperties properties;

    public MfaChallengeService(MfaChallengeRepository challengeRepository, MfaProperties properties) {
        this.challengeRepository = challengeRepository;
        this.properties = properties;
    }

    @Transactional
    public String issueChallenge(UUID userId, String userAgentHash, String ipHash) {
        Instant now = Instant.now();
        challengeRepository.consumeAllActiveForUser(userId, now);

        String raw = SecureTokenGenerator.generate(32);
        MfaChallenge challenge = new MfaChallenge();
        challenge.setUserId(userId);
        challenge.setTokenHash(TokenHashing.sha256Hex(raw));
        challenge.setExpiresAt(now.plus(properties.getChallengeTtl()));
        challenge.setUserAgentHash(userAgentHash);
        challenge.setIpHash(ipHash);
        challengeRepository.save(challenge);
        return raw;
    }

    /**
     * Locks and validates challenge; does not consume yet — caller consumes after TOTP success in same TX.
     */
    @Transactional
    public MfaChallenge requireUsableChallenge(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new AuthenticationFailedException("MFA challenge required");
        }
        MfaChallenge challenge = challengeRepository.findByTokenHashForUpdate(TokenHashing.sha256Hex(rawToken))
                .orElseThrow(() -> new AuthenticationFailedException("Invalid or expired MFA challenge"));
        if (!challenge.isUsable(Instant.now())) {
            throw new AuthenticationFailedException("Invalid or expired MFA challenge");
        }
        return challenge;
    }

    @Transactional
    public void consume(MfaChallenge challenge) {
        challenge.consume(Instant.now());
    }
}

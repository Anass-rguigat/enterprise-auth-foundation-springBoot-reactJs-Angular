package com.company.application.mfa;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MfaEnrollmentPurgeJob {

    private static final Logger log = LoggerFactory.getLogger(MfaEnrollmentPurgeJob.class);

    private final MfaEnrollmentRepository enrollmentRepository;
    private final MfaChallengeRepository challengeRepository;

    public MfaEnrollmentPurgeJob(
            MfaEnrollmentRepository enrollmentRepository,
            MfaChallengeRepository challengeRepository
    ) {
        this.enrollmentRepository = enrollmentRepository;
        this.challengeRepository = challengeRepository;
    }

    @Scheduled(fixedDelayString = "${app.mfa.purge-interval-ms:300000}")
    @Transactional
    public void purgeExpired() {
        Instant now = Instant.now();
        int enrollments = enrollmentRepository.deleteExpired(now);
        int challenges = challengeRepository.deleteExpiredBefore(now.minusSeconds(3600));
        if (enrollments > 0 || challenges > 0) {
            log.info("Purged expired MFA enrollments={} challenges={}", enrollments, challenges);
        }
    }
}

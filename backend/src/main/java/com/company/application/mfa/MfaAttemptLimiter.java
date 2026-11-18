package com.company.application.mfa;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

/**
 * Single-node in-memory rate limit for MFA verify/recovery attempts.
 * Not shared across instances — document as residual risk.
 */
@Component
public class MfaAttemptLimiter {

    private final MfaProperties properties;
    private final Map<UUID, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    public MfaAttemptLimiter(MfaProperties properties) {
        this.properties = properties;
    }

    public void checkAndRecord(UUID userId) {
        Instant now = Instant.now();
        Duration window = properties.getVerifyAttemptWindow();
        int max = properties.getMaxVerifyAttemptsPerWindow();
        Deque<Instant> queue = attempts.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (queue) {
            while (!queue.isEmpty() && queue.peekFirst().isBefore(now.minus(window))) {
                queue.removeFirst();
            }
            if (queue.size() >= max) {
                throw new ApplicationException(ErrorCode.FORBIDDEN, "Too many MFA attempts; try again later");
            }
            queue.addLast(now);
        }
    }

    public void clear(UUID userId) {
        attempts.remove(userId);
    }
}

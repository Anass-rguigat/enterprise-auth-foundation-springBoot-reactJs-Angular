package com.company.application.email;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class EmailOutboxSender {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxSender.class);

    private final EmailOutboxRepository emailOutboxRepository;
    private final EmailOutboxService emailOutboxService;
    private final EmailKekProperties properties;
    private final JavaMailSender mailSender;

    public EmailOutboxSender(
            EmailOutboxRepository emailOutboxRepository,
            EmailOutboxService emailOutboxService,
            EmailKekProperties properties,
            JavaMailSender mailSender
    ) {
        this.emailOutboxRepository = emailOutboxRepository;
        this.emailOutboxService = emailOutboxService;
        this.properties = properties;
        this.mailSender = mailSender;
    }

    @Scheduled(fixedDelayString = "${app.email.outbox.poll-interval-ms:5000}")
    @Transactional
    public void poll() {
        processDue();
    }

    @Transactional
    public int processDue() {
        List<EmailOutbox> due = emailOutboxRepository.findDueForSending(EmailOutboxStatus.PENDING, Instant.now());
        int processed = 0;
        int limit = properties.getBatchSize();
        for (EmailOutbox row : due) {
            if (processed >= limit) {
                break;
            }
            sendOne(row);
            processed++;
        }
        return processed;
    }

    private void sendOne(EmailOutbox row) {
        try {
            Map<String, Object> payload = emailOutboxService.decryptPayload(row);
            String body = emailOutboxService.renderBody(row, payload);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.getMailFrom());
            message.setTo(row.getToAddress());
            message.setSubject(row.getSubject());
            message.setText(body);
            mailSender.send(message);

            row.setStatus(EmailOutboxStatus.SENT);
            row.setSentAt(Instant.now());
            row.setLastError(null);
            row.clearSensitivePayload();
            log.info("Outbox email sent id={} template={}", row.getId(), row.getTemplateCode());
        } catch (Exception ex) {
            int attempts = row.getAttempts() + 1;
            row.setAttempts(attempts);
            String sanitized = sanitizeError(ex);
            row.setLastError(sanitized);
            if (attempts >= properties.getMaxAttempts()) {
                row.setStatus(EmailOutboxStatus.FAILED);
                row.clearSensitivePayload();
                log.warn("Outbox email failed permanently id={} template={}", row.getId(), row.getTemplateCode());
            } else {
                long backoffSeconds = Math.min(3600, (long) Math.pow(2, Math.min(attempts, 10)));
                row.setNextAttemptAt(Instant.now().plus(Duration.ofSeconds(backoffSeconds)));
                log.warn("Outbox email send failed id={} attempt={} retryAt={}",
                        row.getId(), attempts, row.getNextAttemptAt());
            }
        }
    }

    private static String sanitizeError(Exception ex) {
        String message = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
        if (message.length() > 500) {
            return message.substring(0, 500);
        }
        return message;
    }
}

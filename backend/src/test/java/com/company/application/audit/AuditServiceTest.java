package com.company.application.audit;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;

import com.company.application.common.web.CorrelationIdFilter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private SecurityAuditLogRepository repository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(repository);
        lenient().when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void recordPersistsHashedMetadataAndCorrelationId() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "corr-1");
        UUID actor = UUID.randomUUID();

        auditService.record(
                AuditEventTypes.AUTH_LOGIN_SUCCESS,
                AuditModules.AUTHENTICATION,
                AuditOutcome.SUCCESS,
                actor,
                actor,
                "127.0.0.1",
                "JUnit",
                Map.of("familyId", "abc")
        );

        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);
        verify(repository).save(captor.capture());
        SecurityAuditLog saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo(AuditEventTypes.AUTH_LOGIN_SUCCESS);
        assertThat(saved.getCorrelationId()).isEqualTo("corr-1");
        assertThat(saved.getIpHash()).isNotBlank();
        assertThat(saved.getIpHash()).doesNotContain("127.0.0.1");
        assertThat(saved.getClientIp()).isEqualTo("127.0.0.1");
        assertThat(saved.getCountry()).isEqualTo("Local network");
        assertThat(saved.getMetadata()).containsEntry("familyId", "abc");
        MDC.remove(CorrelationIdFilter.MDC_KEY);
    }

    @Test
    void recordSwallowsPersistenceFailures() {
        doThrow(new RuntimeException("db down")).when(repository).save(any());

        assertThatCode(() -> auditService.record(
                AuditEventTypes.AUTH_LOGIN_FAILURE,
                AuditModules.AUTHENTICATION,
                AuditOutcome.FAILURE,
                null,
                null,
                Map.of()
        )).doesNotThrowAnyException();
    }
}

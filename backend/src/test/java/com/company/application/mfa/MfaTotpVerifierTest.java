package com.company.application.mfa;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.common.exception.ApplicationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MfaTotpVerifierTest {

    @Mock
    private MfaConfigurationRepository configurationRepository;
    @Mock
    private MfaCryptoService cryptoService;

    private TotpService totpService;
    private MfaTotpVerifier verifier;
    private final UUID userId = UUID.randomUUID();
    private byte[] secret;
    private MfaConfiguration config;

    @BeforeEach
    void setUp() {
        totpService = new TotpService();
        MfaProperties properties = new MfaProperties();
        properties.setTotpWindow(1);
        verifier = new MfaTotpVerifier(configurationRepository, cryptoService, totpService, properties);
        secret = totpService.generateSecret();
        config = new MfaConfiguration();
        config.setUserId(userId);
        config.setEnabled(true);
        config.setKekId("local-1");
        config.setNonce(new byte[12]);
        config.setSecretEncrypted(new byte[]{1, 2, 3});
        when(cryptoService.decrypt(eq(userId), eq(MfaCryptoService.CONTEXT_CONFIGURATION), any(), any(), any()))
                .thenReturn(secret);
    }

    @Test
    void acceptAdvancesLastTotpStep() {
        Instant realNow = Instant.now();
        long realStep = totpService.stepAt(realNow);
        String realCode = totpService.codeAt(secret, realStep);
        when(configurationRepository.advanceLastTotpStep(eq(userId), eq(realStep), any())).thenReturn(1);

        long accepted = verifier.acceptAgainstConfiguration(config, realCode);
        assertThat(accepted).isEqualTo(realStep);
        assertThat(config.getLastTotpStep()).isEqualTo(realStep);
    }

    @Test
    void acceptRejectsWhenConditionalUpdateLosesRace() {
        Instant realNow = Instant.now();
        long realStep = totpService.stepAt(realNow);
        String realCode = totpService.codeAt(secret, realStep);
        when(configurationRepository.advanceLastTotpStep(eq(userId), eq(realStep), any())).thenReturn(0);

        assertThatThrownBy(() -> verifier.acceptAgainstConfiguration(config, realCode))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("Invalid MFA code");
    }

    @Test
    void concurrentAcceptOfSameStepExactlyOneWinner() throws Exception {
        Instant realNow = Instant.now();
        long realStep = totpService.stepAt(realNow);
        String realCode = totpService.codeAt(secret, realStep);
        AtomicInteger updates = new AtomicInteger();
        when(configurationRepository.advanceLastTotpStep(eq(userId), eq(realStep), any())).thenAnswer(inv ->
                updates.compareAndSet(0, 1) ? 1 : 0
        );

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Future<Boolean> a = pool.submit(() -> runAccept(start, realCode));
        Future<Boolean> b = pool.submit(() -> runAccept(start, realCode));
        start.countDown();
        boolean first = a.get();
        boolean second = b.get();
        pool.shutdownNow();

        assertThat(first ^ second).isTrue();
        assertThat(updates.get()).isEqualTo(1);
    }

    private boolean runAccept(CountDownLatch start, String code) {
        try {
            start.await();
            verifier.acceptAgainstConfiguration(config, code);
            return true;
        } catch (ApplicationException | InterruptedException ex) {
            return false;
        }
    }
}

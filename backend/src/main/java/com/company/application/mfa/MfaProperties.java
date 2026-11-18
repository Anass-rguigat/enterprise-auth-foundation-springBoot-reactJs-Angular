package com.company.application.mfa;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mfa")
public class MfaProperties {

    private String issuer = "enterprise-auth-foundation";
    private Duration challengeTtl = Duration.ofMinutes(5);
    private Duration enrollmentTtl = Duration.ofMinutes(15);
    private int totpWindow = 1;
    private int recoveryCodeCount = 10;
    private int maxVerifyAttemptsPerWindow = 10;
    private Duration verifyAttemptWindow = Duration.ofMinutes(15);
    private Crypto crypto = new Crypto();

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public Duration getChallengeTtl() {
        return challengeTtl;
    }

    public void setChallengeTtl(Duration challengeTtl) {
        this.challengeTtl = challengeTtl;
    }

    public Duration getEnrollmentTtl() {
        return enrollmentTtl;
    }

    public void setEnrollmentTtl(Duration enrollmentTtl) {
        this.enrollmentTtl = enrollmentTtl;
    }

    public int getTotpWindow() {
        return totpWindow;
    }

    public void setTotpWindow(int totpWindow) {
        this.totpWindow = totpWindow;
    }

    public int getRecoveryCodeCount() {
        return recoveryCodeCount;
    }

    public void setRecoveryCodeCount(int recoveryCodeCount) {
        this.recoveryCodeCount = recoveryCodeCount;
    }

    public int getMaxVerifyAttemptsPerWindow() {
        return maxVerifyAttemptsPerWindow;
    }

    public void setMaxVerifyAttemptsPerWindow(int maxVerifyAttemptsPerWindow) {
        this.maxVerifyAttemptsPerWindow = maxVerifyAttemptsPerWindow;
    }

    public Duration getVerifyAttemptWindow() {
        return verifyAttemptWindow;
    }

    public void setVerifyAttemptWindow(Duration verifyAttemptWindow) {
        this.verifyAttemptWindow = verifyAttemptWindow;
    }

    public Crypto getCrypto() {
        return crypto;
    }

    public void setCrypto(Crypto crypto) {
        this.crypto = crypto;
    }

    public static class Crypto {
        private String currentKekId = "local-1";
        private Map<String, String> keks = new LinkedHashMap<>();

        public String getCurrentKekId() {
            return currentKekId;
        }

        public void setCurrentKekId(String currentKekId) {
            this.currentKekId = currentKekId;
        }

        public Map<String, String> getKeks() {
            return keks;
        }

        public void setKeks(Map<String, String> keks) {
            this.keks = keks;
        }
    }
}

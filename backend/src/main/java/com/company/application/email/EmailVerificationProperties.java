package com.company.application.email;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.email-verification")
public class EmailVerificationProperties {

    private Duration tokenTtl = Duration.ofMinutes(10);

    private String verifyBaseUrl = "http://localhost:5173/verify-email";

    public Duration getTokenTtl() {
        return tokenTtl;
    }

    public void setTokenTtl(Duration tokenTtl) {
        this.tokenTtl = tokenTtl;
    }

    public String getVerifyBaseUrl() {
        return verifyBaseUrl;
    }

    public void setVerifyBaseUrl(String verifyBaseUrl) {
        this.verifyBaseUrl = verifyBaseUrl;
    }
}

package com.company.application.password;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.password-reset")
public class PasswordResetProperties {

    private Duration tokenTtl = Duration.ofMinutes(10);

    private String resetBaseUrl = "http://localhost:5173/reset-password";

    public Duration getTokenTtl() {
        return tokenTtl;
    }

    public void setTokenTtl(Duration tokenTtl) {
        this.tokenTtl = tokenTtl;
    }

    public String getResetBaseUrl() {
        return resetBaseUrl;
    }

    public void setResetBaseUrl(String resetBaseUrl) {
        this.resetBaseUrl = resetBaseUrl;
    }
}

package com.company.application.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.headers")
public class SecurityHeadersProperties {

    /** Enable HSTS (production HTTPS only). */
    private boolean hstsEnabled;

    private long hstsMaxAgeSeconds = 31_536_000L;

    private boolean hstsIncludeSubdomains = true;

    public boolean isHstsEnabled() {
        return hstsEnabled;
    }

    public void setHstsEnabled(boolean hstsEnabled) {
        this.hstsEnabled = hstsEnabled;
    }

    public long getHstsMaxAgeSeconds() {
        return hstsMaxAgeSeconds;
    }

    public void setHstsMaxAgeSeconds(long hstsMaxAgeSeconds) {
        this.hstsMaxAgeSeconds = hstsMaxAgeSeconds;
    }

    public boolean isHstsIncludeSubdomains() {
        return hstsIncludeSubdomains;
    }

    public void setHstsIncludeSubdomains(boolean hstsIncludeSubdomains) {
        this.hstsIncludeSubdomains = hstsIncludeSubdomains;
    }
}

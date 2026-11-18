package com.company.application.invitation;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.invitation")
public class InvitationProperties {

    private Duration tokenTtl = Duration.ofHours(72);

    /** Frontend route that consumes the raw token query param. */
    private String acceptBaseUrl = "http://localhost:5173/invite/accept";

    public Duration getTokenTtl() {
        return tokenTtl;
    }

    public void setTokenTtl(Duration tokenTtl) {
        this.tokenTtl = tokenTtl;
    }

    public String getAcceptBaseUrl() {
        return acceptBaseUrl;
    }

    public void setAcceptBaseUrl(String acceptBaseUrl) {
        this.acceptBaseUrl = acceptBaseUrl;
    }
}

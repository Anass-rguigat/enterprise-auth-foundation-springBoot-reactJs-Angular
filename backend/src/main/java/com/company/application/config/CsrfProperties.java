package com.company.application.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.csrf")
public class CsrfProperties {

    /**
     * Cookie name on the API host. Use {@code __Host-XSRF-TOKEN} in production (Secure + Path=/).
     */
    private String cookieName = "XSRF-TOKEN";

    /**
     * Header the frontend sends from the in-memory token obtained via {@code GET /auth/csrf}.
     */
    private String headerName = "X-XSRF-TOKEN";

    public String getCookieName() {
        return cookieName;
    }

    public void setCookieName(String cookieName) {
        this.cookieName = cookieName;
    }

    public String getHeaderName() {
        return headerName;
    }

    public void setHeaderName(String headerName) {
        this.headerName = headerName;
    }
}

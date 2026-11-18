package com.company.application.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;

/**
 * Cookie CSRF repository that does not delete the cookie when Spring's deferred CSRF
 * path calls {@code saveToken(null)}. Clearing the cookie on ordinary GETs (e.g. {@code /auth/me})
 * desyncs sibling-host SPAs that keep the token in memory from {@code GET /auth/csrf}.
 */
public final class StableCookieCsrfTokenRepository implements CsrfTokenRepository {

    private final CookieCsrfTokenRepository delegate = CookieCsrfTokenRepository.withHttpOnlyFalse();

    public StableCookieCsrfTokenRepository cookieName(String cookieName) {
        delegate.setCookieName(cookieName);
        return this;
    }

    public StableCookieCsrfTokenRepository headerName(String headerName) {
        delegate.setHeaderName(headerName);
        return this;
    }

    public StableCookieCsrfTokenRepository cookieCustomizer(
            java.util.function.Consumer<org.springframework.http.ResponseCookie.ResponseCookieBuilder> customizer
    ) {
        delegate.setCookieCustomizer(customizer);
        return this;
    }

    @Override
    public CsrfToken generateToken(HttpServletRequest request) {
        return delegate.generateToken(request);
    }

    @Override
    public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
        if (token == null) {
            return;
        }
        delegate.saveToken(token, request, response);
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        return delegate.loadToken(request);
    }
}

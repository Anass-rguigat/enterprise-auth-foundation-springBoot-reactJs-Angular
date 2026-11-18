package com.company.application.config;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Forces deferred CSRF token materialization so the host-only CSRF cookie is written
 * on {@code GET /api/v1/auth/csrf} only.
 * <p>
 * Must not call {@link CsrfToken#getToken()} on other requests: that rewrites the
 * {@code XSRF-TOKEN} cookie and desyncs the SPA's in-memory token (sibling-host CSRF),
 * which then breaks the next mutation (e.g. {@code POST /me/password} after {@code GET /auth/me}).
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    private static final String CSRF_BOOTSTRAP_PATH = "/api/v1/auth/csrf";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (CSRF_BOOTSTRAP_PATH.equals(request.getRequestURI())) {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                csrfToken.getToken();
            }
        }
        filterChain.doFilter(request, response);
    }
}

package com.company.application.config;

import java.io.IOException;
import java.net.URI;
import java.util.Locale;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.ObjectMapper;

/**
 * Defense-in-depth for cookie-authenticated SPAs on sibling hosts.
 * Unsafe methods must present an allowlisted {@code Origin}, or when Origin is absent
 * an allowlisted {@code Referer}. CORS alone is not CSRF protection.
 */
public class OriginAllowlistFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final CorsProperties corsProperties;
    private final ObjectMapper objectMapper;

    public OriginAllowlistFilter(CorsProperties corsProperties, ObjectMapper objectMapper) {
        this.corsProperties = corsProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        if (method != null && SAFE_METHODS.contains(method.toUpperCase(Locale.ROOT))) {
            return true;
        }
        String path = request.getRequestURI();
        return path.startsWith("/actuator");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            if (isAllowedOrigin(origin.trim())) {
                filterChain.doFilter(request, response);
                return;
            }
            writeForbidden(response, "Origin is not allowlisted");
            return;
        }

        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            String refererOrigin = extractOrigin(referer.trim());
            if (refererOrigin != null && isAllowedOrigin(refererOrigin)) {
                filterChain.doFilter(request, response);
                return;
            }
            writeForbidden(response, "Referer is not allowlisted");
            return;
        }

        writeForbidden(response, "Origin or allowlisted Referer is required");
    }

    private boolean isAllowedOrigin(String origin) {
        return corsProperties.getAllowedOrigins().contains(origin);
    }

    static String extractOrigin(String referer) {
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            StringBuilder origin = new StringBuilder();
            origin.append(uri.getScheme()).append("://").append(uri.getHost());
            if (uri.getPort() != -1) {
                origin.append(':').append(uri.getPort());
            }
            return origin.toString();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void writeForbidden(HttpServletResponse response, String detail) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), java.util.Map.of(
                "title", "FORBIDDEN",
                "errorCode", "ORIGIN_REJECTED",
                "detail", detail,
                "status", 403
        ));
    }
}

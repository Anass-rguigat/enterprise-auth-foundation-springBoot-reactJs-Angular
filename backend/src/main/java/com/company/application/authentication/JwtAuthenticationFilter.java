package com.company.application.authentication;

import java.io.IOException;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.company.application.authentication.jwt.AccessTokenClaims;
import com.company.application.authentication.jwt.AuthCookieProperties;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.jwt.JwtValidationException;
import com.company.application.authentication.token.RevokedAccessTokenRepository;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.authorization.PermissionQueryService;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import tools.jackson.databind.ObjectMapper;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Set<String> MUST_CHANGE_PASSWORD_ALLOWLIST = Set.of(
            "/api/v1/auth/me",
            "/api/v1/auth/logout",
            "/api/v1/auth/logout-all",
            "/api/v1/auth/refresh",
            "/api/v1/auth/csrf",
            "/api/v1/me/password"
    );

    private final JwtService jwtService;
    private final AuthCookieProperties cookieProperties;
    private final RevokedAccessTokenRepository revokedAccessTokenRepository;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final UserRepository userRepository;
    private final PermissionQueryService permissionQueryService;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            AuthCookieProperties cookieProperties,
            RevokedAccessTokenRepository revokedAccessTokenRepository,
            TokenFamilyRepository tokenFamilyRepository,
            UserRepository userRepository,
            PermissionQueryService permissionQueryService,
            ObjectMapper objectMapper
    ) {
        this.jwtService = jwtService;
        this.cookieProperties = cookieProperties;
        this.revokedAccessTokenRepository = revokedAccessTokenRepository;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.userRepository = userRepository;
        this.permissionQueryService = permissionQueryService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // refresh/logout must not fail-closed on an expired access cookie; they evaluate credentials themselves
        return path.startsWith("/actuator")
                || path.equals("/api/v1/auth/login")
                || path.equals("/api/v1/auth/mfa/verify")
                || path.equals("/api/v1/auth/mfa/recover")
                || path.equals("/api/v1/auth/csrf")
                || path.equals("/api/v1/auth/refresh")
                || path.equals("/api/v1/auth/logout")
                || path.equals("/api/v1/invitations/accept")
                || path.equals("/api/v1/auth/forgot-password")
                || path.equals("/api/v1/auth/reset-password")
                || path.equals("/api/v1/auth/verify-email")
                || path.equals("/api/v1/meta/info")
                || path.startsWith("/api/v1/_demo");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String rawToken = readCookie(request, cookieProperties.getAccessTokenName());
        if (rawToken == null || rawToken.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            AccessTokenClaims claims = jwtService.parseAccessToken(rawToken);

            if (revokedAccessTokenRepository.existsByJti(claims.jti())) {
                writeUnauthorized(response, "Access token revoked");
                return;
            }

            TokenFamily family = tokenFamilyRepository.findById(claims.familyId()).orElse(null);
            if (family == null || family.isRevoked() || !family.getUserId().equals(claims.subject())) {
                writeUnauthorized(response, "Token family is not valid");
                return;
            }

            User user = userRepository.findById(claims.subject()).orElse(null);
            if (user == null || !user.getStatus().allowsLogin() || user.getTokenVersion() != claims.tokenVersion()) {
                writeUnauthorized(response, "User session is not valid");
                return;
            }

            if (user.isMustChangePassword() && !isAllowedWhileMustChangePassword(request)) {
                writePasswordChangeRequired(response);
                return;
            }

            // Permissions loaded from DB every request (no cache; fail-closed on DB errors)
            Collection<? extends GrantedAuthority> authorities =
                    permissionQueryService.getAuthorities(user.getId());
            AuthenticatedUser principal = new AuthenticatedUser(user, claims.familyId(), claims.jti(), authorities);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (JwtValidationException ex) {
            writeUnauthorized(response, "Invalid access token");
        } catch (DataAccessException ex) {
            writeServiceUnavailable(response);
        }
    }

    private boolean isAllowedWhileMustChangePassword(HttpServletRequest request) {
        String path = request.getRequestURI();
        return MUST_CHANGE_PASSWORD_ALLOWLIST.contains(path);
    }

    private static String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void writeUnauthorized(HttpServletResponse response, String detail) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem("UNAUTHORIZED", detail, 401));
    }

    private void writePasswordChangeRequired(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                problem("PASSWORD_CHANGE_REQUIRED", "Password change is required before continuing", 403)
        );
    }

    private void writeServiceUnavailable(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                problem("SERVICE_UNAVAILABLE", "Authentication dependency unavailable", 503)
        );
    }

    private static java.util.Map<String, Object> problem(String code, String detail, int status) {
        return java.util.Map.of(
                "title", code,
                "errorCode", code,
                "detail", detail,
                "status", status
        );
    }
}

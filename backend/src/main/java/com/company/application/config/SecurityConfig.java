package com.company.application.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.company.application.administration.BootstrapProperties;
import com.company.application.audit.AuditProperties;
import com.company.application.authentication.JwtAuthenticationFilter;
import com.company.application.authentication.jwt.AuthCookieProperties;
import com.company.application.authentication.jwt.JwtProperties;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.token.RevokedAccessTokenRepository;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.authorization.PermissionQueryService;
import com.company.application.email.EmailKekProperties;
import com.company.application.email.EmailVerificationProperties;
import com.company.application.invitation.InvitationProperties;
import com.company.application.mfa.MfaProperties;
import com.company.application.password.PasswordResetProperties;
import com.company.application.user.UserRepository;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties({
        JwtProperties.class,
        AuthCookieProperties.class,
        CorsProperties.class,
        CsrfProperties.class,
        SecurityHeadersProperties.class,
        BootstrapProperties.class,
        InvitationProperties.class,
        EmailKekProperties.class,
        EmailVerificationProperties.class,
        PasswordResetProperties.class,
        MfaProperties.class,
        AuditProperties.class
})
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(
            JwtService jwtService,
            AuthCookieProperties cookieProperties,
            RevokedAccessTokenRepository revokedAccessTokenRepository,
            TokenFamilyRepository tokenFamilyRepository,
            UserRepository userRepository,
            PermissionQueryService permissionQueryService,
            ObjectMapper objectMapper
    ) {
        return new JwtAuthenticationFilter(
                jwtService,
                cookieProperties,
                revokedAccessTokenRepository,
                tokenFamilyRepository,
                userRepository,
                permissionQueryService,
                objectMapper
        );
    }

    @Bean
    OriginAllowlistFilter originAllowlistFilter(CorsProperties corsProperties, ObjectMapper objectMapper) {
        return new OriginAllowlistFilter(corsProperties, objectMapper);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties) {
        if (corsProperties.isAllowCredentials()
                && corsProperties.getAllowedOrigins().stream().anyMatch("*"::equals)) {
            throw new IllegalStateException("Credentialed CORS must not use wildcard origins");
        }
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsProperties.getAllowedOrigins());
        config.setAllowedMethods(corsProperties.getAllowedMethods());
        config.setAllowedHeaders(corsProperties.getAllowedHeaders());
        config.setExposedHeaders(corsProperties.getExposedHeaders());
        config.setAllowCredentials(corsProperties.isAllowCredentials());
        config.setMaxAge(corsProperties.getMaxAgeSeconds());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            OriginAllowlistFilter originAllowlistFilter,
            AuthCookieProperties cookieProperties,
            CsrfProperties csrfProperties,
            SecurityHeadersProperties securityHeadersProperties
    ) throws Exception {
        // Keep deferred CSRF loading (default). Do NOT call setCsrfRequestAttributeName(null):
        // that eagerly resolves the token on every request and rewrites XSRF-TOKEN.
        // StableCookieCsrfTokenRepository ignores saveToken(null) so deferred unused tokens
        // do not clear the cookie on GETs like /auth/me (sibling-host memory CSRF).
        // Materialization for bootstrap is AuthController (+ CsrfCookieFilter) on /auth/csrf.
        StableCookieCsrfTokenRepository csrfTokenRepository = new StableCookieCsrfTokenRepository()
                .cookieName(csrfProperties.getCookieName())
                .headerName(csrfProperties.getHeaderName())
                .cookieCustomizer(cookie -> cookie
                        .secure(cookieProperties.isSecure())
                        .path("/")
                        .sameSite("Lax")
                );
        CsrfTokenRequestAttributeHandler csrfRequestHandler = new CsrfTokenRequestAttributeHandler();

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(csrfRequestHandler)
                        .ignoringRequestMatchers("/actuator/**")
                )
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> {
                    headers
                            .contentTypeOptions(Customizer.withDefaults())
                            .frameOptions(frame -> frame.deny())
                            .referrerPolicy(referrer -> referrer.policy(
                                    ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                            ))
                            .permissionsPolicyHeader(permissions -> permissions.policy(
                                    "camera=(), microphone=(), geolocation=()"
                            ))
                            .cacheControl(Customizer.withDefaults());
                    if (securityHeadersProperties.isHstsEnabled()) {
                        headers.httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(securityHeadersProperties.isHstsIncludeSubdomains())
                                .maxAgeInSeconds(securityHeadersProperties.getHstsMaxAgeSeconds())
                        );
                    } else {
                        headers.httpStrictTransportSecurity(hsts -> hsts.disable());
                    }
                })
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/mfa/verify").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/mfa/recover").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/invitations/accept").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/forgot-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/meta/info").permitAll()
                        .requestMatchers("/api/v1/_demo/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(originAllowlistFilter, CsrfFilter.class)
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}

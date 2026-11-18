package com.company.application.authentication;

import java.time.Duration;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import com.company.application.authentication.jwt.AuthCookieProperties;
import com.company.application.authentication.jwt.JwtProperties;
import com.company.application.mfa.MfaProperties;

@Service
public class AuthCookieService {

    private final AuthCookieProperties cookieProperties;
    private final JwtProperties jwtProperties;
    private final MfaProperties mfaProperties;

    public AuthCookieService(
            AuthCookieProperties cookieProperties,
            JwtProperties jwtProperties,
            MfaProperties mfaProperties
    ) {
        this.cookieProperties = cookieProperties;
        this.jwtProperties = jwtProperties;
        this.mfaProperties = mfaProperties;
    }

    public void writeAccessAndRefreshCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(
                cookieProperties.getAccessTokenName(),
                accessToken,
                jwtProperties.getAccessTokenTtl(),
                cookieProperties.getPath(),
                "Lax"
        ).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(
                cookieProperties.getRefreshTokenName(),
                refreshToken,
                jwtProperties.getRefreshTokenTtl(),
                cookieProperties.getPath(),
                "Strict"
        ).toString());
        clearMfaChallengeCookie(response);
    }

    public void writeMfaChallengeCookie(HttpServletResponse response, String rawChallengeToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(
                cookieProperties.getMfaChallengeTokenName(),
                rawChallengeToken,
                mfaProperties.getChallengeTtl(),
                cookieProperties.getMfaChallengePath(),
                "Strict"
        ).toString());
    }

    public void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie(
                cookieProperties.getAccessTokenName(), cookieProperties.getPath(), "Lax").toString());
        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie(
                cookieProperties.getRefreshTokenName(), cookieProperties.getPath(), "Strict").toString());
        clearMfaChallengeCookie(response);
    }

    public void clearMfaChallengeCookie(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie(
                cookieProperties.getMfaChallengeTokenName(),
                cookieProperties.getMfaChallengePath(),
                "Strict"
        ).toString());
    }

    public String readAccessToken(HttpServletRequest request) {
        return readCookie(request, cookieProperties.getAccessTokenName());
    }

    public String readRefreshToken(HttpServletRequest request) {
        return readCookie(request, cookieProperties.getRefreshTokenName());
    }

    public String readMfaChallengeToken(HttpServletRequest request) {
        return readCookie(request, cookieProperties.getMfaChallengeTokenName());
    }

    public static String readCookie(HttpServletRequest request, String name) {
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

    private ResponseCookie buildCookie(String name, String value, Duration maxAge, String path, String sameSite) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieProperties.isSecure())
                .path(path)
                .sameSite(sameSite)
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie clearCookie(String name, String path, String sameSite) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(cookieProperties.isSecure())
                .path(path)
                .sameSite(sameSite)
                .maxAge(Duration.ZERO)
                .build();
    }
}

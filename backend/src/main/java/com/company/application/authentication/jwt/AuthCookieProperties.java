package com.company.application.authentication.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.cookies")
public class AuthCookieProperties {

    private String accessTokenName = "access_token";
    private String refreshTokenName = "refresh_token";
    private String mfaChallengeTokenName = "mfa_challenge";
    private boolean secure;
    private String sameSite = "Lax";
    private String path = "/";
    /** Path for MFA challenge cookie; __Host- cookies must use {@code /}. */
    private String mfaChallengePath = "/api/v1/auth/mfa";

    public String getAccessTokenName() {
        return accessTokenName;
    }

    public void setAccessTokenName(String accessTokenName) {
        this.accessTokenName = accessTokenName;
    }

    public String getRefreshTokenName() {
        return refreshTokenName;
    }

    public void setRefreshTokenName(String refreshTokenName) {
        this.refreshTokenName = refreshTokenName;
    }

    public String getMfaChallengeTokenName() {
        return mfaChallengeTokenName;
    }

    public void setMfaChallengeTokenName(String mfaChallengeTokenName) {
        this.mfaChallengeTokenName = mfaChallengeTokenName;
    }

    public String getMfaChallengePath() {
        return mfaChallengePath;
    }

    public void setMfaChallengePath(String mfaChallengePath) {
        this.mfaChallengePath = mfaChallengePath;
    }

    public boolean isSecure() {
        return secure;
    }

    public void setSecure(boolean secure) {
        this.secure = secure;
    }

    public String getSameSite() {
        return sameSite;
    }

    public void setSameSite(String sameSite) {
        this.sameSite = sameSite;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}

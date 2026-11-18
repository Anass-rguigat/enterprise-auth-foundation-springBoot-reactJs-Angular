package com.company.application.mfa.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthCookieService;
import com.company.application.authentication.TokenIssuanceService;
import com.company.application.mfa.MfaLoginService;

@RestController
@RequestMapping("/api/v1/auth/mfa")
public class AuthMfaController {

    private final MfaLoginService mfaLoginService;
    private final AuthCookieService authCookieService;

    public AuthMfaController(MfaLoginService mfaLoginService, AuthCookieService authCookieService) {
        this.mfaLoginService = mfaLoginService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/verify")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(
            @Valid @RequestBody MfaVerifyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        TokenIssuanceService.IssuedTokens tokens = mfaLoginService.verifyTotp(
                authCookieService.readMfaChallengeToken(httpRequest),
                request.code()
        );
        authCookieService.writeAccessAndRefreshCookies(httpResponse, tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/recover")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recover(
            @Valid @RequestBody MfaVerifyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        TokenIssuanceService.IssuedTokens tokens = mfaLoginService.verifyRecoveryCode(
                authCookieService.readMfaChallengeToken(httpRequest),
                request.code()
        );
        authCookieService.writeAccessAndRefreshCookies(httpResponse, tokens.accessToken(), tokens.refreshToken());
    }
}

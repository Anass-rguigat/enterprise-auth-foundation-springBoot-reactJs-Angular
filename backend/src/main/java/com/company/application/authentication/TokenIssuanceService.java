package com.company.application.authentication;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.authentication.jwt.JwtProperties;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.token.RefreshTokenEntity;
import com.company.application.authentication.token.RefreshTokenRepository;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.user.User;

@Service
public class TokenIssuanceService {

    private final TokenFamilyRepository tokenFamilyRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    public TokenIssuanceService(
            TokenFamilyRepository tokenFamilyRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            JwtProperties jwtProperties
    ) {
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
    }

    @Transactional
    public IssuedTokens issueSession(User user, String userAgentHash, String ipHash) {
        TokenFamily family = new TokenFamily();
        family.setId(UUID.randomUUID());
        family.setUserId(user.getId());
        family.setUserAgentHash(userAgentHash);
        family.setIpHash(ipHash);
        tokenFamilyRepository.save(family);

        UUID refreshJti = UUID.randomUUID();
        Instant refreshExpiresAt = Instant.now().plus(jwtProperties.getRefreshTokenTtl());
        String refreshJwt = jwtService.createRefreshToken(user.getId(), family.getId(), refreshJti, refreshExpiresAt);

        RefreshTokenEntity refreshEntity = new RefreshTokenEntity();
        refreshEntity.setFamilyId(family.getId());
        refreshEntity.setJti(refreshJti);
        refreshEntity.setTokenHash(TokenHashing.sha256Hex(refreshJwt));
        refreshEntity.setExpiresAt(refreshExpiresAt);
        refreshTokenRepository.save(refreshEntity);

        String accessJwt = jwtService.createAccessToken(user.getId(), family.getId(), user.getTokenVersion());
        return new IssuedTokens(accessJwt, refreshJwt, family.getId());
    }

    public record IssuedTokens(String accessToken, String refreshToken, UUID familyId) {
    }
}

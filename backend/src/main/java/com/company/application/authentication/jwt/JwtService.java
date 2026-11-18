package com.company.application.authentication.jwt;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public static final String CLAIM_TOKEN_USE = "token_use";
    public static final String CLAIM_FAMILY_ID = "fid";
    public static final String CLAIM_TOKEN_VERSION = "tv";
    public static final String TOKEN_USE_ACCESS = "access";
    public static final String TOKEN_USE_REFRESH = "refresh";

    private final JwtProperties properties;
    private final JwtSigningKeyProvider keyProvider;

    public JwtService(JwtProperties properties, JwtSigningKeyProvider keyProvider) {
        this.properties = properties;
        this.keyProvider = keyProvider;
    }

    public String createAccessToken(UUID userId, UUID familyId, long tokenVersion) {
        Instant now = Instant.now();
        Instant exp = now.plus(properties.getAccessTokenTtl());
        UUID jti = UUID.randomUUID();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(userId.toString())
                .jwtID(jti.toString())
                .issuer(properties.getIssuer())
                .audience(properties.getAudience())
                .issueTime(Date.from(now))
                .notBeforeTime(Date.from(now.minus(properties.getClockSkew())))
                .expirationTime(Date.from(exp))
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_ACCESS)
                .claim(CLAIM_FAMILY_ID, familyId.toString())
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .build();

        return sign(claims);
    }

    public String createRefreshToken(UUID userId, UUID familyId, UUID jti, Instant expiresAt) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(userId.toString())
                .jwtID(jti.toString())
                .issuer(properties.getIssuer())
                .audience(properties.getAudience())
                .issueTime(Date.from(now))
                .notBeforeTime(Date.from(now.minus(properties.getClockSkew())))
                .expirationTime(Date.from(expiresAt))
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_REFRESH)
                .claim(CLAIM_FAMILY_ID, familyId.toString())
                .build();
        return sign(claims);
    }

    public AccessTokenClaims parseAccessToken(String token) throws JwtValidationException {
        SignedJWT jwt = parseAndVerify(token);
        JWTClaimsSet claims = claimsOrThrow(jwt);
        requireTokenUse(claims, TOKEN_USE_ACCESS);
        return toAccessClaims(claims);
    }

    /**
     * Signature and claim structure only — expiry is not enforced.
     * Used when deciding whether a foreign access JTI may be denylisted during logout.
     */
    public AccessTokenClaims parseAccessTokenIgnoringExpiry(String token) throws JwtValidationException {
        SignedJWT jwt = parseAndVerifySignatureOnly(token);
        JWTClaimsSet claims = claimsOrThrow(jwt);
        requireTokenUse(claims, TOKEN_USE_ACCESS);
        validateStandardClaimsIgnoringExpiry(claims);
        return toAccessClaims(claims);
    }

    public RefreshTokenClaims parseRefreshToken(String token) throws JwtValidationException {
        SignedJWT jwt = parseAndVerify(token);
        JWTClaimsSet claims = claimsOrThrow(jwt);
        requireTokenUse(claims, TOKEN_USE_REFRESH);
        try {
            return new RefreshTokenClaims(
                    UUID.fromString(claims.getSubject()),
                    UUID.fromString(claims.getJWTID()),
                    UUID.fromString(claims.getStringClaim(CLAIM_FAMILY_ID)),
                    claims.getIssueTime().toInstant(),
                    claims.getExpirationTime().toInstant()
            );
        } catch (Exception ex) {
            throw new JwtValidationException("Invalid refresh token claims", ex);
        }
    }

    public SignedJWT parseAndVerify(String token) throws JwtValidationException {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            JWSAlgorithm algorithm = jwt.getHeader().getAlgorithm();
            if (!JWSAlgorithm.ES256.equals(algorithm)) {
                throw new JwtValidationException("Disallowed JWT algorithm: " + algorithm);
            }
            boolean verified = false;
            for (var key : keyProvider.verificationKeys()) {
                if (jwt.verify(new ECDSAVerifier(key.toECPublicKey()))) {
                    verified = true;
                    break;
                }
            }
            if (!verified) {
                throw new JwtValidationException("JWT signature verification failed");
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            validateStandardClaims(claims);
            return jwt;
        } catch (JwtValidationException ex) {
            throw ex;
        } catch (ParseException ex) {
            throw new JwtValidationException("Invalid JWT", ex);
        } catch (Exception ex) {
            throw new JwtValidationException("JWT validation failed", ex);
        }
    }

    private SignedJWT parseAndVerifySignatureOnly(String token) throws JwtValidationException {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            JWSAlgorithm algorithm = jwt.getHeader().getAlgorithm();
            if (!JWSAlgorithm.ES256.equals(algorithm)) {
                throw new JwtValidationException("Disallowed JWT algorithm: " + algorithm);
            }
            boolean verified = false;
            for (var key : keyProvider.verificationKeys()) {
                if (jwt.verify(new ECDSAVerifier(key.toECPublicKey()))) {
                    verified = true;
                    break;
                }
            }
            if (!verified) {
                throw new JwtValidationException("JWT signature verification failed");
            }
            return jwt;
        } catch (JwtValidationException ex) {
            throw ex;
        } catch (ParseException ex) {
            throw new JwtValidationException("Invalid JWT", ex);
        } catch (Exception ex) {
            throw new JwtValidationException("JWT validation failed", ex);
        }
    }

    private AccessTokenClaims toAccessClaims(JWTClaimsSet claims) throws JwtValidationException {
        try {
            return new AccessTokenClaims(
                    UUID.fromString(claims.getSubject()),
                    UUID.fromString(claims.getJWTID()),
                    UUID.fromString(claims.getStringClaim(CLAIM_FAMILY_ID)),
                    claims.getLongClaim(CLAIM_TOKEN_VERSION),
                    claims.getIssueTime().toInstant(),
                    claims.getExpirationTime().toInstant()
            );
        } catch (Exception ex) {
            throw new JwtValidationException("Invalid access token claims", ex);
        }
    }

    private void validateStandardClaims(JWTClaimsSet claims) throws JwtValidationException {
        validateStandardClaimsIgnoringExpiry(claims);
        Instant now = Instant.now();
        if (claims.getExpirationTime() == null
                || claims.getExpirationTime().toInstant().plus(properties.getClockSkew()).isBefore(now)) {
            throw new JwtValidationException("Token expired");
        }
    }

    private void validateStandardClaimsIgnoringExpiry(JWTClaimsSet claims) throws JwtValidationException {
        Instant now = Instant.now();
        if (claims.getIssuer() == null || !properties.getIssuer().equals(claims.getIssuer())) {
            throw new JwtValidationException("Invalid issuer");
        }
        List<String> audience = claims.getAudience();
        if (audience == null || !audience.contains(properties.getAudience())) {
            throw new JwtValidationException("Invalid audience");
        }
        if (claims.getNotBeforeTime() != null
                && claims.getNotBeforeTime().toInstant().minus(properties.getClockSkew()).isAfter(now)) {
            throw new JwtValidationException("Token not yet valid");
        }
        if (claims.getSubject() == null || claims.getJWTID() == null) {
            throw new JwtValidationException("Missing subject or jti");
        }
        if (claims.getExpirationTime() == null) {
            throw new JwtValidationException("Missing expiration");
        }
    }

    private void requireTokenUse(JWTClaimsSet claims, String expected) throws JwtValidationException {
        try {
            String tokenUse = claims.getStringClaim(CLAIM_TOKEN_USE);
            if (!expected.equals(tokenUse)) {
                throw new JwtValidationException("Unexpected token_use: " + tokenUse);
            }
        } catch (ParseException ex) {
            throw new JwtValidationException("Missing token_use claim", ex);
        }
    }

    private JWTClaimsSet claimsOrThrow(SignedJWT jwt) throws JwtValidationException {
        try {
            return jwt.getJWTClaimsSet();
        } catch (ParseException ex) {
            throw new JwtValidationException("Unable to read JWT claims", ex);
        }
    }

    private String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256)
                            .keyID(keyProvider.keyId())
                            .type(JOSEObjectType.JWT)
                            .build(),
                    claims
            );
            jwt.sign(new ECDSASigner(keyProvider.privateKey()));
            return jwt.serialize();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign JWT", ex);
        }
    }
}

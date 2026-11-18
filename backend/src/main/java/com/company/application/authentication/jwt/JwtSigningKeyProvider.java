package com.company.application.authentication.jwt;

import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.List;

import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class JwtSigningKeyProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtSigningKeyProvider.class);

    private final ECKey activeKey;

    public JwtSigningKeyProvider(JwtProperties properties) {
        this.activeKey = generateEphemeral(properties.getKeyId());
        log.warn(
                "Using ephemeral in-memory ES256 key (kid={}). Configure durable keys before production use.",
                properties.getKeyId()
        );
    }

    public ECPrivateKey privateKey() {
        try {
            return activeKey.toECPrivateKey();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to load EC private key", ex);
        }
    }

    public ECPublicKey publicKey() {
        try {
            return activeKey.toECPublicKey();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to load EC public key", ex);
        }
    }

    public String keyId() {
        return activeKey.getKeyID();
    }

    public List<ECKey> verificationKeys() {
        return List.of(activeKey.toPublicJWK());
    }

    private static ECKey generateEphemeral(String keyId) {
        try {
            return new ECKeyGenerator(Curve.P_256).keyID(keyId).generate();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate ephemeral ES256 key", ex);
        }
    }
}

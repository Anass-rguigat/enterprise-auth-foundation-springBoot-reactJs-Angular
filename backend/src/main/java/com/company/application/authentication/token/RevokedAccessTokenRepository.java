package com.company.application.authentication.token;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RevokedAccessTokenRepository extends JpaRepository<RevokedAccessToken, UUID> {

    boolean existsByJti(UUID jti);
}

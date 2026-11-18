package com.company.application.authentication;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.company.application.user.User;

public class AuthenticatedUser implements UserDetails {

    private final User user;
    private final UUID familyId;
    private final UUID accessJti;
    private final Collection<? extends GrantedAuthority> authorities;

    public AuthenticatedUser(
            User user,
            UUID familyId,
            UUID accessJti,
            Collection<? extends GrantedAuthority> authorities
    ) {
        this.user = user;
        this.familyId = familyId;
        this.accessJti = accessJti;
        this.authorities = authorities == null ? List.of() : List.copyOf(authorities);
    }

    public User getUser() {
        return user;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public UUID getAccessJti() {
        return accessJti;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getId().toString();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getLockedUntil() == null || user.getLockedUntil().isBefore(java.time.Instant.now());
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getStatus().allowsLogin();
    }
}

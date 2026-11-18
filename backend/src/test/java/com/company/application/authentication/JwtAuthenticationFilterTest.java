package com.company.application.authentication;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.company.application.authentication.jwt.AccessTokenClaims;
import com.company.application.authentication.jwt.AuthCookieProperties;
import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.token.RevokedAccessTokenRepository;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.authorization.PermissionQueryService;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;
    @Mock
    private RevokedAccessTokenRepository revokedAccessTokenRepository;
    @Mock
    private TokenFamilyRepository tokenFamilyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PermissionQueryService permissionQueryService;
    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;
    private final UUID userId = UUID.randomUUID();
    private final UUID familyId = UUID.randomUUID();
    private final UUID jti = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        AuthCookieProperties cookies = new AuthCookieProperties();
        filter = new JwtAuthenticationFilter(
                jwtService,
                cookies,
                revokedAccessTokenRepository,
                tokenFamilyRepository,
                userRepository,
                permissionQueryService,
                new ObjectMapper()
        );
    }

    @Test
    void revokedFamilyRejectsAccessEvenWhenJtiNotDenylisted() throws Exception {
        stubAccessToken();
        when(revokedAccessTokenRepository.existsByJti(jti)).thenReturn(false);
        TokenFamily family = new TokenFamily();
        family.setId(familyId);
        family.setUserId(userId);
        family.revoke("LOGOUT");
        when(tokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));

        MockHttpServletRequest request = requestWithAccess("access-raw");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("UNAUTHORIZED");
        verify(filterChain, never()).doFilter(any(), any());
        verify(permissionQueryService, never()).getAuthorities(any());
    }

    @Test
    void dataAccessFailureOnFamilyLookupReturns503() throws Exception {
        stubAccessToken();
        when(revokedAccessTokenRepository.existsByJti(jti)).thenReturn(false);
        when(tokenFamilyRepository.findById(familyId))
                .thenThrow(new QueryTimeoutException("db down"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(requestWithAccess("access-raw"), response, filterChain);

        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).contains("SERVICE_UNAVAILABLE");
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    void dataAccessFailureOnDenylistLookupReturns503() throws Exception {
        stubAccessToken();
        when(revokedAccessTokenRepository.existsByJti(jti))
                .thenThrow(new QueryTimeoutException("db down"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(requestWithAccess("access-raw"), response, filterChain);

        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).contains("SERVICE_UNAVAILABLE");
    }

    @Test
    void dataAccessFailureOnUserLookupReturns503() throws Exception {
        stubAccessToken();
        when(revokedAccessTokenRepository.existsByJti(jti)).thenReturn(false);
        TokenFamily family = new TokenFamily();
        family.setId(familyId);
        family.setUserId(userId);
        when(tokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));
        when(userRepository.findById(userId)).thenThrow(new QueryTimeoutException("db down"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(requestWithAccess("access-raw"), response, filterChain);

        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).contains("SERVICE_UNAVAILABLE");
    }

    @Test
    void tokenVersionMismatchReturns401Not503() throws Exception {
        stubAccessToken();
        when(revokedAccessTokenRepository.existsByJti(jti)).thenReturn(false);
        TokenFamily family = new TokenFamily();
        family.setId(familyId);
        family.setUserId(userId);
        when(tokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));
        User user = new User();
        user.setId(userId);
        user.setStatus(UserStatus.ACTIVE);
        user.setTokenVersion(99L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(requestWithAccess("access-raw"), response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    void validAccessProceedsWithAuthorities() throws Exception {
        stubAccessToken();
        when(revokedAccessTokenRepository.existsByJti(jti)).thenReturn(false);
        TokenFamily family = new TokenFamily();
        family.setId(familyId);
        family.setUserId(userId);
        when(tokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));
        User user = new User();
        user.setId(userId);
        user.setStatus(UserStatus.ACTIVE);
        user.setTokenVersion(0L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        Collection<? extends GrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority("USER_READ"));
        when(permissionQueryService.getAuthorities(userId)).thenAnswer(inv -> authorities);

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(requestWithAccess("access-raw"), response, filterChain);

        verify(filterChain).doFilter(any(), any());
        assertThat(response.getStatus()).isEqualTo(200);
    }

    private void stubAccessToken() throws Exception {
        when(jwtService.parseAccessToken("access-raw")).thenReturn(new AccessTokenClaims(
                userId, jti, familyId, 0L, Instant.now(), Instant.now().plusSeconds(60)
        ));
    }

    private static MockHttpServletRequest requestWithAccess(String value) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/auth/me");
        request.setCookies(new jakarta.servlet.http.Cookie("access_token", value));
        return request;
    }
}

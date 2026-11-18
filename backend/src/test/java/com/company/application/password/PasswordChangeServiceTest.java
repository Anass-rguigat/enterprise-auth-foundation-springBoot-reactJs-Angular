package com.company.application.password;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.company.application.audit.AuditService;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.email.EmailOutboxService;
import com.company.application.email.EmailTemplateCode;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordChangeServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private TokenFamilyRepository tokenFamilyRepository;
    @Mock
    private EmailOutboxService emailOutboxService;
    @Mock
    private AuditService auditService;

    private PasswordChangeService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new PasswordChangeService(
                userRepository,
                passwordEncoder,
                new PasswordPolicy(),
                tokenFamilyRepository,
                emailOutboxService,
                auditService
        );
    }

    @Test
    void changePasswordClearsFlagBumpsVersionAndRevokesFamilies() {
        User user = new User();
        user.setId(userId);
        user.setEmail("u@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash("old-hash");
        user.setMustChangePassword(true);
        user.setTokenVersion(3L);

        when(userRepository.findByIdWithProfile(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("CurrentPass12", "old-hash")).thenReturn(true);
        when(passwordEncoder.matches("NewPassword34!", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword34!")).thenReturn("new-hash");

        service.changePassword(userId, "CurrentPass12", "NewPassword34!");

        assertThat(user.isMustChangePassword()).isFalse();
        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(user.getTokenVersion()).isEqualTo(4L);
        verify(tokenFamilyRepository).revokeAllActiveByUserId(eq(userId), any(), eq("PASSWORD_CHANGED"));
        verify(emailOutboxService).enqueue(
                eq("u@example.com"),
                eq(EmailTemplateCode.PASSWORD_CHANGED),
                eq("Your password was changed"),
                any(Map.class)
        );
    }

    @Test
    void rejectsWrongCurrentPassword() {
        User user = new User();
        user.setId(userId);
        user.setPasswordHash("old-hash");
        when(userRepository.findByIdWithProfile(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(userId, "wrong", "NewPassword34!"))
                .isInstanceOf(InvalidPasswordException.class);
    }
}

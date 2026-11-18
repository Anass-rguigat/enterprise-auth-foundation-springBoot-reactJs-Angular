package com.company.application.user;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAccountServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserAccountService userAccountService;

    @BeforeEach
    void setUp() {
        userAccountService = new UserAccountService(userRepository, passwordEncoder);
    }

    @Test
    void createPendingUserPersistsProfileAndPendingStatus() {
        when(userRepository.existsByEmailNormalized("jane@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmailNormalized("jane@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User created = userAccountService.createPendingUser(new CreateUserCommand(
                "Jane@Example.com",
                "Jane",
                "Doe",
                null,
                "en",
                "UTC"
        ));

        assertThat(created.getStatus()).isEqualTo(UserStatus.PENDING_ACTIVATION);
        assertThat(created.getEmailNormalized()).isEqualTo("jane@example.com");
        assertThat(created.getPasswordHash()).isNull();
        assertThat(created.getProfile().getFirstName()).isEqualTo("Jane");
        assertThat(created.getTokenVersion()).isZero();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void suspendIncrementsTokenVersion() {
        UUID userId = UUID.randomUUID();
        User user = activeUser(userId, 3L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User suspended = userAccountService.suspend(userId);

        assertThat(suspended.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(suspended.getTokenVersion()).isEqualTo(4L);
    }

    @Test
    void softDeleteKeepsProfileAndBumpsTokenVersion() {
        UUID userId = UUID.randomUUID();
        User user = activeUser(userId, 1L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User deleted = userAccountService.softDelete(userId);

        assertThat(deleted.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(deleted.getDeletedAt()).isNotNull();
        assertThat(deleted.getProfile()).isNotNull();
        assertThat(deleted.getTokenVersion()).isEqualTo(2L);
    }

    @Test
    void restoreClearsDeletedAtAndKeepsProfile() {
        UUID userId = UUID.randomUUID();
        User user = activeUser(userId, 5L);
        user.setStatus(UserStatus.DELETED);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User restored = userAccountService.restore(userId);

        assertThat(restored.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(restored.getDeletedAt()).isNull();
        assertThat(restored.getProfile()).isNotNull();
        // Restore does not bump token_version; prior revoke already happened on delete.
        assertThat(restored.getTokenVersion()).isEqualTo(5L);
    }

    @Test
    void invalidTransitionIsRejected() {
        UUID userId = UUID.randomUUID();
        User user = activeUser(userId, 0L);
        user.setStatus(UserStatus.PENDING_ACTIVATION);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userAccountService.suspend(userId))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void pendingEmailDoesNotChangeLoginEmailUntilConfirmed() {
        UUID userId = UUID.randomUUID();
        User user = activeUser(userId, 0L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByEmailNormalized("new@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmailNormalized("new@example.com")).thenReturn(false);

        userAccountService.beginEmailChange(userId, "New@Example.com");
        assertThat(user.getEmailNormalized()).isEqualTo("old@example.com");
        assertThat(user.getPendingEmailNormalized()).isEqualTo("new@example.com");

        userAccountService.confirmPendingEmail(userId);
        assertThat(user.getEmailNormalized()).isEqualTo("new@example.com");
        assertThat(user.getPendingEmail()).isNull();
        assertThat(user.isEmailVerified()).isTrue();
    }

    @Test
    void duplicateEmailIsRejected() {
        when(userRepository.existsByEmailNormalized("jane@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userAccountService.createPendingUser(
                new CreateUserCommand("jane@example.com", "Jane", "Doe", null, null, null)
        )).isInstanceOf(DuplicateEmailException.class);
    }

    private static User activeUser(UUID id, long tokenVersion) {
        User user = new User();
        user.setId(id);
        user.setEmail("old@example.com");
        user.setEmailNormalized("old@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setTokenVersion(tokenVersion);
        user.setAuthzVersion(0L);
        user.setFailedLoginCount(0);
        user.setMustChangePassword(false);
        user.setEmailVerified(true);

        var profile = new com.company.application.profile.UserProfile();
        profile.setFirstName("Old");
        profile.setLastName("User");
        user.setProfile(profile);
        return user;
    }
}

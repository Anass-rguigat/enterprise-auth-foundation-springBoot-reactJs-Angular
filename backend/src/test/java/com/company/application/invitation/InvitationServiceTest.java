package com.company.application.invitation;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.authentication.TokenHashing;
import com.company.application.email.EmailOutboxService;
import com.company.application.email.EmailTemplateCode;
import com.company.application.password.PasswordPolicy;
import com.company.application.profile.UserProfile;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private InvitationTokenRepository invitationTokenRepository;
    @Mock
    private EmailOutboxService emailOutboxService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserAccountService userAccountService;

    private InvitationService invitationService;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        InvitationProperties properties = new InvitationProperties();
        properties.setTokenTtl(Duration.ofHours(72));
        properties.setAcceptBaseUrl("http://localhost:5173/invite/accept");
        invitationService = new InvitationService(
                invitationTokenRepository,
                properties,
                emailOutboxService,
                userRepository,
                userAccountService,
                new PasswordPolicy()
        );
    }

    @Test
    void createOrResendRevokesPriorAndEnqueuesOutbox() {
        User user = pendingUser();
        when(userRepository.findByIdWithProfile(userId)).thenReturn(Optional.of(user));
        when(invitationTokenRepository.revokeActiveForUser(eq(userId), any(Instant.class))).thenReturn(1);
        when(invitationTokenRepository.save(any(InvitationToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String raw = invitationService.createOrResendInvitation(userId);

        assertThat(raw).isNotBlank();
        ArgumentCaptor<InvitationToken> captor = ArgumentCaptor.forClass(InvitationToken.class);
        verify(invitationTokenRepository).save(captor.capture());
        assertThat(captor.getValue().getTokenHash()).isEqualTo(TokenHashing.sha256Hex(raw));
        verify(emailOutboxService).enqueue(
                eq(user.getEmail()),
                eq(EmailTemplateCode.INVITATION),
                eq("You're invited"),
                any(Map.class)
        );
    }

    @Test
    void acceptActivatesPendingUser() {
        String raw = "test-invite-token-value-32b-----------";
        InvitationToken token = new InvitationToken();
        token.setUserId(userId);
        token.setTokenHash(TokenHashing.sha256Hex(raw));
        token.setExpiresAt(Instant.now().plusSeconds(3600));
        when(invitationTokenRepository.findByTokenHash(TokenHashing.sha256Hex(raw))).thenReturn(Optional.of(token));

        User user = pendingUser();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userAccountService.setPassword(userId, "CorrectHorseBattery1!")).thenReturn(user);
        when(userAccountService.activate(userId)).thenReturn(user);

        User activated = invitationService.acceptInvitation(raw, "CorrectHorseBattery1!");

        assertThat(activated.isEmailVerified()).isTrue();
        assertThat(token.getUsedAt()).isNotNull();
        verify(userAccountService).setPassword(userId, "CorrectHorseBattery1!");
        verify(userAccountService).activate(userId);
    }

    @Test
    void acceptRejectsExpiredOrUnknownToken() {
        when(invitationTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invitationService.acceptInvitation("missing", "CorrectHorseBattery1!"))
                .isInstanceOf(InvalidInvitationException.class);
    }

    private User pendingUser() {
        User user = new User();
        user.setId(userId);
        user.setEmail("invitee@example.com");
        user.setEmailNormalized("invitee@example.com");
        user.setStatus(UserStatus.PENDING_ACTIVATION);
        UserProfile profile = new UserProfile();
        profile.setFirstName("Inv");
        profile.setLastName("Itee");
        user.setProfile(profile);
        return user;
    }
}

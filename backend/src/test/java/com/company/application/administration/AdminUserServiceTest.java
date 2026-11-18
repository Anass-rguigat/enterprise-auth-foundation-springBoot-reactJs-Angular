package com.company.application.administration;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.audit.AuditService;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.authorization.RoleAssignmentService;
import com.company.application.common.exception.ApplicationException;
import com.company.application.invitation.InvitationService;
import com.company.application.password.PasswordResetService;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserAccountService userAccountService;
    @Mock
    private AdminSafeguardService adminSafeguardService;
    @Mock
    private TokenFamilyRepository tokenFamilyRepository;
    @Mock
    private InvitationService invitationService;
    @Mock
    private PasswordResetService passwordResetService;
    @Mock
    private AuditService auditService;
    @Mock
    private RoleAssignmentService roleAssignmentService;

    private AdminUserService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new AdminUserService(
                userRepository,
                userAccountService,
                adminSafeguardService,
                tokenFamilyRepository,
                invitationService,
                passwordResetService,
                auditService,
                roleAssignmentService
        );
    }

    @Test
    void suspendChecksLastSuperAdminThenRevokesSessions() {
        User user = activeUser();
        when(userAccountService.suspend(userId)).thenReturn(user);

        service.suspend(userId);

        verify(adminSafeguardService).assertNotLastSuperAdmin(userId, "suspend");
        verify(tokenFamilyRepository).revokeAllActiveByUserId(eq(userId), any(), eq("ADMIN_SUSPEND"));
    }

    @Test
    void suspendPropagatesLastSuperAdminGuard() {
        doThrow(new ApplicationException(
                com.company.application.common.exception.ErrorCode.CONFLICT,
                "Cannot suspend the last SUPER_ADMIN"
        )).when(adminSafeguardService).assertNotLastSuperAdmin(userId, "suspend");

        assertThatThrownBy(() -> service.suspend(userId))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("last SUPER_ADMIN");
        verify(userAccountService, never()).suspend(any());
    }

    @Test
    void revokeSessionRejectsForeignFamily() {
        TokenFamily family = new TokenFamily();
        family.setId(UUID.randomUUID());
        family.setUserId(UUID.randomUUID());
        when(tokenFamilyRepository.findById(family.getId())).thenReturn(Optional.of(family));

        assertThatThrownBy(() -> service.revokeSession(userId, family.getId()))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("Session not found");
        assertThat(family.isRevoked()).isFalse();
    }

    @Test
    void forcePasswordResetRequiresActiveUser() {
        User user = activeUser();
        user.setStatus(UserStatus.SUSPENDED);
        when(userAccountService.getRequired(userId)).thenReturn(user);

        assertThatThrownBy(() -> service.forcePasswordReset(userId))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("ACTIVE");
        verify(passwordResetService, never()).forgotPassword(any());
    }

    private User activeUser() {
        User user = new User();
        user.setId(userId);
        user.setEmail("admin-target@example.com");
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }
}

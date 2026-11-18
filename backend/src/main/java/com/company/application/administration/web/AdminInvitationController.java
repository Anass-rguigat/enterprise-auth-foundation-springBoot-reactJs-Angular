package com.company.application.administration.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authorization.Permissions;
import com.company.application.invitation.InvitationService;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminInvitationController {

    private final InvitationService invitationService;

    public AdminInvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @PostMapping("/{userId}/invitations")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_INVITE + "')")
    public void createOrResend(@PathVariable UUID userId) {
        invitationService.createOrResendInvitation(userId);
    }
}

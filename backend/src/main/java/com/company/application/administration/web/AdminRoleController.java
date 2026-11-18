package com.company.application.administration.web;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.authorization.Permissions;
import com.company.application.authorization.RoleAssignmentService;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminRoleController {

    private final RoleAssignmentService roleAssignmentService;

    public AdminRoleController(RoleAssignmentService roleAssignmentService) {
        this.roleAssignmentService = roleAssignmentService;
    }

    @PostMapping("/{userId}/roles")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_ASSIGN_ROLE + "')")
    public void assignRole(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId,
            @Valid @RequestBody AssignRoleRequest request
    ) {
        // Lock → assertCanAssignRole → insert (single TX inside RoleAssignmentService)
        roleAssignmentService.assignRole(principal.getUser().getId(), userId, request.roleCode());
    }

    @DeleteMapping("/{userId}/roles/{roleCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_ASSIGN_ROLE + "') or hasRole('SUPER_ADMIN')")
    public void removeRole(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId,
            @PathVariable String roleCode
    ) {
        roleAssignmentService.removeRole(principal.getUser().getId(), userId, roleCode);
    }

    @PostMapping("/{userId}/grant-super-admin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void grantSuperAdmin(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId,
            @Valid @RequestBody GrantSuperAdminRequest request
    ) {
        roleAssignmentService.grantSuperAdmin(
                principal.getUser().getId(),
                userId,
                request.password()
        );
    }
}

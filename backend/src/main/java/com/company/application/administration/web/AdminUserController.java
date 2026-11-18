package com.company.application.administration.web;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.administration.AdminUserService;
import com.company.application.authentication.AuthenticatedUser;
import com.company.application.authorization.PermissionQueryService;
import com.company.application.authorization.Permissions;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserStatus;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final PermissionQueryService permissionQueryService;

    public AdminUserController(AdminUserService adminUserService, PermissionQueryService permissionQueryService) {
        this.adminUserService = adminUserService;
        this.permissionQueryService = permissionQueryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('" + Permissions.USER_CREATE + "')")
    public AdminUserResponse create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateAdminUserRequest request
    ) {
        UUID actorId = principal != null ? principal.getUser().getId() : null;
        User user = adminUserService.createUser(
                actorId,
                new CreateUserCommand(
                        request.email(),
                        request.firstName(),
                        request.lastName(),
                        request.phone(),
                        request.preferredLanguage(),
                        request.timezone(),
                        request.jobTitle(),
                        request.department(),
                        request.organization(),
                        request.city(),
                        request.country(),
                        request.bio()
                ),
                request.roleCodes()
        );
        return toResponse(user);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.USER_READ + "')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<AdminUserResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return adminUserService.search(q, status, pageable).map(this::toResponse);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('" + Permissions.USER_READ + "')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public AdminUserResponse get(@PathVariable UUID userId) {
        return toResponse(adminUserService.getWithProfile(userId));
    }

    @PatchMapping("/{userId}")
    @PreAuthorize("hasAuthority('" + Permissions.USER_UPDATE + "')")
    public AdminUserResponse update(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateAdminUserRequest request
    ) {
        return toResponse(adminUserService.updateBasics(
                userId,
                request.firstName(),
                request.lastName(),
                request.phone(),
                request.preferredLanguage(),
                request.timezone(),
                request.jobTitle(),
                request.department(),
                request.organization(),
                request.city(),
                request.country(),
                request.bio()
        ));
    }

    @PostMapping("/{userId}/activate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_ACTIVATE + "')")
    public void activate(@PathVariable UUID userId) {
        adminUserService.activate(userId);
    }

    @PostMapping("/{userId}/suspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_SUSPEND + "')")
    public void suspend(@PathVariable UUID userId) {
        adminUserService.suspend(userId);
    }

    @PostMapping("/{userId}/disable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_SUSPEND + "')")
    public void disable(@PathVariable UUID userId) {
        adminUserService.disable(userId);
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_DELETE + "')")
    public void delete(@PathVariable UUID userId) {
        adminUserService.softDelete(userId);
    }

    @PostMapping("/{userId}/restore")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_RESTORE + "')")
    public void restore(@PathVariable UUID userId) {
        adminUserService.restore(userId);
    }

    @PostMapping("/{userId}/force-password-reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_RESET_PASSWORD + "')")
    public void forcePasswordReset(@PathVariable UUID userId) {
        adminUserService.forcePasswordReset(userId);
    }

    @PostMapping("/{userId}/revoke-sessions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_REVOKE_TOKENS + "')")
    public void revokeSessions(@PathVariable UUID userId) {
        adminUserService.revokeAllSessions(userId);
    }

    @DeleteMapping("/{userId}/sessions/{familyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.USER_REVOKE_TOKENS + "')")
    public void revokeSession(@PathVariable UUID userId, @PathVariable UUID familyId) {
        adminUserService.revokeSession(userId, familyId);
    }

    private AdminUserResponse toResponse(User user) {
        return AdminUserResponse.from(
                user,
                permissionQueryService.findRoleCodes(user.getId()),
                permissionQueryService.findPermissionCodes(user.getId())
        );
    }
}

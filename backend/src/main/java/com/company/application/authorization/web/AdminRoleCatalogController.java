package com.company.application.authorization.web;

import java.util.List;

import jakarta.validation.Valid;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.authorization.Permissions;
import com.company.application.authorization.RoleManagementService;

@RestController
@RequestMapping("/api/v1/admin/roles")
public class AdminRoleCatalogController {

    private final RoleManagementService roleManagementService;

    public AdminRoleCatalogController(RoleManagementService roleManagementService) {
        this.roleManagementService = roleManagementService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_READ + "')")
    public List<RoleResponse> list() {
        return roleManagementService.listRoles().stream().map(RoleResponse::from).toList();
    }

    @GetMapping("/{roleCode}")
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_READ + "')")
    public RoleResponse get(@PathVariable String roleCode) {
        return RoleResponse.from(roleManagementService.getRole(roleCode));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_CREATE + "')")
    public RoleResponse create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateRoleRequest request
    ) {
        return RoleResponse.from(roleManagementService.createRole(
                principal.getUser().getId(),
                request.code(),
                request.name(),
                request.description(),
                request.permissionCodes()
        ));
    }

    @PatchMapping("/{roleCode}")
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_UPDATE + "')")
    public RoleResponse update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String roleCode,
            @Valid @RequestBody UpdateRoleRequest request
    ) {
        return RoleResponse.from(roleManagementService.updateRole(
                principal.getUser().getId(),
                roleCode,
                request.name(),
                request.description()
        ));
    }

    @DeleteMapping("/{roleCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_DELETE + "')")
    public void delete(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String roleCode
    ) {
        roleManagementService.deleteRole(principal.getUser().getId(), roleCode);
    }

    @PostMapping("/{roleCode}/permissions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_ASSIGN_PERMISSION + "')")
    public void attachPermission(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String roleCode,
            @Valid @RequestBody AssignRolePermissionRequest request
    ) {
        roleManagementService.attachPermission(
                principal.getUser().getId(),
                roleCode,
                request.permissionCode()
        );
    }

    @DeleteMapping("/{roleCode}/permissions/{permissionCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_ASSIGN_PERMISSION + "')")
    public void detachPermission(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String roleCode,
            @PathVariable String permissionCode
    ) {
        roleManagementService.detachPermission(
                principal.getUser().getId(),
                roleCode,
                permissionCode
        );
    }
}

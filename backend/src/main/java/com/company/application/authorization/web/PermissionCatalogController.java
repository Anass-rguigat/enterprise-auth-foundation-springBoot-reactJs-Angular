package com.company.application.authorization.web;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authorization.Permission;
import com.company.application.authorization.PermissionRepository;
import com.company.application.authorization.Permissions;

@RestController
@RequestMapping("/api/v1/admin/permissions")
public class PermissionCatalogController {

    private final PermissionRepository permissionRepository;

    public PermissionCatalogController(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.PERMISSION_READ + "')")
    public List<PermissionResponse> list() {
        return permissionRepository.findAll().stream()
                .sorted((a, b) -> a.getCode().compareTo(b.getCode()))
                .map(p -> new PermissionResponse(p.getCode(), p.getModule(), p.getDescription()))
                .toList();
    }

    public record PermissionResponse(String code, String module, String description) {
    }
}

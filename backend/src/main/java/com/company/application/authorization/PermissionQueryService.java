package com.company.application.authorization;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PermissionQueryService {

    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    public PermissionQueryService(
            PermissionRepository permissionRepository,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository
    ) {
        this.permissionRepository = permissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<String> findPermissionCodes(UUID userId) {
        return permissionRepository.findCodesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<String> findRoleCodes(UUID userId) {
        return userRoleRepository.findRoleCodesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Collection<? extends GrantedAuthority> getAuthorities(UUID userId) {
        Set<GrantedAuthority> authorities = new LinkedHashSet<>();
        for (String code : findPermissionCodes(userId)) {
            authorities.add(new SimpleGrantedAuthority(code));
        }
        for (String roleCode : findRoleCodes(userId)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleCode));
        }
        return authorities;
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID userId, String permissionCode) {
        return findPermissionCodes(userId).contains(permissionCode);
    }

    @Transactional(readOnly = true)
    public boolean roleExists(String roleCode) {
        return roleRepository.findByCode(roleCode).isPresent();
    }
}

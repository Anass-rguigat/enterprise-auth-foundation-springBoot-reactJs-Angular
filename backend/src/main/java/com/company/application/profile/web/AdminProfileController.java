package com.company.application.profile.web;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authorization.Permissions;
import com.company.application.profile.ProfileService;
import com.company.application.profile.UpdateProfileCommand;

@RestController
@RequestMapping("/api/v1/admin/users/{userId}/profile")
public class AdminProfileController {

    private final ProfileService profileService;

    public AdminProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.PROFILE_READ + "')")
    public ProfileResponse get(@PathVariable UUID userId) {
        return ProfileResponse.from(profileService.getRequired(userId));
    }

    @PatchMapping
    @PreAuthorize("hasAuthority('" + Permissions.PROFILE_ADMIN_UPDATE + "')")
    public ProfileResponse update(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ProfileResponse.from(profileService.updateProfile(
                userId,
                new UpdateProfileCommand(
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
                )
        ));
    }
}

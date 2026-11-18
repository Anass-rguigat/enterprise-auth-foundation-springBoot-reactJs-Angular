package com.company.application.profile.web;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.profile.ProfileService;
import com.company.application.profile.UpdateProfileCommand;

@RestController
@RequestMapping("/api/v1/me/profile")
public class MeProfileController {

    private final ProfileService profileService;

    public MeProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse get(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ProfileResponse.from(profileService.getRequired(principal.getUser().getId()));
    }

    @PatchMapping
    @PreAuthorize("isAuthenticated()")
    public ProfileResponse update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ProfileResponse.from(profileService.updateProfile(
                principal.getUser().getId(),
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

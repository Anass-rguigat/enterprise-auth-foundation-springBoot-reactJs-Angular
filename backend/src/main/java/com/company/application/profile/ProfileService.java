package com.company.application.profile;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@Service
public class ProfileService {

    private final UserRepository userRepository;

    public ProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserProfile getRequired(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        UserProfile profile = user.getProfile();
        if (profile == null) {
            throw new ResourceNotFoundException("Profile not found for user: " + userId);
        }
        return profile;
    }

    @Transactional
    public UserProfile updateProfile(UUID userId, UpdateProfileCommand command) {
        UserProfile profile = getRequired(userId);
        if (command.firstName() != null) {
            profile.setFirstName(requireText(command.firstName(), "firstName"));
        }
        if (command.lastName() != null) {
            profile.setLastName(requireText(command.lastName(), "lastName"));
        }
        if (command.phone() != null) {
            profile.setPhone(blankToNull(command.phone()));
        }
        if (command.preferredLanguage() != null) {
            profile.setPreferredLanguage(blankToNull(command.preferredLanguage()));
        }
        if (command.timezone() != null) {
            profile.setTimezone(blankToNull(command.timezone()));
        }
        if (command.jobTitle() != null) {
            profile.setJobTitle(blankToNull(command.jobTitle()));
        }
        if (command.department() != null) {
            profile.setDepartment(blankToNull(command.department()));
        }
        if (command.organization() != null) {
            profile.setOrganization(blankToNull(command.organization()));
        }
        if (command.city() != null) {
            profile.setCity(blankToNull(command.city()));
        }
        if (command.country() != null) {
            profile.setCountry(blankToNull(command.country()));
        }
        if (command.bio() != null) {
            profile.setBio(blankToNull(command.bio()));
        }
        return profile;
    }

    private static String requireText(String value, String field) {
        if (value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

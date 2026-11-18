package com.company.application.common.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.common.exception.ResourceNotFoundException;

/**
 * Temporary endpoints to exercise Problem Details and validation in Phase 2.
 * Restricted to local/test profiles; removed or gated further once real APIs exist.
 */
@RestController
@RequestMapping("/api/v1/_demo")
@Profile({"local", "test"})
public class ErrorDemoController {

    @GetMapping("/not-found")
    public void notFound() {
        throw new ResourceNotFoundException("Demo resource was not found");
    }

    @PostMapping("/validate")
    public void validate(@Valid @RequestBody DemoRequest request) {
        // validation only
    }

    public record DemoRequest(@NotBlank(message = "name must not be blank") String name) {
    }
}

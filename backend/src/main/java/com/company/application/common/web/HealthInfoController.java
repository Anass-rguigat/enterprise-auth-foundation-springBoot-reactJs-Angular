package com.company.application.common.web;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HealthInfoController {

    private final String applicationName;

    public HealthInfoController(@Value("${spring.application.name}") String applicationName) {
        this.applicationName = applicationName;
    }

    @GetMapping("/meta/info")
    public Map<String, String> info() {
        return Map.of(
                "application", applicationName,
                "status", "UP",
                "phase", "28"
        );
    }
}

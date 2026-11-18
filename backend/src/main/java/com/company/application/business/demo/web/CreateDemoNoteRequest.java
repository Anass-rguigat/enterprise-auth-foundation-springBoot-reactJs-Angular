package com.company.application.business.demo.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDemoNoteRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10_000) String body
) {
}

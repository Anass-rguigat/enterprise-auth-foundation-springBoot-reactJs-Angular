package com.company.application.business.demo.web;

import jakarta.validation.constraints.Size;

public record UpdateDemoNoteRequest(
        @Size(max = 200) String title,
        @Size(max = 10_000) String body
) {
}

package com.company.application.business.demo.web;

import java.time.Instant;
import java.util.UUID;

import com.company.application.business.demo.DemoNote;

public record DemoNoteResponse(
        UUID id,
        UUID ownerUserId,
        String title,
        String body,
        Instant createdAt,
        Instant updatedAt
) {
    public static DemoNoteResponse from(DemoNote note) {
        return new DemoNoteResponse(
                note.getId(),
                note.getOwnerUserId(),
                note.getTitle(),
                note.getBody(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}

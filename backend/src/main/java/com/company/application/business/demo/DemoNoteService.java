package com.company.application.business.demo;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.common.exception.ResourceNotFoundException;

@Service
public class DemoNoteService {

    private final DemoNoteRepository repository;

    public DemoNoteService(DemoNoteRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<DemoNote> listMine(UUID ownerUserId) {
        return repository.findByOwnerUserIdOrderByUpdatedAtDesc(ownerUserId);
    }

    @Transactional(readOnly = true)
    public DemoNote getMine(UUID ownerUserId, UUID noteId) {
        return repository.findByIdAndOwnerUserId(noteId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found: " + noteId));
    }

    @Transactional
    public DemoNote create(UUID ownerUserId, String title, String body) {
        DemoNote note = new DemoNote();
        note.setOwnerUserId(ownerUserId);
        note.setTitle(requireTitle(title));
        note.setBody(body == null ? "" : body);
        return repository.save(note);
    }

    @Transactional
    public DemoNote update(UUID ownerUserId, UUID noteId, String title, String body) {
        DemoNote note = getMine(ownerUserId, noteId);
        if (title != null) {
            note.setTitle(requireTitle(title));
        }
        if (body != null) {
            note.setBody(body);
        }
        return note;
    }

    @Transactional
    public void delete(UUID ownerUserId, UUID noteId) {
        DemoNote note = getMine(ownerUserId, noteId);
        repository.delete(note);
    }

    private static String requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title must not be blank");
        }
        return title.trim();
    }
}

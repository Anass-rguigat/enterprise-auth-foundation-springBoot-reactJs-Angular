package com.company.application.business.demo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.common.exception.ResourceNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemoNoteServiceTest {

    @Mock
    private DemoNoteRepository repository;

    private DemoNoteService service;

    @BeforeEach
    void setUp() {
        service = new DemoNoteService(repository);
    }

    @Test
    void createPersistsOwnerScopedNote() {
        UUID owner = UUID.randomUUID();
        when(repository.save(any(DemoNote.class))).thenAnswer(inv -> inv.getArgument(0));

        DemoNote created = service.create(owner, "  Hello  ", "body");

        ArgumentCaptor<DemoNote> captor = ArgumentCaptor.forClass(DemoNote.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getOwnerUserId()).isEqualTo(owner);
        assertThat(captor.getValue().getTitle()).isEqualTo("Hello");
        assertThat(created.getBody()).isEqualTo("body");
    }

    @Test
    void getMineRejectsOtherOwnersNote() {
        UUID owner = UUID.randomUUID();
        UUID noteId = UUID.randomUUID();
        when(repository.findByIdAndOwnerUserId(noteId, owner)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMine(owner, noteId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listMineDelegatesToRepository() {
        UUID owner = UUID.randomUUID();
        DemoNote note = new DemoNote();
        note.setOwnerUserId(owner);
        note.setTitle("t");
        when(repository.findByOwnerUserIdOrderByUpdatedAtDesc(owner)).thenReturn(List.of(note));

        assertThat(service.listMine(owner)).containsExactly(note);
    }

    @Test
    void createRejectsBlankTitle() {
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "  ", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

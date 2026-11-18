package com.company.application.business.demo.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.business.demo.DemoNoteService;
import com.company.application.business.demo.DemoPermissions;

/**
 * Demo Notes API — reference for how business modules plug into authz.
 * Owner-scoped: callers only see/mutate their own notes.
 */
@RestController
@RequestMapping("/api/v1/demo/notes")
public class DemoNoteController {

    private final DemoNoteService demoNoteService;

    public DemoNoteController(DemoNoteService demoNoteService) {
        this.demoNoteService = demoNoteService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + DemoPermissions.NOTE_READ + "')")
    public List<DemoNoteResponse> list(@AuthenticationPrincipal AuthenticatedUser principal) {
        return demoNoteService.listMine(principal.getUser().getId()).stream()
                .map(DemoNoteResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + DemoPermissions.NOTE_READ + "')")
    public DemoNoteResponse get(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return DemoNoteResponse.from(demoNoteService.getMine(principal.getUser().getId(), id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('" + DemoPermissions.NOTE_CREATE + "')")
    public DemoNoteResponse create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateDemoNoteRequest request
    ) {
        return DemoNoteResponse.from(demoNoteService.create(
                principal.getUser().getId(),
                request.title(),
                request.body()
        ));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + DemoPermissions.NOTE_UPDATE + "')")
    public DemoNoteResponse update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDemoNoteRequest request
    ) {
        return DemoNoteResponse.from(demoNoteService.update(
                principal.getUser().getId(),
                id,
                request.title(),
                request.body()
        ));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('" + DemoPermissions.NOTE_DELETE + "')")
    public void delete(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        demoNoteService.delete(principal.getUser().getId(), id);
    }
}

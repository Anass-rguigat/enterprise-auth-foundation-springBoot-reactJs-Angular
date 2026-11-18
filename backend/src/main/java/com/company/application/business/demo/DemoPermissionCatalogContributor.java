package com.company.application.business.demo;

import java.util.List;

import org.springframework.stereotype.Component;

import com.company.application.authorization.PermissionCatalogContributor;
import com.company.application.authorization.PermissionDef;

@Component
public class DemoPermissionCatalogContributor implements PermissionCatalogContributor {

    @Override
    public List<PermissionDef> permissions() {
        return List.of(
                new PermissionDef(DemoPermissions.NOTE_CREATE, "demo", "Create demo notes"),
                new PermissionDef(DemoPermissions.NOTE_READ, "demo", "Read demo notes"),
                new PermissionDef(DemoPermissions.NOTE_UPDATE, "demo", "Update demo notes"),
                new PermissionDef(DemoPermissions.NOTE_DELETE, "demo", "Delete demo notes")
        );
    }
}

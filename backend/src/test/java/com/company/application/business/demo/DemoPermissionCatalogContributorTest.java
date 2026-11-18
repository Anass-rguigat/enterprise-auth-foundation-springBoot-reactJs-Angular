package com.company.application.business.demo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DemoPermissionCatalogContributorTest {

    @Test
    void contributesFourNotePermissionsUnderDemoModule() {
        var codes = new DemoPermissionCatalogContributor().permissions().stream()
                .map(def -> def.code())
                .toList();

        assertThat(codes).containsExactly(
                DemoPermissions.NOTE_CREATE,
                DemoPermissions.NOTE_READ,
                DemoPermissions.NOTE_UPDATE,
                DemoPermissions.NOTE_DELETE
        );
        assertThat(new DemoPermissionCatalogContributor().permissions())
                .allMatch(def -> "demo".equals(def.module()));
    }
}

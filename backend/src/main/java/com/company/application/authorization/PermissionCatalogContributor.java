package com.company.application.authorization;

import java.util.List;

/**
 * Modules contribute permission definitions. Discovered as Spring beans and synced at startup.
 */
@FunctionalInterface
public interface PermissionCatalogContributor {

    List<PermissionDef> permissions();
}

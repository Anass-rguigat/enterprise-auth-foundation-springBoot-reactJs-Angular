package com.company.application.support;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared PostgreSQL Testcontainers setup that mirrors Compose dual-role privileges.
 */
public final class PostgresTestSupport {

    public static final String OWNER_USER = "auth_owner";
    public static final String OWNER_PASSWORD = "owner-secret";
    public static final String APP_USER = "auth_app";
    public static final String APP_PASSWORD = "app-secret";
    public static final String RETENTION_USER = "auth_retention";
    public static final String RETENTION_PASSWORD = "retention-secret";

    private PostgresTestSupport() {
    }

    public static PostgreSQLContainer createContainer() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:16"));
    }

    public static void initializeRoles(PostgreSQLContainer container) {
        try (Connection connection = DriverManager.getConnection(
                container.getJdbcUrl(),
                container.getUsername(),
                container.getPassword()
        ); Statement statement = connection.createStatement()) {
            statement.execute("""
                    DO $$
                    BEGIN
                      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_owner') THEN
                        CREATE ROLE auth_owner LOGIN PASSWORD 'owner-secret'
                          NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
                      END IF;
                      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_app') THEN
                        CREATE ROLE auth_app LOGIN PASSWORD 'app-secret'
                          NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
                      END IF;
                      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_retention') THEN
                        CREATE ROLE auth_retention LOGIN PASSWORD 'retention-secret'
                          NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
                      END IF;
                    END
                    $$;
                    """);
            statement.execute("GRANT CONNECT ON DATABASE " + container.getDatabaseName() + " TO auth_owner, auth_app, auth_retention");
            statement.execute("GRANT USAGE, CREATE ON SCHEMA public TO auth_owner");
            statement.execute("GRANT USAGE ON SCHEMA public TO auth_app, auth_retention");
            statement.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
            statement.execute("""
                    ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public
                      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_app
                    """);
            statement.execute("""
                    ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public
                      GRANT USAGE, SELECT ON SEQUENCES TO auth_app
                    """);
            statement.execute("""
                    ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public
                      GRANT SELECT ON TABLES TO auth_retention
                    """);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to initialize PostgreSQL test roles", ex);
        }
    }
}

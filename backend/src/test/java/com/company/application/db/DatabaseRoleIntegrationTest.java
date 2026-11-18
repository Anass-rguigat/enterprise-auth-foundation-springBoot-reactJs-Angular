package com.company.application.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.company.application.support.AbstractPostgresIntegrationTest;
import com.company.application.support.PostgresTestSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class DatabaseRoleIntegrationTest extends AbstractPostgresIntegrationTest {

    @Test
    void usersTableIsOwnedByMigrationRoleNotAppRole() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.OWNER_USER,
                PostgresTestSupport.OWNER_PASSWORD
        ); Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     """
                     SELECT tableowner
                     FROM pg_tables
                     WHERE schemaname = 'public' AND tablename = 'users'
                     """
             )) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getString("tableowner")).isEqualTo(PostgresTestSupport.OWNER_USER);
        }
    }

    @Test
    void runtimeAppCanSelectButCannotDropUsersTable() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.APP_USER,
                PostgresTestSupport.APP_PASSWORD
        ); Statement statement = connection.createStatement()) {
            try (ResultSet resultSet = statement.executeQuery("SELECT COUNT(*) FROM users")) {
                assertThat(resultSet.next()).isTrue();
            }

            assertThatThrownBy(() -> statement.execute("DROP TABLE users"))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void runtimeAppCannotUpdateOrDeleteAuditLogs() throws Exception {
        UUID id = insertAuditRowAsApp();

        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.APP_USER,
                PostgresTestSupport.APP_PASSWORD
        ); Statement statement = connection.createStatement()) {
            assertThatThrownBy(() -> statement.execute(
                    "UPDATE security_audit_logs SET outcome = 'DENIED' WHERE id = '" + id + "'"
            )).isInstanceOf(SQLException.class);

            assertThatThrownBy(() -> statement.execute(
                    "DELETE FROM security_audit_logs WHERE id = '" + id + "'"
            )).isInstanceOf(SQLException.class);
        }
    }

    @Test
    void retentionRoleCanPurgeViaSecurityDefinerFunctionButAppCannot() throws Exception {
        insertAuditRowAsApp();

        try (Connection app = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.APP_USER,
                PostgresTestSupport.APP_PASSWORD
        ); Statement statement = app.createStatement()) {
            assertThatThrownBy(() -> statement.executeQuery("SELECT purge_expired_security_audit_logs(30)"))
                    .isInstanceOf(SQLException.class);
        }

        try (Connection retention = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.RETENTION_USER,
                PostgresTestSupport.RETENTION_PASSWORD
        ); Statement statement = retention.createStatement();
             ResultSet rs = statement.executeQuery("SELECT purge_expired_security_audit_logs(30)")) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getLong(1)).isGreaterThanOrEqualTo(0L);
        }

        try (Connection retention = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.RETENTION_USER,
                PostgresTestSupport.RETENTION_PASSWORD
        ); Statement statement = retention.createStatement()) {
            assertThatThrownBy(() -> statement.executeQuery("SELECT purge_expired_security_audit_logs(1)"))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void runtimeAppCannotTakeOwnershipOfAuditTable() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.APP_USER,
                PostgresTestSupport.APP_PASSWORD
        ); Statement statement = connection.createStatement()) {
            assertThatThrownBy(() -> statement.execute(
                    "ALTER TABLE security_audit_logs OWNER TO auth_app"
            )).isInstanceOf(SQLException.class);
        }

        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.OWNER_USER,
                PostgresTestSupport.OWNER_PASSWORD
        ); Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     """
                     SELECT tableowner FROM pg_tables
                     WHERE schemaname = 'public' AND tablename = 'security_audit_logs'
                     """
             )) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getString("tableowner")).isEqualTo(PostgresTestSupport.OWNER_USER);
        }
    }

    @Test
    void defaultPrivilegesGrantAppDmlOnNewlyCreatedOwnerTable() throws Exception {
        String table = "phase14_default_priv_probe";
        try (Connection owner = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.OWNER_USER,
                PostgresTestSupport.OWNER_PASSWORD
        ); Statement statement = owner.createStatement()) {
            statement.execute("DROP TABLE IF EXISTS " + table);
            statement.execute("CREATE TABLE " + table + " (id int PRIMARY KEY)");
        }

        try (Connection app = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.APP_USER,
                PostgresTestSupport.APP_PASSWORD
        ); Statement statement = app.createStatement()) {
            statement.execute("INSERT INTO " + table + " (id) VALUES (1)");
            try (ResultSet rs = statement.executeQuery("SELECT id FROM " + table)) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(1);
            }
            statement.execute("UPDATE " + table + " SET id = 2 WHERE id = 1");
            statement.execute("DELETE FROM " + table + " WHERE id = 2");
        } finally {
            try (Connection owner = DriverManager.getConnection(
                    POSTGRES.getJdbcUrl(),
                    PostgresTestSupport.OWNER_USER,
                    PostgresTestSupport.OWNER_PASSWORD
            ); Statement statement = owner.createStatement()) {
                statement.execute("DROP TABLE IF EXISTS " + table);
            }
        }
    }

    private UUID insertAuditRowAsApp() throws Exception {
        UUID id = UUID.randomUUID();
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                PostgresTestSupport.APP_USER,
                PostgresTestSupport.APP_PASSWORD
        ); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO security_audit_logs (id, event_type, module, outcome, metadata)
                    VALUES ('%s', 'TEST_EVENT', 'test', 'SUCCESS', '{}'::jsonb)
                    """.formatted(id));
        }
        return id;
    }
}

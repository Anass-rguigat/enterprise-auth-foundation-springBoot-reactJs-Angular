package com.company.application.support;

import org.junit.jupiter.api.BeforeAll;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractPostgresIntegrationTest {

    @Container
    protected static final PostgreSQLContainer POSTGRES = PostgresTestSupport.createContainer();

    @BeforeAll
    static void initRoles() {
        PostgresTestSupport.initializeRoles(POSTGRES);
    }

    @DynamicPropertySource
    static void registerDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", () -> PostgresTestSupport.APP_USER);
        registry.add("spring.datasource.password", () -> PostgresTestSupport.APP_PASSWORD);
        registry.add("spring.flyway.user", () -> PostgresTestSupport.OWNER_USER);
        registry.add("spring.flyway.password", () -> PostgresTestSupport.OWNER_PASSWORD);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
    }
}

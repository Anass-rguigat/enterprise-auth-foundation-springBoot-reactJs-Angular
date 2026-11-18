package com.company.application.administration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.company.application.authorization.RoleAssignmentService;
import com.company.application.support.AbstractPostgresIntegrationTest;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.bootstrap.enabled=true",
        "app.bootstrap.email=bootstrap-admin@example.com",
        "app.bootstrap.password=BootstrapPass12!",
        "app.bootstrap.first-name=Boot",
        "app.bootstrap.last-name=Strap"
})
class BootstrapAdminIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private RoleAssignmentService roleAssignmentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BootstrapAdminRunner bootstrapAdminRunner;

    @Test
    void bootstrapIsIdempotentAndCreatesSingleSuperAdmin() throws Exception {
        // Context startup already ran bootstrap once with the test properties.
        assertThat(roleAssignmentService.countSuperAdmins()).isEqualTo(1);
        assertThat(userRepository.findByEmailNormalized("bootstrap-admin@example.com")).isPresent()
                .get()
                .satisfies(user -> {
                    assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
                    assertThat(user.isMustChangePassword()).isTrue();
                    assertThat(user.isEmailVerified()).isTrue();
                    assertThat(user.getPasswordHash()).isNotBlank();
                });

        long usersBefore = userRepository.count();
        bootstrapAdminRunner.run(new org.springframework.boot.DefaultApplicationArguments());
        assertThat(roleAssignmentService.countSuperAdmins()).isEqualTo(1);
        assertThat(userRepository.count()).isEqualTo(usersBefore);
    }
}

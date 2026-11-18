package com.company.application.common.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailNormalizerTest {

    @Test
    void normalizesCaseAndWhitespace() {
        assertThat(EmailNormalizer.normalize("  Admin@Example.COM ")).isEqualTo("admin@example.com");
    }

    @Test
    void rejectsBlank() {
        assertThatThrownBy(() -> EmailNormalizer.normalize("  "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

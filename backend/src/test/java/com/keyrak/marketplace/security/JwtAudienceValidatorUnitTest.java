package com.keyrak.marketplace.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAudienceValidatorUnitTest {

    private final JwtAudienceValidator validator = new JwtAudienceValidator("keyrak-api");

    @Test
    void acceptsTokenContainingTheRequiredAudience() {
        assertThat(validator.validate(token(List.of("another-api", "keyrak-api"))).hasErrors()).isFalse();
    }

    @Test
    void rejectsTokenIntendedForAnotherAudience() {
        var result = validator.validate(token(List.of("another-api")));
        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).singleElement().satisfies(error -> {
            assertThat(error.getErrorCode()).isEqualTo("invalid_token");
            assertThat(error.getDescription()).isEqualTo("The token audience is not accepted");
        });
    }

    @Test
    void rejectsEmptyAudience() {
        assertThat(validator.validate(token(List.of())).hasErrors()).isTrue();
    }

    private Jwt token(List<String> audiences) {
        return Jwt.withTokenValue("test-token").header("alg", "HS256").subject("test-subject")
                .audience(audiences).build();
    }
}

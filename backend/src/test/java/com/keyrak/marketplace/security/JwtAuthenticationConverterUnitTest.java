package com.keyrak.marketplace.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthenticationConverterUnitTest {

    private final JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

    @Test
    void collectionRolesAreNormalizedAndDeduplicated() {
        Jwt jwt = token().claim("roles", List.of(" admin ", "ROLE_ADMIN", "client", " "))
                .claim("email", "guest@example.test").build();

        var authentication = converter.convert(jwt);

        assertThat(authentication.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_CLIENT", "ROLE_ADMIN");
        assertThat(authentication.getName()).isEqualTo("guest@example.test");
        assertThat(authentication.isAuthenticated()).isTrue();
    }

    @Test
    void commaSeparatedRolesAreSupported() {
        Jwt jwt = token().claim("roles", "admin, ,role_client,ADMIN").build();
        assertThat(converter.convert(jwt).getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_CLIENT", "ROLE_ADMIN");
    }

    @Test
    void unsupportedRoleClaimDoesNotAddAuthorities() {
        Jwt jwt = token().claim("roles", 42).build();
        assertThat(converter.convert(jwt).getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_CLIENT");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void missingEmailUsesSubjectAsPrincipal(String email) {
        Jwt.Builder builder = token();
        if (email != null) builder.claim("email", email);

        var authentication = converter.convert(builder.build());

        assertThat(authentication.getName()).isEqualTo("test-subject");
        assertThat(authentication.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_CLIENT");
    }

    private Jwt.Builder token() {
        return Jwt.withTokenValue("test-token").header("alg", "HS256").subject("test-subject");
    }
}

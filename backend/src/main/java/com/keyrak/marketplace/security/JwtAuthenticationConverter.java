package com.keyrak.marketplace.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Component
public class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Set<GrantedAuthority> authorities = new LinkedHashSet<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_CLIENT"));

        Object roleClaim = jwt.getClaims().get("roles");
        if (roleClaim instanceof Collection<?> roles) {
            roles.forEach(role -> addRole(authorities, role.toString()));
        } else if (roleClaim instanceof String roles) {
            for (String role : roles.split(",")) {
                addRole(authorities, role);
            }
        }

        String principalName = jwt.getClaimAsString("email");
        if (principalName == null || principalName.isBlank()) {
            principalName = jwt.getSubject();
        }
        return new JwtAuthenticationToken(jwt, authorities, principalName);
    }

    private void addRole(Set<GrantedAuthority> authorities, String role) {
        String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
        if (!normalizedRole.isEmpty()) {
            String authority = normalizedRole.startsWith("ROLE_")
                    ? normalizedRole
                    : "ROLE_" + normalizedRole;
            authorities.add(new SimpleGrantedAuthority(authority));
        }
    }
}

package com.keyrak.marketplace.security;

import com.keyrak.marketplace.service.UserService;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtUserSynchronizationFilter extends OncePerRequestFilter {

    private final UserService userService;

    public JwtUserSynchronizationFilter(UserService userService) {
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication
                && authentication.isAuthenticated()) {
            try {
                User user = userService.synchronizeGoogleUser(jwtAuthentication.getToken());
                // Roles in a still-valid JWT may predate an admin's role change.
                var authorities = new ArrayList<SimpleGrantedAuthority>();
                authorities.add(new SimpleGrantedAuthority("ROLE_CLIENT"));
                if (user.getRole() == UserRole.ADMIN) authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                var current = new JwtAuthenticationToken(jwtAuthentication.getToken(), authorities, jwtAuthentication.getName());
                current.setDetails(jwtAuthentication.getDetails());
                SecurityContextHolder.getContext().setAuthentication(current);
            } catch (InvalidGoogleIdentityException exception) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpStatus.UNAUTHORIZED.value(), exception.getMessage());
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}

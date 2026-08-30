package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import java.time.Instant;
import java.util.UUID;

/** Deliberately excludes Google identifiers and private identity-document paths. */
public record AdminUserResponse(UUID id, String displayName, String email, String telephone,
                                UserRole role, Instant createdAt) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(user.getId(), user.getDisplayName(), user.getEmail(),
                user.getTelephone(), user.getRole(), user.getCreatedAt());
    }
}

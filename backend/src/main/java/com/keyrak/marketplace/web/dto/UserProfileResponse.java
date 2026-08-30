package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String displayName,
        String telephone,
        String idCardUrl,
        String avatarUrl,
        UserRole role
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getTelephone(),
                user.getIdCardUrl(),
                user.getAvatarUrl(),
                user.getRole()
        );
    }
}

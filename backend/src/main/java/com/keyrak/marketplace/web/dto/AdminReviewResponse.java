package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Review;

import java.time.Instant;
import java.util.UUID;

/** Admin-only review context. Never includes private ID-document paths. */
public record AdminReviewResponse(
        UUID id,
        UUID authorId,
        String authorName,
        String authorEmail,
        String authorTelephone,
        String authorAvatarUrl,
        int rating,
        String comment,
        Instant createdAt,
        Instant updatedAt,
        PropertyResponse property
) {
    public static AdminReviewResponse from(Review review) {
        return new AdminReviewResponse(review.getId(), review.getUser().getId(),
                review.getUser().getDisplayName(), review.getUser().getEmail(), review.getUser().getTelephone(),
                review.getUser().getAvatarUrl(), review.getRating(), review.getComment(),
                review.getCreatedAt(), review.getUpdatedAt(), PropertyResponse.from(review.getProperty()));
    }
}

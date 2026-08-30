package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Review;

import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID propertyId,
        UUID authorId,
        String authorName,
        String authorAvatarUrl,
        Integer rating,
        String comment,
        Instant createdAt,
        Instant updatedAt
) {
    public static ReviewResponse from(Review review) {
        String authorName = review.getUser().getDisplayName();
        if (authorName == null || authorName.isBlank()) {
            authorName = "KEYRAK guest";
        }
        return new ReviewResponse(
                review.getId(),
                review.getProperty().getId(),
                review.getUser().getId(),
                authorName,
                review.getUser().getAvatarUrl(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}

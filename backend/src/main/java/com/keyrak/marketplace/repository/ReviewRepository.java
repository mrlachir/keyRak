package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<Review> findByPropertyIdOrderByCreatedAtDesc(UUID propertyId);

    boolean existsByPropertyIdAndUserId(UUID propertyId, UUID userId);
}

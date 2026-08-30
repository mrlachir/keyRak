package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.WishlistEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface WishlistRepository extends JpaRepository<WishlistEntry, UUID> {
    boolean existsByUserIdAndPropertyId(UUID userId, UUID propertyId);

    void deleteByUserIdAndPropertyId(UUID userId, UUID propertyId);

    @EntityGraph(attributePaths = "property")
    List<WishlistEntry> findByUserIdAndPropertyActiveTrueOrderByCreatedAtDesc(UUID userId);

    @Query("select w.property.id from WishlistEntry w where w.user.id = :userId")
    List<UUID> findPropertyIds(@Param("userId") UUID userId);
}

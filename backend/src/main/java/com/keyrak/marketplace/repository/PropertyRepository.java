package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface PropertyRepository extends JpaRepository<Property, UUID>, JpaSpecificationExecutor<Property> {

    long countByActiveTrue();

    @Query("select count(p) from Property p where p.isFeatured = true")
    long countFeatured();

    @Query("select p from Property p where p.isFeatured = true and p.active = true order by p.updatedAt desc, p.id")
    List<Property> findFeatured();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select property from Property property where property.id = :id")
    Optional<Property> findByIdForUpdate(@Param("id") UUID id);
}

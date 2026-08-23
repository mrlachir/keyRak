package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.PropertyMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PropertyMediaRepository extends JpaRepository<PropertyMedia, UUID> {
}

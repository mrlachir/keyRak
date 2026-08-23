package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Integer> {

    Optional<Tag> findByNameIgnoreCase(String name);
}

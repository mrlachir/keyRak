package com.keyrak.marketplace.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

/** A single database mutex serializes feature selection across API instances. */
@Entity
@Table(name = "catalog_locks")
@NoArgsConstructor
public class CatalogLock {
    @Id
    private Integer id;
}

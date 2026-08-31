package com.keyrak.marketplace.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;

/** Retains only a subject fingerprint and cutoff, not the deleted profile or document. */
@Entity
@Table(name = "account_session_revocations")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AccountSessionRevocation {
    @Id
    @Column(name = "subject_hash", length = 64)
    private String subjectHash;

    @Column(name = "revoked_before", nullable = false)
    private Instant revokedBefore;
}

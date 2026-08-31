package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.AccountSessionRevocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountSessionRevocationRepository extends JpaRepository<AccountSessionRevocation, String> {}

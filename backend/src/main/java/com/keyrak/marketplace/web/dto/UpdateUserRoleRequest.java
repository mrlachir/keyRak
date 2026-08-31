package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.enumeration.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(@NotNull UserRole role) {}

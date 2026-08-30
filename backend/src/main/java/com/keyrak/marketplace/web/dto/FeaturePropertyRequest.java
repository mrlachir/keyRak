package com.keyrak.marketplace.web.dto;

import jakarta.validation.constraints.NotNull;

public record FeaturePropertyRequest(@NotNull Boolean isFeatured) {}

package com.keyrak.marketplace.web.dto;

import jakarta.validation.constraints.NotNull;

public record CancellationDecisionRequest(@NotNull Boolean approved) {
}

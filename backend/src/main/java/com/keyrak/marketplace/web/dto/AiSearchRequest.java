package com.keyrak.marketplace.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiSearchRequest(
        @NotBlank(message = "Search query is required")
        @Size(max = 500, message = "Search query must not exceed 500 characters")
        String query
) {
}

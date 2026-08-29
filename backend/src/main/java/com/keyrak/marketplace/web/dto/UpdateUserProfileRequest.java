package com.keyrak.marketplace.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 150, message = "Full name must contain at most 150 characters")
        String fullName,

        @NotBlank(message = "Telephone is required")
        @Size(max = 32, message = "Telephone must contain at most 32 characters")
        @Pattern(
                regexp = "^[+0-9() .-]{7,32}$",
                message = "Telephone contains unsupported characters"
        )
        String telephone
) {
}

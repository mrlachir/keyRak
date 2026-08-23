package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.enumeration.PropertyType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AiDescriptionRequest(
        @NotBlank @Size(max = 180) String title,
        @NotNull PropertyType propertyType,
        @NotBlank @Size(max = 100) String city,
        @Min(1) @Max(100) int maxGuests,
        @Min(0) @Max(100) int bedrooms,
        @Min(0) @Max(100) int bathrooms,
        @NotEmpty @Size(max = 30) List<@NotBlank @Size(max = 80) String> amenities
) {
    public String toPropertyFacts() {
        return "Title: %s; Type: %s; City: %s; Maximum guests: %d; Bedrooms: %d; Bathrooms: %d; Amenities: %s"
                .formatted(
                        title.trim(),
                        propertyType,
                        city.trim(),
                        maxGuests,
                        bedrooms,
                        bathrooms,
                        String.join(", ", amenities)
                );
    }
}

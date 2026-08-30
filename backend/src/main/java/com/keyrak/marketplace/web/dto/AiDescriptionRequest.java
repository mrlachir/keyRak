package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.enumeration.PropertyType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.math.BigDecimal;

public record AiDescriptionRequest(
        @NotBlank @Size(max = 180) String title,
        @NotNull PropertyType propertyType,
        @NotBlank @Size(max = 100) String city,
        @Size(max = 255) String address,
        @DecimalMin("1.00") @DecimalMax("1000000.00") BigDecimal pricePerNight,
        @Min(1) @Max(100) Integer maxGuests,
        @Min(0) @Max(100) Integer bedrooms,
        @Min(0) @Max(100) Integer bathrooms,
        @Size(max = 30) List<@NotBlank @Size(max = 80) String> amenities
) {
}

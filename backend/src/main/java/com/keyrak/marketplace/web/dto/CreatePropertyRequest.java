package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public record CreatePropertyRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 10_000) String description,
        @NotNull PropertyType propertyType,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 100) String city,
        @NotNull @DecimalMin("1.00") @DecimalMax("1000000.00") BigDecimal pricePerNight,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @NotNull @Min(1) @Max(100) Integer maxGuests,
        @NotNull @Min(0) @Max(100) Integer bedrooms,
        @NotNull @Min(0) @Max(100) Integer bathrooms,
        boolean active,
        @Size(max = 30) Set<@NotBlank @Size(max = 80) String> tagNames,
        @Size(max = 40) List<@NotNull @Valid MediaInput> media
) {
    public record MediaInput(
            @NotBlank @Size(max = 2048) String url,
            @NotNull PropertyMediaType type,
            @Min(0) Integer displayOrder
    ) {
    }
}

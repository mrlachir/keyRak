package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.enumeration.PaymentMethod;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateBookingRequest(
        @NotNull UUID propertyId,
        @NotNull @FutureOrPresent LocalDate checkInDate,
        @NotNull @Future LocalDate checkOutDate,
        @NotNull @Min(1) @Max(100) Integer adults,
        @NotNull @Min(0) @Max(100) Integer children,
        @NotNull PaymentMethod paymentMethod,
        @Size(max = 2_000) String specialRequests
) {
}

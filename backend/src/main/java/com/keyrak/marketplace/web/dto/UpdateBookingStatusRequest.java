package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateBookingStatusRequest(
        @NotNull BookingStatus status
) {
}

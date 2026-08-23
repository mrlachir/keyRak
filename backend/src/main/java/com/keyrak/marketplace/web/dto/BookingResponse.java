package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        UUID userId,
        UUID propertyId,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Integer adults,
        Integer children,
        String specialRequests,
        BigDecimal totalPrice,
        BookingStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getUser().getId(),
                booking.getProperty().getId(),
                booking.getCheckInDate(),
                booking.getCheckOutDate(),
                booking.getAdults(),
                booking.getChildren(),
                booking.getSpecialRequests(),
                booking.getTotalPrice(),
                booking.getStatus(),
                booking.getCreatedAt(),
                booking.getUpdatedAt()
        );
    }
}

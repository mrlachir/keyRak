package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AdminBookingResponse(
        UUID id,
        UUID propertyId,
        String propertyTitle,
        UUID userId,
        String guestName,
        String guestEmail,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        int adults,
        int children,
        String specialRequests,
        BigDecimal totalPrice,
        BookingStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AdminBookingResponse from(Booking booking) {
        return new AdminBookingResponse(
                booking.getId(),
                booking.getProperty().getId(),
                booking.getProperty().getTitle(),
                booking.getUser().getId(),
                booking.getUser().getDisplayName(),
                booking.getUser().getEmail(),
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

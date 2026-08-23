package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.UUID;

public record TripResponse(
        UUID id,
        UUID propertyId,
        String propertyTitle,
        String propertyCity,
        String propertyImageUrl,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        int adults,
        int children,
        BigDecimal totalPrice,
        BookingStatus status,
        Instant createdAt
) {
    public static TripResponse from(Booking booking) {
        String primaryImageUrl = booking.getProperty().getMedia().stream()
                .filter(media -> media.getType() == PropertyMediaType.IMAGE)
                .min(Comparator.comparingInt(PropertyMedia::getDisplayOrder))
                .map(PropertyMedia::getUrl)
                .orElse(null);
        return new TripResponse(
                booking.getId(),
                booking.getProperty().getId(),
                booking.getProperty().getTitle(),
                booking.getProperty().getCity(),
                primaryImageUrl,
                booking.getCheckInDate(),
                booking.getCheckOutDate(),
                booking.getAdults(),
                booking.getChildren(),
                booking.getTotalPrice(),
                booking.getStatus(),
                booking.getCreatedAt()
        );
    }
}

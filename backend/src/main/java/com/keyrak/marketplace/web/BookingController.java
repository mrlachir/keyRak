package com.keyrak.marketplace.web;

import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.service.BookingService;
import com.keyrak.marketplace.web.dto.BlockedDatesResponse;
import com.keyrak.marketplace.web.dto.BookingResponse;
import com.keyrak.marketplace.web.dto.CreateBookingRequest;
import com.keyrak.marketplace.web.dto.UpdateBookingStatusRequest;
import com.keyrak.marketplace.web.dto.TripResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/api/properties/{propertyId}/blocked-dates")
    public BlockedDatesResponse getBlockedDates(@PathVariable UUID propertyId) {
        return bookingService.getBlockedDates(propertyId);
    }

    @PostMapping(value = "/api/bookings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(
            @Valid @RequestPart("booking") CreateBookingRequest request,
            @RequestPart(value = "idCard", required = false) MultipartFile idCard,
            JwtAuthenticationToken authentication
    ) {
        return bookingService.create(request, idCard, authentication.getToken().getSubject());
    }

    @GetMapping("/api/bookings/me")
    public List<TripResponse> getMyBookings(JwtAuthenticationToken authentication) {
        return bookingService.getTrips(authentication.getToken().getSubject());
    }

    @PatchMapping("/api/bookings/{bookingId}/status")
    public BookingResponse cancelPendingBooking(
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request,
            JwtAuthenticationToken authentication
    ) {
        if (request.status() != BookingStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Clients can only change a pending booking to CANCELLED"
            );
        }
        return bookingService.cancelPendingBooking(bookingId, authentication.getToken().getSubject());
    }

    @PatchMapping("/api/bookings/{bookingId}/request-cancel")
    public BookingResponse requestCancellation(
            @PathVariable UUID bookingId,
            JwtAuthenticationToken authentication
    ) {
        return bookingService.requestCancellation(bookingId, authentication.getToken().getSubject());
    }
}

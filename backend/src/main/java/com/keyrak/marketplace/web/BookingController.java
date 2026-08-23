package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.BookingService;
import com.keyrak.marketplace.web.dto.BlockedDatesResponse;
import com.keyrak.marketplace.web.dto.BookingResponse;
import com.keyrak.marketplace.web.dto.CreateBookingRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.List;
import com.keyrak.marketplace.web.dto.TripResponse;

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

    @PostMapping("/api/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            JwtAuthenticationToken authentication
    ) {
        return bookingService.create(request, authentication.getToken().getSubject());
    }

    @GetMapping("/api/bookings/me")
    public List<TripResponse> getMyBookings(JwtAuthenticationToken authentication) {
        return bookingService.getTrips(authentication.getToken().getSubject());
    }
}

package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.BookingService;
import com.keyrak.marketplace.web.dto.AdminBookingResponse;
import com.keyrak.marketplace.web.dto.AdminDashboardResponse;
import com.keyrak.marketplace.web.dto.CancellationDecisionRequest;
import com.keyrak.marketplace.web.dto.UpdateBookingStatusRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final BookingService bookingService;

    public AdminController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/dashboard/metrics")
    public AdminDashboardResponse getDashboardMetrics() {
        return bookingService.getAdminDashboard();
    }

    @GetMapping("/bookings")
    public List<AdminBookingResponse> getPendingBookings() {
        return bookingService.getAdminReviewQueue();
    }

    @PatchMapping("/bookings/{bookingId}/status")
    public AdminBookingResponse updateBookingStatus(
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request
    ) {
        return bookingService.updatePendingStatus(bookingId, request.status());
    }

    @PatchMapping("/bookings/{bookingId}/cancellation-request")
    public AdminBookingResponse moderateCancellationRequest(
            @PathVariable UUID bookingId,
            @Valid @RequestBody CancellationDecisionRequest request
    ) {
        return bookingService.moderateCancellationRequest(bookingId, request.approved());
    }
}

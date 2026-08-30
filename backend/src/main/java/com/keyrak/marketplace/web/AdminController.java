package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.BookingService;
import com.keyrak.marketplace.service.PropertyService;
import com.keyrak.marketplace.service.ReviewService;
import com.keyrak.marketplace.web.dto.AdminReviewResponse;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.web.dto.AdminUserResponse;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final PropertyService propertyService;
    private final UserRepository userRepository;
    private final ReviewService reviewService;

    public AdminController(BookingService bookingService, PropertyService propertyService, UserRepository userRepository, ReviewService reviewService) {
        this.bookingService = bookingService;
        this.propertyService = propertyService;
        this.userRepository = userRepository;
        this.reviewService = reviewService;
    }

    @GetMapping("/dashboard/metrics")
    public AdminDashboardResponse getDashboardMetrics() {
        return bookingService.getAdminDashboard();
    }

    @GetMapping("/bookings")
    public List<AdminBookingResponse> getBookings(@RequestParam(defaultValue = "false") boolean all) {
        return all ? bookingService.getAllAdminBookings() : bookingService.getAdminReviewQueue();
    }

    @GetMapping("/properties")
    public List<PropertyResponse> getProperties() { return propertyService.listAdmin(); }

    @GetMapping("/reviews")
    public List<AdminReviewResponse> getReviews() { return reviewService.listAdmin(); }

    @GetMapping("/properties/{id}")
    public PropertyResponse getProperty(@PathVariable UUID id) { return propertyService.getAdmin(id); }

    @GetMapping("/users")
    public List<AdminUserResponse> getUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(AdminUserResponse::from).toList();
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

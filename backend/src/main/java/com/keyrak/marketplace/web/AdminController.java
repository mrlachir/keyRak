package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.BookingService;
import com.keyrak.marketplace.service.PropertyService;
import com.keyrak.marketplace.service.ReviewService;
import com.keyrak.marketplace.web.dto.AdminReviewResponse;
import com.keyrak.marketplace.service.AdminUserService;
import com.keyrak.marketplace.web.dto.UpdateUserRoleRequest;
import com.keyrak.marketplace.web.dto.AdminUserResponse;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private final AdminUserService adminUserService;
    private final ReviewService reviewService;

    public AdminController(BookingService bookingService, PropertyService propertyService, AdminUserService adminUserService, ReviewService reviewService) {
        this.bookingService = bookingService;
        this.propertyService = propertyService;
        this.adminUserService = adminUserService;
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
        return adminUserService.list();
    }

    @GetMapping("/users/{id}")
    public AdminUserResponse getUser(@PathVariable UUID id) { return adminUserService.get(id); }

    @PatchMapping("/users/{id}/role")
    public AdminUserResponse updateUserRole(@PathVariable UUID id, @Valid @RequestBody UpdateUserRoleRequest request,
                                             JwtAuthenticationToken authentication) {
        return adminUserService.updateRole(id, request.role(), authentication.getToken().getSubject());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id, JwtAuthenticationToken authentication) {
        adminUserService.delete(id, authentication.getToken().getSubject());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{id}/id-card")
    public ResponseEntity<Resource> getUserIdCard(@PathVariable UUID id) {
        var document = adminUserService.getIdCard(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(document.filename()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(document.contentType()).body(document.resource());
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

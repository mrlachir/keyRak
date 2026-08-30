package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Notification;
import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Review;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.NotificationRepository;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.web.dto.NotificationInboxResponse;
import com.keyrak.marketplace.web.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyAdminsOfReview(Review review) {
        notificationRepository.saveAll(userRepository.findByRole(UserRole.ADMIN).stream()
                .map(admin -> Notification.builder().user(admin)
                        .message("New review added for " + review.getProperty().getTitle())
                        .targetUrl("/admin/bookings?tab=reviews&review=" + review.getId()).build()).toList());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyBookingApproved(Booking booking) {
        notificationRepository.save(Notification.builder().user(booking.getUser())
                .message("Your booking is approved for " + booking.getProperty().getTitle())
                .targetUrl("/profile#booking-" + booking.getId()).build());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyCancellationApproved(Booking booking) {
        notificationRepository.save(Notification.builder().user(booking.getUser())
                .message("Your cancellation is approved for " + booking.getProperty().getTitle())
                .targetUrl("/profile#booking-" + booking.getId()).build());
    }

    @Transactional(readOnly = true)
    public NotificationInboxResponse inbox(String subject) {
        UUID userId = userService.getByGoogleSubject(subject).getId();
        return new NotificationInboxResponse(notificationRepository.countByUserIdAndReadFalse(userId),
                notificationRepository.findTop20ByUserIdAndReadFalseOrderByCreatedAtDescIdDesc(userId).stream()
                        .map(NotificationResponse::from).toList());
    }

    @Transactional
    public void markRead(String subject, UUID id) {
        UUID userId = userService.getByGoogleSubject(subject).getId();
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(String subject) {
        notificationRepository.markAllRead(userService.getByGoogleSubject(subject).getId());
    }
}

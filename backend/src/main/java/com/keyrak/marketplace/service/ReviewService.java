package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.Review;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.ReviewRepository;
import com.keyrak.marketplace.web.dto.CreateReviewRequest;
import com.keyrak.marketplace.web.dto.ReviewResponse;
import com.keyrak.marketplace.web.dto.AdminReviewResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    public ReviewService(
            ReviewRepository reviewRepository,
            BookingRepository bookingRepository,
            PropertyRepository propertyRepository,
            UserService userService,
            NotificationService notificationService
    ) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<AdminReviewResponse> listAdmin() {
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream().map(AdminReviewResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> listForProperty(UUID propertyId) {
        if (!propertyRepository.existsById(propertyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        return reviewRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    @Transactional
    public ReviewResponse create(UUID propertyId, CreateReviewRequest request, String googleSubject) {
        User user = userService.getByGoogleSubject(googleSubject);
        Property property = propertyRepository.findById(propertyId)
                .filter(Property::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));

        boolean startedStay = bookingRepository
                .existsByPropertyIdAndUserIdAndStatusAndCheckInDateLessThanEqual(
                        propertyId,
                        user.getId(),
                        BookingStatus.CONFIRMED,
                        LocalDate.now()
                );
        if (!startedStay) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can review confirmed stays from your check-in date."
            );
        }
        if (reviewRepository.existsByPropertyIdAndUserId(propertyId, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already reviewed this property");
        }

        Review review = Review.builder()
                .property(property)
                .user(user)
                .rating(request.rating())
                .comment(request.comment().trim())
                .build();
        Review savedReview = reviewRepository.saveAndFlush(review);
        notificationService.notifyAdminsOfReview(savedReview);
        return ReviewResponse.from(savedReview);
    }

    @Transactional
    public void delete(UUID reviewId, String googleSubject) {
        User user = userService.getByGoogleSubject(googleSubject);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        boolean isAuthor = review.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the review author or an administrator can remove it");
        }
        reviewRepository.delete(review);
    }
}

package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.ReviewService;
import com.keyrak.marketplace.web.dto.CreateReviewRequest;
import com.keyrak.marketplace.web.dto.ReviewResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/api/properties/{propertyId}/reviews")
    public List<ReviewResponse> listReviews(@PathVariable UUID propertyId) {
        return reviewService.listForProperty(propertyId);
    }

    @PostMapping("/api/properties/{propertyId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse createReview(
            @PathVariable UUID propertyId,
            @Valid @RequestBody CreateReviewRequest request,
            JwtAuthenticationToken authentication
    ) {
        return reviewService.create(propertyId, request, authentication.getToken().getSubject());
    }

    @DeleteMapping("/api/reviews/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(
            @PathVariable UUID reviewId,
            JwtAuthenticationToken authentication
    ) {
        reviewService.delete(reviewId, authentication.getToken().getSubject());
    }
}

package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.security.InvalidGoogleIdentityException;
import com.keyrak.marketplace.web.dto.UpdateUserProfileRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BookingDocumentStorageService documentStorageService;

    public UserService(UserRepository userRepository, BookingDocumentStorageService documentStorageService) {
        this.userRepository = userRepository;
        this.documentStorageService = documentStorageService;
    }

    @Transactional
    public User synchronizeGoogleUser(Jwt jwt) {
        String googleSubject = requiredClaim(jwt.getSubject(), "JWT subject");
        String email = normalizeEmail(jwt.getClaimAsString("email"));
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        if (Boolean.FALSE.equals(emailVerified)) {
            throw new InvalidGoogleIdentityException("The Google email address is not verified");
        }

        Optional<User> bySubject = userRepository.findByGoogleSubject(googleSubject);
        Optional<User> byEmail = userRepository.findByEmailIgnoreCase(email);
        if (bySubject.isPresent() && byEmail.isPresent()
                && !bySubject.get().getId().equals(byEmail.get().getId())) {
            throw new InvalidGoogleIdentityException("The Google identity conflicts with an existing account");
        }

        User user = bySubject.or(() -> byEmail).orElseGet(() -> User.builder()
                .role(UserRole.CLIENT)
                .build());

        if (user.getGoogleSubject() != null && !user.getGoogleSubject().equals(googleSubject)) {
            throw new InvalidGoogleIdentityException("The email address belongs to another Google identity");
        }

        user.setGoogleSubject(googleSubject);
        user.setEmail(email);
        if (user.getDisplayName() == null || user.getDisplayName().isBlank()) {
            user.setDisplayName(trimToLength(jwt.getClaimAsString("name"), 150));
        }
        user.setAvatarUrl(trimToLength(jwt.getClaimAsString("picture"), 2048));
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getByGoogleSubject(String googleSubject) {
        return userRepository.findByGoogleSubject(googleSubject)
                .orElseThrow(() -> new InvalidGoogleIdentityException("Authenticated user was not synchronized"));
    }

    @Transactional
    public User updateProfile(String googleSubject, UpdateUserProfileRequest request) {
        User user = getByGoogleSubject(googleSubject);
        user.setDisplayName(request.fullName().trim());
        user.setTelephone(request.telephone().trim());
        return userRepository.save(user);
    }

    public boolean isProfileComplete(User user) {
        return user.getDisplayName() != null
                && !user.getDisplayName().isBlank()
                && user.getTelephone() != null
                && !user.getTelephone().isBlank();
    }

    public boolean hasIdCard(User user) {
        return user.getIdCardUrl() != null && !user.getIdCardUrl().isBlank();
    }

    @Transactional
    public User updateIdCard(String googleSubject, MultipartFile file) {
        User user = userRepository.findByGoogleSubjectForUpdate(googleSubject)
                .orElseThrow(() -> new InvalidGoogleIdentityException("Authenticated user was not synchronized"));
        String previousUrl = user.getIdCardUrl();
        String newUrl = documentStorageService.store(file);
        // Booking uploads join this transaction: retain the old file until the whole transaction commits.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                documentStorageService.deleteQuietly(status == STATUS_COMMITTED ? previousUrl : newUrl);
            }
        });
        user.setIdCardUrl(newUrl);
        return userRepository.saveAndFlush(user);
    }

    private String normalizeEmail(String email) {
        String normalized = requiredClaim(email, "email").toLowerCase(Locale.ROOT);
        if (normalized.length() > 320 || !normalized.contains("@")) {
            throw new InvalidGoogleIdentityException("The token contains an invalid email address");
        }
        return normalized;
    }

    private String requiredClaim(String value, String claimName) {
        if (value == null || value.isBlank()) {
            throw new InvalidGoogleIdentityException("The token is missing the " + claimName + " claim");
        }
        return value.trim();
    }

    private String trimToLength(String value, int maximumLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maximumLength ? trimmed : trimmed.substring(0, maximumLength);
    }
}

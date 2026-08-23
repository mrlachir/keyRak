package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.security.InvalidGoogleIdentityException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
        user.setDisplayName(trimToLength(jwt.getClaimAsString("name"), 150));
        user.setAvatarUrl(trimToLength(jwt.getClaimAsString("picture"), 2048));
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getByGoogleSubject(String googleSubject) {
        return userRepository.findByGoogleSubject(googleSubject)
                .orElseThrow(() -> new InvalidGoogleIdentityException("Authenticated user was not synchronized"));
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

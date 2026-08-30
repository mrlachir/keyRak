package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.entity.WishlistEntry;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.repository.WishlistRepository;
import com.keyrak.marketplace.security.InvalidGoogleIdentityException;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WishlistService {
    private final WishlistRepository wishlistRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<PropertyResponse> list(String subject) {
        UUID userId = userService.getByGoogleSubject(subject).getId();
        return wishlistRepository.findByUserIdAndPropertyActiveTrueOrderByCreatedAtDesc(userId).stream()
                .map(entry -> PropertyResponse.from(entry.getProperty())).toList();
    }

    @Transactional(readOnly = true)
    public List<UUID> ids(String subject) {
        return wishlistRepository.findPropertyIds(userService.getByGoogleSubject(subject).getId());
    }

    @Transactional
    public void add(String subject, UUID propertyId) {
        // Same lock order as checkout: property first, then user. Serializes saves and deletion.
        Property property = propertyRepository.findByIdForUpdate(propertyId).filter(Property::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property is no longer available"));
        User user = lockUser(subject);
        if (!wishlistRepository.existsByUserIdAndPropertyId(user.getId(), propertyId)) {
            wishlistRepository.saveAndFlush(WishlistEntry.builder().user(user).property(property).build());
        }
    }

    @Transactional
    public void remove(String subject, UUID propertyId) {
        User user = lockUser(subject);
        wishlistRepository.deleteByUserIdAndPropertyId(user.getId(), propertyId);
    }

    private User lockUser(String subject) {
        return userRepository.findByGoogleSubjectForUpdate(subject)
                .orElseThrow(() -> new InvalidGoogleIdentityException("Authenticated user was not synchronized"));
    }
}

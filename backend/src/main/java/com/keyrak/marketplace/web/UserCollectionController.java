package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.NotificationService;
import com.keyrak.marketplace.service.WishlistService;
import com.keyrak.marketplace.web.dto.NotificationInboxResponse;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserCollectionController {
    private final WishlistService wishlistService;
    private final NotificationService notificationService;

    @GetMapping("/wishlist")
    public List<PropertyResponse> wishlist(JwtAuthenticationToken auth) {
        return wishlistService.list(auth.getToken().getSubject());
    }

    @GetMapping("/wishlist/ids")
    public List<UUID> wishlistIds(JwtAuthenticationToken auth) {
        return wishlistService.ids(auth.getToken().getSubject());
    }

    @PostMapping("/wishlist/{propertyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveProperty(@PathVariable UUID propertyId, JwtAuthenticationToken auth) {
        wishlistService.add(auth.getToken().getSubject(), propertyId);
    }

    @DeleteMapping("/wishlist/{propertyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeProperty(@PathVariable UUID propertyId, JwtAuthenticationToken auth) {
        wishlistService.remove(auth.getToken().getSubject(), propertyId);
    }

    @GetMapping("/notifications")
    public NotificationInboxResponse notifications(JwtAuthenticationToken auth) {
        return notificationService.inbox(auth.getToken().getSubject());
    }

    @PatchMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable UUID id, JwtAuthenticationToken auth) {
        notificationService.markRead(auth.getToken().getSubject(), id);
    }

    @PatchMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(JwtAuthenticationToken auth) {
        notificationService.markAllRead(auth.getToken().getSubject());
    }
}

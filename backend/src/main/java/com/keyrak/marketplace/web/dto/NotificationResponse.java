package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Notification;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(UUID id, String message, boolean isRead, Instant createdAt, String targetUrl) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getMessage(), notification.isRead(), notification.getCreatedAt(), notification.getTargetUrl());
    }
}

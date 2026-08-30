package com.keyrak.marketplace.web.dto;

import java.util.List;

public record NotificationInboxResponse(long unreadCount, List<NotificationResponse> notifications) {}

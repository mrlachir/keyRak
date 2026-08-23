package com.keyrak.marketplace.web.dto;

import java.math.BigDecimal;

public record AdminDashboardResponse(
        long totalActiveProperties,
        long pendingBookingRequests,
        BigDecimal estimatedRevenue
) {
}

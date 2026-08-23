package com.keyrak.marketplace.web.dto;

import java.time.LocalDate;
import java.util.List;

public record BlockedDatesResponse(List<LocalDate> blockedDates) {
}

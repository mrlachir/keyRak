package com.keyrak.marketplace.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record AiSearchResponse(
        String keyword,
        String location,
        List<String> tags,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Integer guests,
        Integer bedrooms,
        Integer bathrooms,
        String checkInDate,
        String checkOutDate
) {
}

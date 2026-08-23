package com.keyrak.marketplace.web.dto;

import java.util.List;

public record AiSearchResponse(
        String location,
        Integer guests,
        List<String> amenities
) {
}

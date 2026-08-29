package com.keyrak.marketplace.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keyrak.marketplace.config.GroqProperties;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@Slf4j
public class AiService {

    private static final String SEARCH_SYSTEM_PROMPT = """
            You are a precise real estate search parser. Convert the user's complete request into one JSON object.
            Always return exactly these keys: keyword, location, tags, minPrice, maxPrice, guests, bedrooms,
            bathrooms, checkInDate, checkOutDate.

            Rules:
            - keyword is only for free-text property terms not represented by another filter. Never copy the full
              user request or labeled fields into keyword. Use null when no independent keyword remains.
            - location is the requested city, district, neighborhood, or address. "Location name" maps to location.
            - tags is an array containing only requested amenities. Prefer these catalog names when applicable:
              Air conditioning, Breakfast, Garden, Hammam, Mountain view, Parking, Private pool, Rooftop, Wi-Fi,
              Workspace. "Tags" and "amenities" both map to tags.
            - "Max persons", capacity, people, or guests maps to guests.
            - Minimum price maps to minPrice and maximum price maps to maxPrice. Prices are nightly MAD amounts.
            - Bedrooms and bathrooms are integer counts.
            - Check-in and check-out must be returned as ISO dates in YYYY-MM-DD format. Convert dates such as
              29/08/2026 to 2026-08-29.
            - The input may be a natural sentence or a comma-separated list of labeled fields. Parse every field,
              even when many filters are supplied together.
            - Use null for every scalar value that is not mentioned and null for tags when no amenity is mentioned.
            - Output only valid JSON. Do not add Markdown, comments, or explanatory text.
            """;
    private static final List<DateTimeFormatter> ACCEPTED_DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/uuuu"),
            DateTimeFormatter.ofPattern("d-M-uuuu"),
            DateTimeFormatter.ofPattern("d.M.uuuu")
    );
    private static final String DESCRIPTION_SYSTEM_PROMPT = "You are an expert real estate copywriter. Write a "
            + "highly converting, luxurious marketing description for a property based on the provided amenities "
            + "and details. Do not use Markdown wrapping. Output only the description text.";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final GroqProperties properties;

    public AiService(RestTemplate restTemplate, ObjectMapper objectMapper, GroqProperties properties) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public AiSearchResponse generateSemanticSearchFilters(String naturalLanguageQuery) {
        String query = requirePrompt(naturalLanguageQuery, "Search query");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", configuredModel());
        payload.put("response_format", Map.of("type", "json_object"));
        payload.put("messages", List.of(
                message("system", SEARCH_SYSTEM_PROMPT),
                message("user", query)
        ));

        String json = callGroq(payload);
        try {
            return normalizeSearchResponse(objectMapper.readValue(json, AiSearchResponse.class), query);
        } catch (JsonProcessingException exception) {
            log.error("Groq search output could not be parsed as the expected JSON object. Raw content: {}", json, exception);
            throw new AiServiceException("Groq returned invalid search-filter JSON", exception);
        }
    }

    public String generatePropertyDescription(String propertyFacts) {
        String details = requirePrompt(propertyFacts, "Property details");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", configuredModel());
        payload.put("messages", List.of(
                message("system", DESCRIPTION_SYSTEM_PROMPT),
                message("user", details)
        ));
        return callGroq(payload).trim();
    }

    private Map<String, String> message(String role, String content) {
        return Map.of("role", role, "content", content);
    }

    private String callGroq(Map<String, Object> payload) {
        String apiKey = requiredConfiguration(properties.apiKey(), "GROQ_API_KEY");
        URI endpoint = properties.endpoint();
        if (endpoint == null) {
            log.error("Groq configuration is missing app.ai.groq.endpoint");
            throw new AiServiceException("Groq endpoint is not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint,
                    HttpMethod.POST,
                    new HttpEntity<>(payload, headers),
                    String.class
            );
            return extractContent(response.getBody());
        } catch (HttpStatusCodeException exception) {
            log.error(
                    "Groq request failed with HTTP {}. Response body: {}",
                    exception.getStatusCode().value(),
                    exception.getResponseBodyAsString(),
                    exception
            );
            throw new AiServiceException(
                    "Groq request failed with HTTP " + exception.getStatusCode().value(),
                    exception
            );
        } catch (RestClientException exception) {
            log.error("Groq request could not be completed. Endpoint: {}", endpoint, exception);
            throw new AiServiceException("Groq request could not be completed", exception);
        }
    }

    private String extractContent(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            log.error("Groq returned an empty HTTP response body");
            throw new AiServiceException("Groq returned an empty response");
        }

        try {
            JsonNode content = objectMapper.readTree(responseBody)
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content");
            if (!content.isTextual() || content.asText().isBlank()) {
                log.error("Groq response did not contain choices[0].message.content. Raw response: {}", responseBody);
                throw new AiServiceException("Groq response did not contain generated content");
            }
            return content.asText().trim();
        } catch (JsonProcessingException exception) {
            log.error("Groq returned malformed response JSON. Raw response: {}", responseBody, exception);
            throw new AiServiceException("Groq returned malformed response JSON", exception);
        }
    }

    private AiSearchResponse normalizeSearchResponse(AiSearchResponse generated, String originalQuery) {
        String keyword = normalizeKeyword(generated.keyword(), originalQuery);
        String location = nullableTrim(generated.location(), 100);
        List<String> tags = generated.tags() == null
                ? null
                : generated.tags().stream()
                        .filter(Objects::nonNull)
                        .map(value -> nullableTrim(value, 80))
                        .filter(Objects::nonNull)
                        .distinct()
                        .limit(12)
                        .toList();
        BigDecimal minPrice = nonNegativePrice(generated.minPrice());
        BigDecimal maxPrice = nonNegativePrice(generated.maxPrice());
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            BigDecimal originalMinimum = minPrice;
            minPrice = maxPrice;
            maxPrice = originalMinimum;
        }

        return new AiSearchResponse(
                keyword,
                location,
                tags,
                minPrice,
                maxPrice,
                positiveGuestCount(generated.guests()),
                positiveRoomCount(generated.bedrooms()),
                positiveRoomCount(generated.bathrooms()),
                normalizeDate(generated.checkInDate()),
                normalizeDate(generated.checkOutDate())
        );
    }

    private String requirePrompt(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " must not be blank");
        }
        return value.trim();
    }

    private String requiredConfiguration(String value, String environmentVariable) {
        if (value == null || value.isBlank()) {
            log.error(
                    "Groq configuration is missing {}. In Docker Compose, provide it through the matching secret.",
                    environmentVariable
            );
            throw new AiServiceException(environmentVariable + " is not configured");
        }
        return value.trim();
    }

    private String configuredModel() {
        return requiredConfiguration(properties.model(), "GROQ_MODEL");
    }

    private String nullableTrim(String value, int maximumLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maximumLength ? trimmed : trimmed.substring(0, maximumLength);
    }

    private BigDecimal nonNegativePrice(BigDecimal value) {
        return value == null || value.signum() < 0 ? null : value;
    }

    private Integer positiveRoomCount(Integer value) {
        return value == null || value <= 0 ? null : Math.min(value, 100);
    }

    private Integer positiveGuestCount(Integer value) {
        return value == null || value <= 0 ? null : Math.min(value, 50);
    }

    private String normalizeDate(String value) {
        String date = nullableTrim(value, 32);
        if (date == null) {
            return null;
        }
        for (DateTimeFormatter formatter : ACCEPTED_DATE_FORMATS) {
            try {
                return LocalDate.parse(date, formatter).format(DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ignored) {
                // Try the next accepted user/model format.
            }
        }
        log.warn("Groq returned an unsupported search date format: {}", date);
        return null;
    }

    private String normalizeKeyword(String value, String originalQuery) {
        String keyword = nullableTrim(value, 200);
        if (keyword == null) {
            return null;
        }

        String normalizedKeyword = keyword.toLowerCase(Locale.ROOT);
        String normalizedQuery = originalQuery.toLowerCase(Locale.ROOT);
        long labeledFields = List.of(
                        "location", "tags", "amenities", "max persons", "guests", "bedrooms", "bathrooms",
                        "minimum price", "maximum price", "check-in", "check-out"
                ).stream()
                .filter(normalizedQuery::contains)
                .count();
        boolean copiedStructuredRequest = labeledFields >= 2
                && (normalizedKeyword.contains(":")
                || normalizedKeyword.length() > 80
                || normalizedKeyword.equals(normalizedQuery));
        return copiedStructuredRequest ? null : keyword;
    }
}

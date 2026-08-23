package com.keyrak.marketplace.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keyrak.marketplace.config.AiProperties;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.StreamSupport;

@Service
public class AiService {

    private static final Map<String, Object> SEARCH_FILTER_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "location", Map.of(
                            "type", "string",
                            "description", "Requested Marrakesh location or neighborhood"
                    ),
                    "guests", Map.of(
                            "type", "integer",
                            "description", "Total number of guests, or zero when unspecified",
                            "minimum", 0,
                            "maximum", 50
                    ),
                    "amenities", Map.of(
                            "type", "array",
                            "description", "Explicitly requested amenities or property characteristics",
                            "items", Map.of("type", "string"),
                            "maxItems", 12
                    )
            ),
            "required", List.of("location", "guests", "amenities"),
            "additionalProperties", false
    );

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AiProperties properties;

    public AiService(RestTemplate restTemplate, ObjectMapper objectMapper, AiProperties properties) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public String generateContent(String prompt) {
        return callGemini(prompt, Map.of(
                "temperature", 0.3,
                "maxOutputTokens", 2048
        ));
    }

    public AiSearchResponse generateSemanticSearchFilters(String naturalLanguageQuery) {
        String prompt = """
                You are the semantic search parser for a premium Marrakesh rental marketplace.
                Extract the user's intent into the required response schema.

                Rules:
                - Use "Marrakesh" when no location is stated.
                - Guests is the total number of people; use 0 when it is not stated.
                - Amenities contains only explicitly requested amenities or characteristics, using short names.
                - Never invent requirements.

                User request: %s
                """.formatted(naturalLanguageQuery == null ? "" : naturalLanguageQuery.trim());

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.1);
        generationConfig.put("maxOutputTokens", 512);
        generationConfig.put("responseFormat", Map.of(
                "text", Map.of(
                        "mimeType", "application/json",
                        "schema", SEARCH_FILTER_SCHEMA
                )
        ));

        String json = removeMarkdownFence(callGemini(prompt, generationConfig));
        try {
            AiSearchResponse generated = objectMapper.readValue(json, AiSearchResponse.class);
            String location = generated.location() == null || generated.location().isBlank()
                    ? "Marrakesh"
                    : trimToLength(generated.location(), 100);
            Integer guests = generated.guests() == null || generated.guests() <= 0
                    ? null
                    : Math.min(generated.guests(), 50);
            List<String> amenities = generated.amenities() == null
                    ? List.of()
                    : generated.amenities().stream()
                            .filter(Objects::nonNull)
                            .map(value -> trimToLength(value, 80))
                            .filter(value -> !value.isBlank())
                            .distinct()
                            .limit(12)
                            .toList();
            return new AiSearchResponse(location, guests, amenities);
        } catch (JsonProcessingException exception) {
            throw new AiServiceException("Gemini returned search filters that did not match the schema", exception);
        }
    }

    private String callGemini(String prompt, Map<String, Object> generationConfig) {
        if (prompt == null || prompt.isBlank()) {
            throw new IllegalArgumentException("AI prompt must not be blank");
        }

        String apiKey = requiredConfiguration(properties.apiKey(), "GEMINI_API_KEY");
        String model = requiredConfiguration(properties.model(), "GEMINI_MODEL");
        if (properties.baseUrl() == null) {
            throw new AiServiceException("Gemini base URL is not configured");
        }

        URI endpoint = UriComponentsBuilder.fromUri(properties.baseUrl())
                .pathSegment("models", model + ":generateContent")
                .build()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt.trim()))
                )),
                "generationConfig", generationConfig
        );

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint,
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            );
            return extractText(response.getBody());
        } catch (HttpStatusCodeException exception) {
            throw new AiServiceException(
                    "Gemini request failed with HTTP " + exception.getStatusCode().value(),
                    exception
            );
        } catch (RestClientException exception) {
            throw new AiServiceException("Gemini request could not be completed", exception);
        }
    }

    public String generatePropertyDescription(String propertyFacts) {
        String prompt = """
                You are a premium real-estate copywriter for a modern Moroccan rental marketplace.
                Write an accurate, inviting property description based only on the facts below. Do not invent
                amenities, locations, views, or policies. Return plain text with no markdown.

                Property facts: %s
                """.formatted(propertyFacts);
        return generateContent(prompt).trim();
    }

    private String extractText(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new AiServiceException("Gemini returned an empty response");
        }

        try {
            JsonNode parts = objectMapper.readTree(responseBody)
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts");
            String text = StreamSupport.stream(parts.spliterator(), false)
                    .map(part -> part.path("text").asText(""))
                    .filter(part -> !part.isBlank())
                    .reduce((left, right) -> left + "\n" + right)
                    .orElseThrow(() -> new AiServiceException("Gemini response did not contain generated text"));
            return text.trim();
        } catch (JsonProcessingException exception) {
            throw new AiServiceException("Gemini returned malformed JSON", exception);
        }
    }

    private String requiredConfiguration(String value, String environmentVariable) {
        if (value == null || value.isBlank()) {
            throw new AiServiceException(environmentVariable + " is not configured");
        }
        return value.trim();
    }

    private String removeMarkdownFence(String value) {
        String trimmed = value.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private String trimToLength(String value, int maximumLength) {
        String trimmed = value.trim();
        return trimmed.length() <= maximumLength ? trimmed : trimmed.substring(0, maximumLength);
    }
}

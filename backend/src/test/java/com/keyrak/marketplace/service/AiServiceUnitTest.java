package com.keyrak.marketplace.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keyrak.marketplace.config.GroqProperties;
import com.keyrak.marketplace.web.dto.AiDescriptionRequest;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiServiceUnitTest {

    private static final URI ENDPOINT = URI.create("https://groq.example.test/chat/completions");
    private static final String FILTER_JSON = "{\"location\":\"Marrakesh\"}";

    @Mock private RestTemplate restTemplate;
    @Mock private ObjectMapper objectMapper;
    @Mock private GroqProperties properties;
    @InjectMocks private AiService service;

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void rejectsBlankPromptsWithoutCallingTheProvider(String query) {
        assertThatThrownBy(() -> service.generateSemanticSearchFilters(query))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Search query must not be blank");
        verifyNoInteractions(properties, restTemplate, objectMapper);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void rejectsMissingModel(String model) {
        when(properties.model()).thenReturn(model);
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("GROQ_MODEL is not configured");
        verifyNoInteractions(restTemplate, objectMapper);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void rejectsMissingApiKey(String key) {
        when(properties.model()).thenReturn("test-model");
        when(properties.apiKey()).thenReturn(key);
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("GROQ_API_KEY is not configured");
        verifyNoInteractions(restTemplate, objectMapper);
    }

    @Test
    void rejectsMissingEndpoint() {
        when(properties.model()).thenReturn("test-model");
        when(properties.apiKey()).thenReturn("test-key");
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq endpoint is not configured");
        verifyNoInteractions(restTemplate, objectMapper);
    }

    @Test
    void searchUsesJsonModeAndBearerAuthentication() throws Exception {
        stubFilters(emptyFilters());

        service.generateSemanticSearchFilters("  A quiet riad  ");

        HttpEntity<?> request = capturedRequest();
        assertThat(request.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(request.getHeaders().getFirst("Authorization")).isEqualTo("Bearer test-key");
        Map<?, ?> payload = (Map<?, ?>) request.getBody();
        assertThat(payload.get("model")).isEqualTo("test-model");
        assertThat(payload.get("response_format")).isEqualTo(Map.of("type", "json_object"));
        List<?> messages = (List<?>) payload.get("messages");
        assertThat(messages.get(1)).isEqualTo(Map.of("role", "user", "content", "A quiet riad"));
        assertThat(((Map<?, ?>) messages.get(0)).get("content").toString())
                .contains("checkInDate", "checkOutDate", "guests");
    }

    @Test
    void descriptionUsesAllProvidedFactsWithoutJsonResponseMode() throws Exception {
        AiDescriptionRequest facts = new AiDescriptionRequest(
                "Atlas home", null, "Agadir", "Beach road", new BigDecimal("900"), 4, 2, 1, List.of("Garden"));
        String details = "{\"title\":\"Atlas home\",\"city\":\"Agadir\",\"bedrooms\":2}";
        when(objectMapper.writeValueAsString(facts)).thenReturn(details);
        configureProvider();
        stubContent("  An inviting home in Agadir.  ");

        assertThat(service.generatePropertyDescription(facts)).isEqualTo("An inviting home in Agadir.");

        Map<?, ?> payload = (Map<?, ?>) capturedRequest().getBody();
        assertThat(payload.containsKey("response_format")).isFalse();
        List<?> messages = (List<?>) payload.get("messages");
        assertThat(messages.get(1)).isEqualTo(Map.of("role", "user", "content", details));
        assertThat(((Map<?, ?>) messages.get(0)).get("content").toString())
                .contains("bedrooms", "bathrooms", "pricePerNight", "amenities");
    }

    @Test
    void descriptionSerializationFailureDoesNotSendARequest() throws Exception {
        AiDescriptionRequest facts = new AiDescriptionRequest(
                "Atlas home", null, null, null, null, null, null, null, List.of());
        JsonProcessingException cause = new JsonProcessingException("invalid property data") { };
        when(objectMapper.writeValueAsString(facts)).thenThrow(cause);

        assertThatThrownBy(() -> service.generatePropertyDescription(facts))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Property details could not be prepared for the AI")
                .hasCause(cause);
        verifyNoInteractions(restTemplate, properties);
    }

    @Test
    void wrapsProviderHttpErrorsWithTheirStatusAndCause() {
        configureProvider();
        var cause = new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE);
        when(restTemplate.exchange(eq(ENDPOINT), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(cause);

        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq request failed with HTTP 503")
                .hasCause(cause);
    }

    @Test
    void wrapsConnectionFailures() {
        configureProvider();
        var cause = new ResourceAccessException("Read timed out");
        when(restTemplate.exchange(eq(ENDPOINT), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(cause);

        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq request could not be completed")
                .hasCause(cause);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void rejectsEmptyResponseBodies(String body) {
        configureProvider();
        stubHttpBody(body);
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq returned an empty response");
        verifyNoInteractions(objectMapper);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"choices\":[]}",
            "{\"choices\":[{\"message\":{\"content\":42}}]}",
            "{\"choices\":[{\"message\":{\"content\":\"   \"}}]}"})
    void rejectsMissingOrNonTextualGeneratedContent(String body) throws Exception {
        configureProvider();
        stubHttpBody(body);
        when(objectMapper.readTree(body)).thenReturn(new ObjectMapper().readTree(body));
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq response did not contain generated content");
    }

    @Test
    void rejectsMalformedProviderEnvelope() throws Exception {
        configureProvider();
        stubHttpBody("broken JSON");
        JsonProcessingException cause = new JsonProcessingException("malformed envelope") { };
        when(objectMapper.readTree("broken JSON")).thenThrow(cause);
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq returned malformed response JSON").hasCause(cause);
    }

    @Test
    void rejectsInvalidFilterJsonWithoutReturningUnusableFilters() throws Exception {
        configureProvider();
        stubContent("not a filter object");
        JsonProcessingException cause = new JsonProcessingException("invalid filters") { };
        when(objectMapper.readValue("not a filter object", AiSearchResponse.class)).thenThrow(cause);
        assertThatThrownBy(() -> service.generateSemanticSearchFilters("A riad"))
                .isInstanceOf(AiServiceException.class)
                .hasMessage("Groq returned invalid search-filter JSON").hasCause(cause);
    }

    @Test
    void preservesUnspecifiedFiltersAsNull() throws Exception {
        AiSearchResponse empty = emptyFilters();
        stubFilters(empty);
        assertThat(service.generateSemanticSearchFilters("Show available homes")).isEqualTo(empty);
    }

    @Test
    void trimsAndBoundsFieldsDeduplicatesTagsAndCorrectsReversedPrices() throws Exception {
        List<String> tags = new ArrayList<>(Arrays.asList(null, " ", " Pool ", "Pool", "x".repeat(90)));
        tags.addAll(IntStream.range(0, 15).mapToObj(i -> "Amenity " + i).toList());
        stubFilters(new AiSearchResponse(" k ", "l".repeat(110), tags,
                new BigDecimal("20000"), new BigDecimal("10000"), 75, 101, 200, null, null));

        AiSearchResponse result = service.generateSemanticSearchFilters("An inviting house");

        assertThat(result.keyword()).isEqualTo("k");
        assertThat(result.location()).hasSize(100);
        assertThat(result.tags()).hasSize(12).startsWith("Pool", "x".repeat(80)).doesNotContainNull();
        assertThat(result.minPrice()).isEqualByComparingTo("10000");
        assertThat(result.maxPrice()).isEqualByComparingTo("20000");
        assertThat(result.guests()).isEqualTo(50);
        assertThat(result.bedrooms()).isEqualTo(100);
        assertThat(result.bathrooms()).isEqualTo(100);
    }

    @Test
    void discardsNegativePricesAndNonpositiveCapacityAndBlankFields() throws Exception {
        stubFilters(new AiSearchResponse(" ", " ", List.of(" "),
                new BigDecimal("-1"), new BigDecimal("-2"), 0, -1, 0, " ", "tomorrow-ish"));
        AiSearchResponse result = service.generateSemanticSearchFilters("An affordable house");
        assertThat(result).isEqualTo(new AiSearchResponse(null, null, List.of(),
                null, null, null, null, null, null, null));
    }

    @Test
    void preservesZeroPriceAndMissingUpperPriceBound() throws Exception {
        stubFilters(new AiSearchResponse(null, " Agadir ", null,
                BigDecimal.ZERO, null, 3, 4, 5, null, null));
        AiSearchResponse result = service.generateSemanticSearchFilters("A house in Agadir");
        assertThat(result.minPrice()).isEqualByComparingTo("0");
        assertThat(result.maxPrice()).isNull();
        assertThat(result.location()).isEqualTo("Agadir");
        assertThat(result.guests()).isEqualTo(3);
        assertThat(result.bedrooms()).isEqualTo(4);
        assertThat(result.bathrooms()).isEqualTo(5);
    }

    @ParameterizedTest
    @CsvSource({"2026-08-29,2026-09-04", "29/08/2026,04/09/2026",
            "29-08-2026,04-09-2026", "29.08.2026,04.09.2026"})
    void convertsSupportedDatesToIsoForTheFrontend(String checkIn, String checkOut) throws Exception {
        stubFilters(new AiSearchResponse(null, null, null, null, null, null, null, null, checkIn, checkOut));
        AiSearchResponse result = service.generateSemanticSearchFilters("A holiday stay");
        assertThat(result.checkInDate()).isEqualTo("2026-08-29");
        assertThat(result.checkOutDate()).isEqualTo("2026-09-04");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Location: Agadir, bedrooms: 4", "location Agadir bedrooms 4"})
    void doesNotCopyALabeledRequestIntoKeyword(String query) throws Exception {
        stubFilters(new AiSearchResponse(query, "Agadir", null, null, null, null, 4, null, null, null));
        assertThat(service.generateSemanticSearchFilters(query).keyword()).isNull();
    }

    @Test
    void discardsLongCopiedStructuredKeywordButPreservesAnIndependentKeyword() throws Exception {
        stubFilters(new AiSearchResponse("x".repeat(210), null, null, null, null, null, null, null, null, null));
        assertThat(service.generateSemanticSearchFilters("Location Agadir bedrooms 4").keyword()).isNull();

        when(objectMapper.readValue(FILTER_JSON, AiSearchResponse.class)).thenReturn(
                new AiSearchResponse(" villa ", null, null, null, null, null, null, null, null, null));
        assertThat(service.generateSemanticSearchFilters("Location Agadir bedrooms 4").keyword()).isEqualTo("villa");
    }

    private AiSearchResponse emptyFilters() {
        return new AiSearchResponse(null, null, null, null, null, null, null, null, null, null);
    }

    private void configureProvider() {
        when(properties.model()).thenReturn(" test-model ");
        when(properties.apiKey()).thenReturn(" test-key ");
        when(properties.endpoint()).thenReturn(ENDPOINT);
    }

    private void stubFilters(AiSearchResponse filters) throws Exception {
        configureProvider();
        stubContent(FILTER_JSON);
        when(objectMapper.readValue(FILTER_JSON, AiSearchResponse.class)).thenReturn(filters);
    }

    private void stubContent(String content) throws Exception {
        // A real mapper constructs fixtures only; the service's mapper and HTTP client remain isolated mocks.
        ObjectMapper fixtureMapper = new ObjectMapper();
        String body = fixtureMapper.writeValueAsString(Map.of("choices",
                List.of(Map.of("message", Map.of("content", content)))));
        stubHttpBody(body);
        when(objectMapper.readTree(body)).thenReturn(fixtureMapper.readTree(body));
    }

    private void stubHttpBody(String body) {
        when(restTemplate.exchange(eq(ENDPOINT), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(body));
    }

    private HttpEntity<?> capturedRequest() {
        ArgumentCaptor<HttpEntity> request = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq(ENDPOINT), eq(HttpMethod.POST), request.capture(), eq(String.class));
        return request.getValue();
    }
}

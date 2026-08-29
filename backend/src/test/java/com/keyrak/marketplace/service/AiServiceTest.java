package com.keyrak.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keyrak.marketplace.config.GroqProperties;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiServiceTest {

    private static final URI ENDPOINT = URI.create("https://example.test/openai/v1/chat/completions");

    @Test
    void propertyDescriptionUsesGroqCopywritingPayloadAndExtractsMessageContent() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AiService aiService = service(restTemplate);

        server.expect(once(), requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer secret-api-key"))
                .andExpect(header(HttpHeaders.CONTENT_TYPE, containsString(MediaType.APPLICATION_JSON_VALUE)))
                .andExpect(jsonPath("$.model").value("openai/gpt-oss-20b"))
                .andExpect(jsonPath("$.response_format").doesNotExist())
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[0].content")
                        .value(containsString("expert real estate copywriter")))
                .andExpect(jsonPath("$.messages[1].role").value("user"))
                .andExpect(jsonPath("$.messages[1].content").value("Villa facts and amenities"))
                .andRespond(withSuccess(
                        "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"A luxurious villa framed by tranquil gardens.\"}}]}",
                        MediaType.APPLICATION_JSON
                ));

        assertThat(aiService.generatePropertyDescription("Villa facts and amenities"))
                .isEqualTo("A luxurious villa framed by tranquil gardens.");
        server.verify();
    }

    @Test
    void semanticSearchUsesNativeJsonModeAndParsesMessageContent() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AiService aiService = service(restTemplate);

        server.expect(once(), requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer secret-api-key"))
                .andExpect(jsonPath("$.model").value("openai/gpt-oss-20b"))
                .andExpect(jsonPath("$.response_format.type").value("json_object"))
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[0].content")
                        .value(containsString("checkInDate, checkOutDate")))
                .andExpect(jsonPath("$.messages[1].role").value("user"))
                .andExpect(jsonPath("$.messages[1].content")
                        .value("Location name: jnan awrad, Tags: breakfast, Max persons: 3, Bedrooms: 4, "
                                + "Bathrooms: 5, Minimum price: 10000, Maximum price: 20000, "
                                + "Check-in: 29/08/2026, Check-out: 04/09/2026"))
                .andRespond(withSuccess(
                        "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"{\\\"keyword\\\":\\\"Location name: jnan awrad, Tags: breakfast, Max persons: 3, Bedrooms: 4, Bathrooms: 5, Minimum price: 10000, Maximum price: 20000\\\",\\\"location\\\":\\\"jnan awrad\\\",\\\"tags\\\":[\\\"Breakfast\\\"],\\\"minPrice\\\":10000,\\\"maxPrice\\\":20000,\\\"guests\\\":3,\\\"bedrooms\\\":4,\\\"bathrooms\\\":5,\\\"checkInDate\\\":\\\"29/08/2026\\\",\\\"checkOutDate\\\":\\\"04/09/2026\\\"}\"}}]}",
                        MediaType.APPLICATION_JSON
                ));

        AiSearchResponse response = aiService.generateSemanticSearchFilters(
                "Location name: jnan awrad, Tags: breakfast, Max persons: 3, Bedrooms: 4, "
                        + "Bathrooms: 5, Minimum price: 10000, Maximum price: 20000, "
                        + "Check-in: 29/08/2026, Check-out: 04/09/2026"
        );

        assertThat(response.keyword()).isNull();
        assertThat(response.location()).isEqualTo("jnan awrad");
        assertThat(response.tags()).containsExactly("Breakfast");
        assertThat(response.minPrice()).isEqualByComparingTo("10000");
        assertThat(response.maxPrice()).isEqualByComparingTo("20000");
        assertThat(response.guests()).isEqualTo(3);
        assertThat(response.bedrooms()).isEqualTo(4);
        assertThat(response.bathrooms()).isEqualTo(5);
        assertThat(response.checkInDate()).isEqualTo("2026-08-29");
        assertThat(response.checkOutDate()).isEqualTo("2026-09-04");
        server.verify();
    }

    private AiService service(RestTemplate restTemplate) {
        return new AiService(
                restTemplate,
                new ObjectMapper(),
                new GroqProperties("secret-api-key", "openai/gpt-oss-20b", ENDPOINT)
        );
    }
}

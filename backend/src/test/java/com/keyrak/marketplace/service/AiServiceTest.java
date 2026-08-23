package com.keyrak.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keyrak.marketplace.config.AiProperties;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiServiceTest {

    @Test
    void generateContentExtractsTextFromGeminiResponse() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AiProperties properties = new AiProperties(
                "secret-api-key",
                "gemini-test-model",
                URI.create("https://example.test/v1beta")
        );
        AiService aiService = new AiService(restTemplate, new ObjectMapper(), properties);

        server.expect(once(), requestTo(
                        "https://example.test/v1beta/models/gemini-test-model:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "secret-api-key"))
                .andRespond(withSuccess(
                        "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"A quiet riad near the medina.\"}]}}]}",
                        MediaType.APPLICATION_JSON
                ).header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));

        assertThat(aiService.generateContent("Describe this property"))
                .isEqualTo("A quiet riad near the medina.");
        server.verify();
    }

    @Test
    void semanticSearchUsesStructuredJsonSchemaAndParsesFilters() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AiProperties properties = new AiProperties(
                "secret-api-key",
                "gemini-test-model",
                URI.create("https://example.test/v1beta")
        );
        AiService aiService = new AiService(restTemplate, new ObjectMapper(), properties);

        server.expect(once(), requestTo(
                        "https://example.test/v1beta/models/gemini-test-model:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.responseFormat.text.mimeType")
                        .value("application/json"))
                .andExpect(jsonPath("$.generationConfig.responseFormat.text.schema.required[0]")
                        .value("location"))
                .andRespond(withSuccess(
                        "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"location\\\":\\\"Palmeraie\\\",\\\"guests\\\":4,\\\"amenities\\\":[\\\"Pool\\\",\\\"Garden\\\"]}\"}]}}]}",
                        MediaType.APPLICATION_JSON
                ));

        AiSearchResponse response = aiService.generateSemanticSearchFilters(
                "A villa in Palmeraie for four guests with a pool and garden"
        );

        assertThat(response.location()).isEqualTo("Palmeraie");
        assertThat(response.guests()).isEqualTo(4);
        assertThat(response.amenities()).containsExactly("Pool", "Garden");
        server.verify();
    }
}

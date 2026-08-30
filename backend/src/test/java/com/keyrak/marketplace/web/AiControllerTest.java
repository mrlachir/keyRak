package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.AiService;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import com.keyrak.marketplace.web.dto.AiDescriptionRequest;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AiControllerTest {

    private AiService aiService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        aiService = mock(AiService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AiController(aiService)).build();
    }

    @Test
    void searchEndpointReturnsGroqFilterObjectToTheClient() throws Exception {
        when(aiService.generateSemanticSearchFilters("Villa with a pool")).thenReturn(new AiSearchResponse(
                "villa",
                null,
                List.of("Private pool"),
                null,
                new BigDecimal("2500"),
                3,
                2,
                null,
                "2026-08-29",
                "2026-09-04"
        ));

        mockMvc.perform(post("/api/ai/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"Villa with a pool\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keyword").value("villa"))
                .andExpect(jsonPath("$.tags[0]").value("Private pool"))
                .andExpect(jsonPath("$.maxPrice").value(2500))
                .andExpect(jsonPath("$.guests").value(3))
                .andExpect(jsonPath("$.bedrooms").value(2))
                .andExpect(jsonPath("$.checkInDate").value("2026-08-29"))
                .andExpect(jsonPath("$.checkOutDate").value("2026-09-04"));

        verify(aiService).generateSemanticSearchFilters("Villa with a pool");
    }

    @Test
    void descriptionEndpointReturnsRawGroqCopyInsideTheExistingClientDto() throws Exception {
        AiDescriptionRequest facts = new AiDescriptionRequest("Atlas Villa", PropertyType.VILLA, "Marrakesh",
                "Route de l'Ourika", new BigDecimal("2500"), 6, 3, 2, List.of("Private pool", "Garden"));
        when(aiService.generatePropertyDescription(facts)).thenReturn("A private Marrakesh retreat designed for effortless luxury.");

        mockMvc.perform(post("/api/ai/description")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Atlas Villa",
                                  "propertyType": "VILLA",
                                  "city": "Marrakesh",
                                  "address": "Route de l'Ourika",
                                  "pricePerNight": 2500,
                                  "maxGuests": 6,
                                  "bedrooms": 3,
                                  "bathrooms": 2,
                                  "amenities": ["Private pool", "Garden"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description")
                        .value("A private Marrakesh retreat designed for effortless luxury."));

        verify(aiService).generatePropertyDescription(facts);
    }
}

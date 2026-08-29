package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.AiService;
import com.keyrak.marketplace.service.AiServiceException;
import com.keyrak.marketplace.web.dto.AiDescriptionRequest;
import com.keyrak.marketplace.web.dto.AiDescriptionResponse;
import com.keyrak.marketplace.web.dto.AiSearchRequest;
import com.keyrak.marketplace.web.dto.AiSearchResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/ai")
@Slf4j
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/search")
    public AiSearchResponse parseSearch(@Valid @RequestBody AiSearchRequest request) {
        try {
            return aiService.generateSemanticSearchFilters(request.query());
        } catch (AiServiceException exception) {
            log.error("Semantic search failed for a query containing {} characters", request.query().length(), exception);
            throw exception;
        }
    }

    @PostMapping("/description")
    @PreAuthorize("hasRole('ADMIN')")
    public AiDescriptionResponse generateDescription(
            @Valid @RequestBody AiDescriptionRequest request
    ) {
        return new AiDescriptionResponse(aiService.generatePropertyDescription(request.toPropertyFacts()));
    }
}

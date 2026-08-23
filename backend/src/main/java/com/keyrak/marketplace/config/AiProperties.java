package com.keyrak.marketplace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;

@ConfigurationProperties(prefix = "app.ai.gemini")
public record AiProperties(
        String apiKey,
        String model,
        URI baseUrl
) {
}

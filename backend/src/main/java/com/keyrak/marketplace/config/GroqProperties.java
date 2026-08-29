package com.keyrak.marketplace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;

@ConfigurationProperties(prefix = "app.ai.groq")
public record GroqProperties(
        String apiKey,
        String model,
        URI endpoint
) {
}

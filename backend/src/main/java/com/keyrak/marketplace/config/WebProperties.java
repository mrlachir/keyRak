package com.keyrak.marketplace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app.web")
public record WebProperties(List<String> allowedOrigins) {
}

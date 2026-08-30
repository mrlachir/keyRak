package com.keyrak.marketplace.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class CatalogLockInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    public CatalogLockInitializer(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public void run(ApplicationArguments args) {
        // MySQL (and our MySQL-mode test database): safe on repeated/concurrent startup.
        jdbc.update("INSERT IGNORE INTO catalog_locks (id) VALUES (1)");
    }
}

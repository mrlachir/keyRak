package com.keyrak.marketplace.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LegacyUserIdCardMigrationTest {
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:id-migration-" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", ""));
        jdbc.execute("CREATE TABLE users (id VARCHAR(36) PRIMARY KEY, id_card_url VARCHAR(500))");
        jdbc.execute("CREATE TABLE bookings (id VARCHAR(36), user_id VARCHAR(36), id_card_url VARCHAR(500), created_at TIMESTAMP)");
    }

    @AfterEach
    void closeTestDatabase() { jdbc.execute("SHUTDOWN"); }

    @Test
    void backfillsNewestLegacyIdWithoutOverwritingExistingProfileAndIsRepeatable() {
        jdbc.update("INSERT INTO users VALUES ('a', NULL), ('b', '/uploads/id-cards/profile.pdf'), ('c', NULL)");
        jdbc.update("INSERT INTO bookings VALUES ('one', 'a', '/uploads/id-cards/older.pdf', '2026-01-01 00:00:00'),"
                + "('two', 'a', '/uploads/id-cards/newest.pdf', '2026-02-01 00:00:00'),"
                + "('three', 'b', '/uploads/id-cards/booking.pdf', '2026-03-01 00:00:00')");
        LegacyUserIdCardMigration migration = new LegacyUserIdCardMigration(jdbc);
        migration.run(null);
        migration.run(null);
        assertThat(jdbc.queryForObject("SELECT id_card_url FROM users WHERE id = 'a'", String.class)).endsWith("newest.pdf");
        assertThat(jdbc.queryForObject("SELECT id_card_url FROM users WHERE id = 'b'", String.class)).endsWith("profile.pdf");
        assertThat(jdbc.queryForObject("SELECT id_card_url FROM users WHERE id = 'c'", String.class)).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bookings", Integer.class)).isEqualTo(3);
    }

    @Test
    void freshSchemaWithoutLegacyColumnIsSupported() {
        jdbc.execute("ALTER TABLE bookings DROP COLUMN id_card_url");
        new LegacyUserIdCardMigration(jdbc).run(null);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class)).isZero();
    }
}

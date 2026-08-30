package com.keyrak.marketplace.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Non-destructive, repeatable backfill for installations with booking-owned ID documents. */
@Component
public class LegacyUserIdCardMigration implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(LegacyUserIdCardMigration.class);
    private final JdbcTemplate jdbc;

    public LegacyUserIdCardMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        Boolean hasLegacyColumn = jdbc.execute((ConnectionCallback<Boolean>) connection -> {
            for (String table : new String[]{"bookings", "BOOKINGS"}) {
                try (var columns = connection.getMetaData().getColumns(connection.getCatalog(), null, table, null)) {
                    while (columns.next()) {
                        if ("id_card_url".equalsIgnoreCase(columns.getString("COLUMN_NAME"))) return true;
                    }
                }
            }
            return false;
        });
        if (!Boolean.TRUE.equals(hasLegacyColumn)) return;
        int updated = jdbc.update("""
                UPDATE users u SET id_card_url = (
                    SELECT b.id_card_url FROM bookings b
                    WHERE b.user_id = u.id AND b.id_card_url IS NOT NULL AND TRIM(b.id_card_url) <> ''
                    ORDER BY b.created_at DESC, b.id DESC LIMIT 1
                )
                WHERE (u.id_card_url IS NULL OR TRIM(u.id_card_url) = '')
                  AND EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = u.id
                              AND b.id_card_url IS NOT NULL AND TRIM(b.id_card_url) <> '')
                """);
        if (updated > 0) log.info("Moved saved ID references to {} user profiles", updated);
    }
}

package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.repository.PropertyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:feature-concurrency;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
class FeaturedSelectionConcurrencyTest {
    @Autowired PropertyRepository properties;
    @Autowired PropertyService service;
    @Autowired PlatformTransactionManager transactions;

    @Test
    void simultaneousFeatureRequestsCannotExceedThree() throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactions);
        List<UUID> ids = tx.execute(status -> {
            List<UUID> created = new ArrayList<>();
            for (int i = 0; i < 5; i++) {
                created.add(properties.saveAndFlush(Property.builder().title("Concurrent " + i)
                        .description("Feature limit test").propertyType(PropertyType.VILLA).address("Test street")
                        .city("Marrakesh").pricePerNight(BigDecimal.TEN).latitude(BigDecimal.ZERO).longitude(BigDecimal.ZERO)
                        .maxGuests(2).bedrooms(1).bathrooms(1).build()).getId());
            }
            return created;
        });
        var pool = Executors.newFixedThreadPool(5);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();
        try {
            for (UUID id : ids) futures.add(pool.submit(() -> {
                start.await();
                try { service.setFeatured(id, true); return true; }
                catch (ResponseStatusException exception) {
                    assertThat(exception.getStatusCode().value()).isEqualTo(409);
                    return false;
                }
            }));
            start.countDown();
            int succeeded = 0;
            for (Future<Boolean> future : futures) if (future.get(15, TimeUnit.SECONDS)) succeeded++;
            assertThat(succeeded).isEqualTo(3);
            assertThat(properties.countFeatured()).isEqualTo(3);
        } finally {
            pool.shutdownNow();
            pool.awaitTermination(5, TimeUnit.SECONDS);
            tx.executeWithoutResult(status -> ids.forEach(properties::deleteById));
        }
    }
}

package com.keyrak.marketplace.web;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PaymentMethod;
import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminManagementIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired PropertyRepository properties;
    @Autowired BookingRepository bookings;
    @Autowired UserRepository users;

    @Test
    void featureLimitIsEnforcedAndUnfeaturingReleasesASlot() throws Exception {
        List<Property> homes = List.of(property("One"), property("Two"), property("Three"), property("Four"));
        for (Property home : homes.subList(0, 3)) {
            feature(home, true).andExpect(status().isOk()).andExpect(jsonPath("$.isFeatured").value(true));
        }
        feature(homes.get(0), true).andExpect(status().isOk()); // Idempotent at the limit.
        feature(homes.get(3), true).andExpect(status().isConflict());
        mvc.perform(get("/api/properties/featured")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3));
        feature(homes.get(0), false).andExpect(status().isOk());
        feature(homes.get(3), true).andExpect(status().isOk());
        assertThat(properties.countFeatured()).isEqualTo(3);
    }

    @Test
    void unpublishedPropertiesAreAdminOnlyAndCannotBeFeatured() throws Exception {
        Property home = property("Draft");
        home.setActive(false);
        properties.saveAndFlush(home);
        feature(home, true).andExpect(status().isConflict());
        mvc.perform(get("/api/properties/{id}", home.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/properties/{id}", home.getId()).with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        mvc.perform(get("/api/admin/properties").with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void editPreservesIdentityBookingsAndMediaAndUnpublishingRemovesFeature() throws Exception {
        Property home = property("Original");
        User guest = user();
        Booking booking = booking(home, guest, BookingStatus.CONFIRMED, PaymentMethod.CASH_ON_ARRIVAL, false, "800");
        feature(home, true).andExpect(status().isOk());
        mvc.perform(multipart(HttpMethod.PUT, "/api/properties/{id}", home.getId())
                        .file(details("Edited", false)).with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(home.getId().toString()))
                .andExpect(jsonPath("$.title").value("Edited")).andExpect(jsonPath("$.isFeatured").value(false))
                .andExpect(jsonPath("$.media[0].url").value("https://example.test/photo.jpg"));
        assertThat(bookings.findById(booking.getId()).orElseThrow().getTotalPrice()).isEqualByComparingTo("800");
        mvc.perform(get("/api/properties/featured")).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unusedPropertiesCanBeDeletedButReservationHistoryCannot() throws Exception {
        Property unused = property("Unused");
        mvc.perform(delete("/api/properties/{id}", unused.getId()).with(admin())).andExpect(status().isNoContent());
        assertThat(properties.existsById(unused.getId())).isFalse();
        Property reserved = property("Has history");
        booking(reserved, user(), BookingStatus.CANCELLED, PaymentMethod.CREDIT_CARD, false, "100");
        mvc.perform(delete("/api/properties/{id}", reserved.getId()).with(admin())).andExpect(status().isConflict());
        assertThat(properties.existsById(reserved.getId())).isTrue();
        assertThat(bookings.existsByPropertyId(reserved.getId())).isTrue();
    }

    @Test
    void managementEndpointsRequireAdminAuthorityAndNeverExposePrivateIdPaths() throws Exception {
        Property home = property("Protected");
        User user = user();
        user.setIdCardUrl("/uploads/id-cards/private.pdf");
        users.saveAndFlush(user);
        for (String path : List.of("/api/admin/properties", "/api/admin/properties/" + home.getId(), "/api/admin/users", "/api/admin/bookings?all=true", "/api/admin/dashboard/metrics")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            mvc.perform(get(path).with(client())).andExpect(status().isForbidden());
        }
        mvc.perform(patch("/api/properties/{id}/featured", home.getId()).with(client()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"isFeatured\":true}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/properties/{id}", home.getId()).with(client())).andExpect(status().isForbidden());
        mvc.perform(multipart(HttpMethod.PUT, "/api/properties/{id}", home.getId()).file(details("Denied", true)).with(client()))
                .andExpect(status().isForbidden());
        String response = mvc.perform(get("/api/admin/users").with(admin()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(response).contains("+212600000000").doesNotContain("idCardUrl", "googleSubject", "private.pdf");
    }

    @Test
    void metricsUseCompletedPaymentsAndConfirmedCashRatherThanCardSelection() throws Exception {
        Property home = property("Metrics");
        User guest = user();
        booking(home, guest, BookingStatus.CONFIRMED, PaymentMethod.CREDIT_CARD, true, "800");
        booking(home, guest, BookingStatus.PENDING, PaymentMethod.CREDIT_CARD, false, "300");
        booking(home, guest, BookingStatus.CONFIRMED, PaymentMethod.CASH_ON_ARRIVAL, true, "200");
        booking(home, guest, BookingStatus.CONFIRMED, PaymentMethod.CASH_ON_ARRIVAL, false, "400");
        booking(home, guest, BookingStatus.CANCELLED, PaymentMethod.CASH_ON_ARRIVAL, false, "900");
        booking(home, guest, BookingStatus.PENDING, PaymentMethod.CASH_ON_ARRIVAL, false, "700");
        mvc.perform(get("/api/admin/dashboard/metrics").with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRevenue").value(1000))
                .andExpect(jsonPath("$.upcomingCash").value(600)).andExpect(jsonPath("$.pendingBookingRequests").value(2));
        mvc.perform(get("/api/admin/bookings?all=true").with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[*].paymentCompleted", containsInAnyOrder(true, true, false, false, false, false)));
        mvc.perform(get("/api/admin/bookings").with(admin())).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void emptyMetricsAreZeroAndInvalidFeaturePayloadIsRejected() throws Exception {
        mvc.perform(get("/api/admin/dashboard/metrics").with(admin())).andExpect(jsonPath("$.totalRevenue").value(0))
                .andExpect(jsonPath("$.upcomingCash").value(0));
        mvc.perform(patch("/api/properties/{id}/featured", property("Missing value").getId()).with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions feature(Property home, boolean value) throws Exception {
        return mvc.perform(patch("/api/properties/{id}/featured", home.getId()).with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"isFeatured\":" + value + "}"));
    }

    private RequestPostProcessor admin() {
        users.findByGoogleSubject("management-admin").orElseGet(() -> users.saveAndFlush(User.builder()
                .googleSubject("management-admin").email("management-admin@example.test")
                .role(com.keyrak.marketplace.domain.enumeration.UserRole.ADMIN).build()));
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
                .jwt(token -> token.subject("management-admin").claim("email", "management-admin@example.test"));
    }

    private RequestPostProcessor client() {
        return jwt().jwt(token -> token.subject("management-client").claim("email", "management-client@example.test"));
    }

    private Property property(String title) {
        Property property = Property.builder().title(title).description("A test property").propertyType(PropertyType.VILLA)
                .address("Test street").city("Marrakesh").pricePerNight(new BigDecimal("1000"))
                .latitude(new BigDecimal("31.62")).longitude(new BigDecimal("-7.98")).maxGuests(4).bedrooms(2).bathrooms(2).build();
        property.addMedia(PropertyMedia.builder().url("https://example.test/photo.jpg").type(PropertyMediaType.IMAGE).displayOrder(0).build());
        return properties.saveAndFlush(property);
    }

    private User user() {
        return users.saveAndFlush(User.builder().googleSubject(UUID.randomUUID().toString()).email(UUID.randomUUID() + "@example.test")
                .displayName("Test Guest").telephone("+212600000000").build());
    }

    private Booking booking(Property home, User user, BookingStatus status, PaymentMethod method, boolean paid, String price) {
        return bookings.saveAndFlush(Booking.builder().property(home).user(user).status(status).paymentMethod(method)
                .paymentCompleted(paid).checkInDate(LocalDate.now().plusDays(3)).checkOutDate(LocalDate.now().plusDays(5))
                .adults(2).children(0).totalPrice(new BigDecimal(price)).build());
    }

    private MockMultipartFile details(String title, boolean active) {
        return new MockMultipartFile("property", "property.json", "application/json", """
                {"title":"%s","description":"Updated property description","propertyType":"VILLA","address":"Test street",
                "city":"Agadir","pricePerNight":2000,"latitude":30.4,"longitude":-9.6,"maxGuests":4,"bedrooms":2,
                "bathrooms":2,"active":%s,"tagNames":["Breakfast"],"media":[{"url":"https://example.test/photo.jpg","type":"IMAGE","displayOrder":0}]}
                """.formatted(title, active).getBytes());
    }
}

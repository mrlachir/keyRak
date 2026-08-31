package com.keyrak.marketplace.web;

import com.keyrak.marketplace.domain.entity.*;
import com.keyrak.marketplace.domain.enumeration.*;
import com.keyrak.marketplace.repository.*;
import com.keyrak.marketplace.security.AccountIdentityFingerprint;
import com.keyrak.marketplace.service.BookingDocumentStorageService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminUserAccessIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired BookingRepository bookings;
    @Autowired PropertyRepository properties;
    @Autowired ReviewRepository reviews;
    @Autowired WishlistRepository wishlists;
    @Autowired NotificationRepository notifications;
    @Autowired AccountSessionRevocationRepository revocations;
    @Autowired BookingDocumentStorageService documents;
    @Autowired EntityManager entityManager;

    @Test
    void onlyAdminCanReadPrivateImageAndPdfWithNoCacheAndNoPublicDocumentRoute() throws Exception {
        User admin = user(UserRole.ADMIN);
        User guest = user(UserRole.CLIENT);
        for (String type : List.of("image/png", "application/pdf")) {
            byte[] bytes = "private-test-document".getBytes(StandardCharsets.UTF_8);
            String path = documents.store(new MockMultipartFile("idCard", "test", type, bytes));
            try {
                guest.setIdCardUrl(path);
                users.saveAndFlush(guest);
                mvc.perform(get("/api/admin/users/{id}/id-card", guest.getId()).with(identity(admin)))
                        .andExpect(status().isOk()).andExpect(content().bytes(bytes)).andExpect(content().contentType(type))
                        .andExpect(header().string("Cache-Control", containsString("no-store")))
                        .andExpect(header().string("X-Content-Type-Options", "nosniff"));
                mvc.perform(get("/api/admin/users/{id}/id-card", guest.getId())).andExpect(status().isUnauthorized());
                mvc.perform(get("/api/admin/users/{id}/id-card", guest.getId()).with(identity(guest))).andExpect(status().isForbidden());
                mvc.perform(get(path)).andExpect(status().isUnauthorized());
                mvc.perform(get(path).with(identity(admin))).andExpect(status().isNotFound());
            } finally { documents.deleteQuietly(path); }
        }
    }

    @Test
    void missingAndUnsafeDocumentReferencesReturn404() throws Exception {
        User admin = user(UserRole.ADMIN);
        User guest = user(UserRole.CLIENT);
        for (String path : List.of("", "/uploads/id-cards/missing.png", "/uploads/id-cards/../secret.png",
                "/uploads/property-media/test.png", "https://example.test/private.png", "/uploads/id-cards/private.html")) {
            guest.setIdCardUrl(path);
            users.saveAndFlush(guest);
            mvc.perform(get("/api/admin/users/{id}/id-card", guest.getId()).with(identity(admin))).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/admin/users/{id}/id-card", UUID.randomUUID()).with(identity(admin))).andExpect(status().isNotFound());
    }

    @Test
    void detailsIncludeProfileFieldsButNeverStoragePaths() throws Exception {
        User admin = user(UserRole.ADMIN);
        User guest = user(UserRole.CLIENT);
        guest.setIdCardUrl("/uploads/id-cards/private.pdf");
        guest.setAvatarUrl("https://example.test/avatar.jpg");
        users.saveAndFlush(guest);
        mvc.perform(get("/api/admin/users/{id}", guest.getId()).with(identity(admin))).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(guest.getId().toString())).andExpect(jsonPath("$.displayName").value("Test Guest"))
                .andExpect(jsonPath("$.telephone").value("+212600000000")).andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.avatarUrl").value(guest.getAvatarUrl())).andExpect(jsonPath("$.hasIdCard").value(true))
                .andExpect(jsonPath("$.idCardUrl").doesNotExist()).andExpect(jsonPath("$.googleSubject").doesNotExist());
    }

    @Test
    void rolesUseDatabaseInsteadOfStaleJwtAndClientsCannotMutateUsers() throws Exception {
        User admin = user(UserRole.ADMIN);
        User target = user(UserRole.CLIENT);
        mvc.perform(patch("/api/admin/users/{id}/role", target.getId()).with(identity(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMIN"));
        // A stale CLIENT claim does not override a newly granted role.
        mvc.perform(get("/api/admin/users").with(jwt().jwt(token -> token.subject(target.getGoogleSubject()).claim("email", target.getEmail()))))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/admin/users/{id}/role", target.getId()).with(identity(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"CLIENT\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/users").with(identity(target))).andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/users/{id}/role", admin.getId()).with(identity(target))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"CLIENT\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/users/{id}", admin.getId()).with(identity(target))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/users/{id}", target.getId())).andExpect(status().isUnauthorized());
    }

    @Test
    void invalidRolesSelfChangesAndMissingUsersAreRejected() throws Exception {
        User admin = user(UserRole.ADMIN);
        User target = user(UserRole.CLIENT);
        for (String body : List.of("{}", "{\"role\":null}", "{\"role\":\"OWNER\"}")) {
            mvc.perform(patch("/api/admin/users/{id}/role", target.getId()).with(identity(admin))
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(patch("/api/admin/users/{id}/role", admin.getId()).with(identity(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"CLIENT\"}"))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/users/{id}", admin.getId()).with(identity(admin))).andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/users/{id}", UUID.randomUUID()).with(identity(admin))).andExpect(status().isNotFound());
        assertThat(users.findById(admin.getId()).orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void bookingHistoryPreventsCascadingDeletion() throws Exception {
        User admin = user(UserRole.ADMIN);
        User guest = user(UserRole.CLIENT);
        Property home = property();
        Booking booking = bookings.saveAndFlush(Booking.builder().property(home).user(guest).status(BookingStatus.CANCELLED)
                .checkInDate(LocalDate.now().minusDays(5)).checkOutDate(LocalDate.now().minusDays(2))
                .adults(1).children(0).totalPrice(BigDecimal.TEN).build());
        mvc.perform(delete("/api/admin/users/{id}", guest.getId()).with(identity(admin))).andExpect(status().isConflict());
        assertThat(users.existsById(guest.getId())).isTrue();
        assertThat(bookings.existsById(booking.getId())).isTrue();
        assertThat(revocations.existsById(AccountIdentityFingerprint.of(guest.getGoogleSubject()))).isFalse();
    }

    @Test
    void permanentRemovalCleansRelationsAndOldSessionsCannotRecreateTheAccount() throws Exception {
        User admin = user(UserRole.ADMIN);
        User guest = user(UserRole.CLIENT);
        Property home = property();
        UUID reviewId = reviews.saveAndFlush(Review.builder().user(guest).property(home).rating(5).comment("Test review").build()).getId();
        UUID wishlistId = wishlists.saveAndFlush(WishlistEntry.builder().user(guest).property(home).build()).getId();
        UUID notificationId = notifications.saveAndFlush(Notification.builder().user(guest).message("Test notice").build()).getId();
        entityManager.clear();
        mvc.perform(delete("/api/admin/users/{id}", guest.getId()).with(identity(admin))).andExpect(status().isNoContent());
        assertThat(users.existsById(guest.getId())).isFalse();
        assertThat(reviews.existsById(reviewId)).isFalse();
        assertThat(wishlists.existsById(wishlistId)).isFalse();
        assertThat(notifications.existsById(notificationId)).isFalse();
        assertThat(properties.existsById(home.getId())).isTrue();
        mvc.perform(get("/api/users/me").with(identity(guest))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users/me").with(jwt().jwt(token -> token.subject(guest.getGoogleSubject())
                .claim("email", guest.getEmail()).claim("auth_time", 1L).issuedAt(Instant.now())))).andExpect(status().isUnauthorized());
        assertThat(users.findByGoogleSubject(guest.getGoogleSubject())).isEmpty();
        // A genuinely fresh OAuth login may register a NEW client; account removal is not a permanent ban.
        long freshLogin = revocations.findById(AccountIdentityFingerprint.of(guest.getGoogleSubject())).orElseThrow().getRevokedBefore().getEpochSecond() + 1;
        mvc.perform(get("/api/users/me").with(jwt().jwt(token -> token.subject(guest.getGoogleSubject())
                .claim("email", guest.getEmail()).claim("auth_time", freshLogin)))).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CLIENT"));
        mvc.perform(get("/api/users/me").with(identity(guest))).andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void committedRemovalAlsoRemovesPrivateDocument() throws Exception {
        User admin = user(UserRole.ADMIN);
        User guest = user(UserRole.CLIENT);
        String path = documents.store(new MockMultipartFile("idCard", "test.pdf", "application/pdf", new byte[]{1, 2}));
        try {
            guest.setIdCardUrl(path);
            users.saveAndFlush(guest);
            mvc.perform(delete("/api/admin/users/{id}", guest.getId()).with(identity(admin))).andExpect(status().isNoContent());
            assertThatThrownBy(() -> documents.read(path)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        } finally {
            documents.deleteQuietly(path);
            users.deleteById(admin.getId());
            if (users.existsById(guest.getId())) users.deleteById(guest.getId());
            revocations.deleteById(AccountIdentityFingerprint.of(guest.getGoogleSubject()));
        }
    }

    private User user(UserRole role) {
        String subject = UUID.randomUUID().toString();
        return users.saveAndFlush(User.builder().googleSubject(subject).email(subject + "@example.test")
                .displayName("Test Guest").telephone("+212600000000").role(role).build());
    }
    private RequestPostProcessor identity(User user) {
        // Deliberately claim ADMIN for everyone: database roles must override it.
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")).jwt(token -> token.subject(user.getGoogleSubject())
                .claim("email", user.getEmail()).claim("roles", List.of("ADMIN")));
    }
    private Property property() {
        return properties.saveAndFlush(Property.builder().title("User test villa").description("Test")
                .propertyType(PropertyType.VILLA).address("Medina").city("Marrakesh").pricePerNight(BigDecimal.TEN)
                .latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).maxGuests(2).bedrooms(1).bathrooms(1).build());
    }
}

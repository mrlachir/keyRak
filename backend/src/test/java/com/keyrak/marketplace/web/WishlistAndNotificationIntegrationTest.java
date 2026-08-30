package com.keyrak.marketplace.web;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Notification;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.Review;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.NotificationRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.ReviewRepository;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.repository.WishlistRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WishlistAndNotificationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired WishlistRepository wishlist;
    @Autowired NotificationRepository notifications;
    @Autowired BookingRepository bookings;
    @Autowired ReviewRepository reviews;
    @Autowired EntityManager entityManager;

    @Test
    void collectionEndpointsRequireAuthentication() throws Exception {
        UUID id = UUID.randomUUID();
        for (String path : new String[]{"/api/users/me/wishlist", "/api/users/me/wishlist/ids", "/api/users/me/notifications"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/users/me/wishlist/{id}", id)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/users/me/wishlist/{id}", id)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/users/me/notifications/{id}/read", id)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/users/me/notifications/read-all")).andExpect(status().isUnauthorized());
    }

    @Test
    void wishlistIsIdempotentAndPrivateToEachAccount() throws Exception {
        User owner = user(UserRole.CLIENT);
        User other = user(UserRole.CLIENT);
        Property home = property();
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/users/me/wishlist/{id}", home.getId()).with(as(owner)))
                    .andExpect(status().isNoContent());
        }
        assertThat(wishlist.findPropertyIds(owner.getId())).containsExactly(home.getId());
        mvc.perform(get("/api/users/me/wishlist").with(as(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(home.getId().toString()))
                .andExpect(jsonPath("$[0].wishlistEntries").doesNotExist());
        mvc.perform(get("/api/users/me/wishlist/ids").with(as(other)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/users/me/wishlist/{id}", home.getId()).with(as(other)))
                .andExpect(status().isNoContent());
        assertThat(wishlist.existsByUserIdAndPropertyId(owner.getId(), home.getId())).isTrue();
        for (int i = 0; i < 2; i++) {
            mvc.perform(delete("/api/users/me/wishlist/{id}", home.getId()).with(as(owner)))
                    .andExpect(status().isNoContent());
        }
        assertThat(wishlist.findPropertyIds(owner.getId())).isEmpty();
    }

    @Test
    void invalidUnavailableAndMissingPropertiesCannotBeSaved() throws Exception {
        User owner = user(UserRole.CLIENT);
        Property hidden = property();
        hidden.setActive(false);
        properties.saveAndFlush(hidden);
        for (UUID id : new UUID[]{hidden.getId(), UUID.randomUUID()}) {
            mvc.perform(post("/api/users/me/wishlist/{id}", id).with(as(owner)))
                    .andExpect(status().isNotFound());
        }
        mvc.perform(post("/api/users/me/wishlist/not-a-uuid").with(as(owner)))
                .andExpect(status().isBadRequest());
        assertThat(wishlist.findPropertyIds(owner.getId())).isEmpty();
    }

    @Test
    void unpublishedSavedHomesAreHiddenAndPropertyDeletionCleansUpWishlist() throws Exception {
        User owner = user(UserRole.CLIENT);
        User admin = user(UserRole.ADMIN);
        Property home = property();
        mvc.perform(post("/api/users/me/wishlist/{id}", home.getId()).with(as(owner))).andExpect(status().isNoContent());
        home.setActive(false);
        properties.saveAndFlush(home);
        mvc.perform(get("/api/users/me/wishlist").with(as(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        assertThat(wishlist.findPropertyIds(owner.getId())).containsExactly(home.getId());
        // Mirror distinct HTTP transactions: reload inverse collections from the database.
        entityManager.clear();
        mvc.perform(delete("/api/properties/{id}", home.getId()).with(as(admin)))
                .andExpect(status().isNoContent());
        assertThat(wishlist.findPropertyIds(owner.getId())).isEmpty();
        assertThat(users.existsById(owner.getId())).isTrue();
    }

    @Test
    void eligibleReviewNotifiesEveryAdminButNotClientsAndDuplicateDoesNotNotifyAgain() throws Exception {
        User author = user(UserRole.CLIENT);
        User admin = user(UserRole.ADMIN);
        User secondAdmin = user(UserRole.ADMIN);
        Property home = property();
        confirmedStay(home, author);
        review(home, author, "{\"rating\":5,\"comment\":\"A lovely arrival.\"}")
                .andExpect(status().isCreated());
        notifications.flush();
        for (User recipient : new User[]{admin, secondAdmin}) {
            mvc.perform(get("/api/users/me/notifications").with(as(recipient)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(1))
                    .andExpect(jsonPath("$.notifications[0].message").value("New review added for " + home.getTitle()))
                    .andExpect(jsonPath("$.notifications[0].isRead").value(false))
                    .andExpect(jsonPath("$.notifications[0].targetUrl").value(org.hamcrest.Matchers.startsWith("/admin/bookings?tab=reviews&review=")))
                    .andExpect(jsonPath("$.notifications[0].createdAt").isNotEmpty())
                    .andExpect(jsonPath("$.notifications[0].user").doesNotExist());
        }
        mvc.perform(get("/api/users/me/notifications").with(as(author)))
                .andExpect(jsonPath("$.unreadCount").value(0));
        review(home, author, "{\"rating\":4,\"comment\":\"Duplicate\"}").andExpect(status().isConflict());
        assertThat(notifications.countByUserIdAndReadFalse(admin.getId())).isEqualTo(1);
    }

    @Test
    void rejectedReviewsDoNotCreateNotifications() throws Exception {
        User author = user(UserRole.CLIENT);
        User admin = user(UserRole.ADMIN);
        Property home = property();
        review(home, author, "{\"rating\":5,\"comment\":\"No stay\"}").andExpect(status().isForbidden());
        confirmedStay(home, author);
        review(home, author, "{\"rating\":6,\"comment\":\"Invalid\"}").andExpect(status().isBadRequest());
        assertThat(notifications.countByUserIdAndReadFalse(admin.getId())).isZero();
    }

    @Test
    void notificationReadActionsAreScopedToTheRecipientIncludingOtherAdmins() throws Exception {
        User owner = user(UserRole.ADMIN);
        User other = user(UserRole.ADMIN);
        Notification first = notification(owner, "First");
        notification(owner, "Second");
        notification(other, "Private to the other admin");
        mvc.perform(patch("/api/users/me/notifications/{id}/read", first.getId()).with(as(other)))
                .andExpect(status().isNotFound());
        for (int i = 0; i < 2; i++) {
            mvc.perform(patch("/api/users/me/notifications/{id}/read", first.getId()).with(as(owner)))
                    .andExpect(status().isNoContent());
        }
        assertThat(notifications.countByUserIdAndReadFalse(owner.getId())).isEqualTo(1);
        mvc.perform(patch("/api/users/me/notifications/read-all").with(as(owner))).andExpect(status().isNoContent());
        mvc.perform(get("/api/users/me/notifications").with(as(owner)))
                .andExpect(jsonPath("$.unreadCount").value(0)).andExpect(jsonPath("$.notifications.length()").value(0));
        assertThat(notifications.countByUserIdAndReadFalse(other.getId())).isEqualTo(1);
    }

    @Test
    void inboxIsBoundedButUnreadCountIncludesAllItems() throws Exception {
        User admin = user(UserRole.ADMIN);
        for (int i = 0; i < 21; i++) notification(admin, "Review " + i);
        mvc.perform(get("/api/users/me/notifications").with(as(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(21))
                .andExpect(jsonPath("$.notifications.length()").value(20));
        Notification newest = notifications.findTop20ByUserIdAndReadFalseOrderByCreatedAtDescIdDesc(admin.getId()).get(0);
        mvc.perform(patch("/api/users/me/notifications/{id}/read", newest.getId()).with(as(admin)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/users/me/notifications").with(as(admin)))
                .andExpect(jsonPath("$.unreadCount").value(20)).andExpect(jsonPath("$.notifications.length()").value(20));
    }

    private org.springframework.test.web.servlet.ResultActions review(Property home, User author, String body) throws Exception {
        return mvc.perform(post("/api/properties/{id}/reviews", home.getId()).with(as(author))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void approvedBookingAndCancellationNotifyOnlyTheGuestAndRetriesDoNotDuplicate() throws Exception {
        User guest = user(UserRole.CLIENT);
        User other = user(UserRole.CLIENT);
        User admin = user(UserRole.ADMIN);
        Property home = property();
        Booking booking = bookings.saveAndFlush(Booking.builder().property(home).user(guest)
                .checkInDate(LocalDate.now().plusDays(3)).checkOutDate(LocalDate.now().plusDays(5))
                .adults(2).children(1).totalPrice(new BigDecimal("2000")).status(BookingStatus.PENDING).build());
        mvc.perform(patch("/api/admin/bookings/{id}/status", booking.getId()).with(as(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.property.title").value(home.getTitle()));
        mvc.perform(get("/api/users/me/notifications").with(as(guest)))
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.notifications[0].message").value("Your booking is approved for " + home.getTitle()))
                .andExpect(jsonPath("$.notifications[0].targetUrl").value("/profile#booking-" + booking.getId()));
        mvc.perform(patch("/api/admin/bookings/{id}/status", booking.getId()).with(as(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isConflict());
        assertThat(notifications.countByUserIdAndReadFalse(guest.getId())).isEqualTo(1);
        mvc.perform(patch("/api/bookings/{id}/request-cancel", booking.getId()).with(as(guest)))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/admin/bookings/{id}/cancellation-request", booking.getId()).with(as(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        mvc.perform(patch("/api/admin/bookings/{id}/cancellation-request", booking.getId()).with(as(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isConflict());
        assertThat(notifications.countByUserIdAndReadFalse(guest.getId())).isEqualTo(2);
        assertThat(notifications.findTop20ByUserIdAndReadFalseOrderByCreatedAtDescIdDesc(guest.getId()))
                .extracting(Notification::getMessage).contains("Your cancellation is approved for " + home.getTitle());
        assertThat(notifications.countByUserIdAndReadFalse(admin.getId())).isZero();
        assertThat(notifications.countByUserIdAndReadFalse(other.getId())).isZero();
    }

    @Test
    void rejectedDecisionsDoNotSendApprovalAlerts() throws Exception {
        User guest = user(UserRole.CLIENT);
        User admin = user(UserRole.ADMIN);
        Property home = property();
        Booking booking = bookings.saveAndFlush(Booking.builder().property(home).user(guest)
                .checkInDate(LocalDate.now().plusDays(3)).checkOutDate(LocalDate.now().plusDays(5))
                .adults(2).children(0).totalPrice(new BigDecimal("2000")).status(BookingStatus.PENDING).build());
        mvc.perform(patch("/api/admin/bookings/{id}/status", booking.getId()).with(as(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isOk());
        Booking confirmed = bookings.saveAndFlush(Booking.builder().property(home).user(guest)
                .checkInDate(LocalDate.now().plusDays(8)).checkOutDate(LocalDate.now().plusDays(10))
                .adults(2).children(0).totalPrice(new BigDecimal("2000")).status(BookingStatus.CONFIRMED)
                .cancellationRequested(true).build());
        mvc.perform(patch("/api/admin/bookings/{id}/cancellation-request", confirmed.getId()).with(as(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMED"));
        assertThat(notifications.countByUserIdAndReadFalse(guest.getId())).isZero();
    }

    @Test
    void adminReviewContextIncludesPropertyMediaAndContactsButNeverPrivateIdFiles() throws Exception {
        User author = user(UserRole.CLIENT);
        User admin = user(UserRole.ADMIN);
        author.setIdCardUrl("/private/identity.pdf");
        users.saveAndFlush(author);
        Property home = property();
        home.addMedia(PropertyMedia.builder().url("https://example.test/cover.jpg").type(PropertyMediaType.IMAGE).displayOrder(0).build());
        properties.saveAndFlush(home);
        Review review = reviews.saveAndFlush(Review.builder().user(author).property(home).rating(4).comment("The full review text.").build());
        mvc.perform(get("/api/admin/reviews")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/reviews").with(as(author))).andExpect(status().isForbidden());
        String json = mvc.perform(get("/api/admin/reviews").with(as(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(review.getId().toString()))
                .andExpect(jsonPath("$[0].authorEmail").value(author.getEmail()))
                .andExpect(jsonPath("$[0].authorTelephone").value(author.getTelephone()))
                .andExpect(jsonPath("$[0].comment").value("The full review text."))
                .andExpect(jsonPath("$[0].property.media[0].url").value("https://example.test/cover.jpg"))
                .andReturn().getResponse().getContentAsString();
        assertThat(json).doesNotContain("idCardUrl", "identity.pdf", "googleSubject");
    }

    private RequestPostProcessor as(User user) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                .jwt(token -> token.subject(user.getGoogleSubject()).claim("email", user.getEmail()));
    }

    private User user(UserRole role) {
        String subject = UUID.randomUUID().toString();
        return users.saveAndFlush(User.builder().googleSubject(subject).email(subject + "@example.test")
                .displayName("Collection Test User").telephone("+212600000000").role(role).build());
    }

    private Property property() {
        return properties.saveAndFlush(Property.builder().title("Wishlist Riad").description("A test stay")
                .propertyType(PropertyType.VILLA).address("Test street").city("Marrakesh")
                .pricePerNight(new BigDecimal("1000")).latitude(new BigDecimal("31.62"))
                .longitude(new BigDecimal("-7.98")).maxGuests(4).bedrooms(2).bathrooms(2).active(true).build());
    }

    private void confirmedStay(Property home, User author) {
        bookings.saveAndFlush(Booking.builder().property(home).user(author).checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(2)).adults(2).children(0)
                .totalPrice(new BigDecimal("2000")).status(BookingStatus.CONFIRMED).build());
    }

    private Notification notification(User user, String message) {
        return notifications.saveAndFlush(Notification.builder().user(user).message(message).build());
    }
}

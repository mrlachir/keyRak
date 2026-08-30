package com.keyrak.marketplace.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.Review;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.ReviewRepository;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.service.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PropertyMediaAndReviewIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired PropertyRepository propertyRepository;
    @Autowired UserRepository userRepository;
    @Autowired BookingRepository bookingRepository;
    @Autowired ReviewRepository reviewRepository;
    @Autowired FileStorageService fileStorageService;

    @Test
    void multipartPropertyStoresAllMediaAndServesOnlyPublicMedia() throws Exception {
        MockMultipartFile details = new MockMultipartFile("property", "property.json", "application/json", """
                {"title":"Uploaded Villa","description":"A property with uploaded media.",
                 "propertyType":"VILLA","address":"Test street","city":"Marrakesh",
                 "pricePerNight":1000,"latitude":31.62,"longitude":-7.98,
                 "maxGuests":4,"bedrooms":2,"bathrooms":2,"active":true,"tagNames":[]}
                """.getBytes());
        byte[] imageBytes = {1, 2, 3, 4};
        String response = mockMvc.perform(multipart("/api/properties")
                        .file(details)
                        .file(new MockMultipartFile("images", "cover.png", "image/png", imageBytes))
                        .file(new MockMultipartFile("images", "second.jpg", "image/jpeg", imageBytes))
                        .file(new MockMultipartFile("panorama", "panorama.jpg", "image/jpeg", imageBytes))
                        .file(new MockMultipartFile("video", "tour.mp4", "video/mp4", imageBytes))
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")).jwt(token -> token
                                .subject("upload-admin")
                                .claim("email", "upload-admin@example.test")
                                .claim("name", "Upload Admin"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.media.length()").value(4))
                .andExpect(jsonPath("$.media[0].type").value("IMAGE"))
                .andExpect(jsonPath("$.media[1].type").value("IMAGE"))
                .andExpect(jsonPath("$.media[2].type").value("IMAGE_360"))
                .andExpect(jsonPath("$.media[3].type").value("VIDEO"))
                .andReturn().getResponse().getContentAsString();
        JsonNode media = objectMapper.readTree(response).get("media");
        try {
            mockMvc.perform(get(URI.create(media.get(0).get("url").asText()).getPath()))
                    .andExpect(status().isOk())
                    .andExpect(content().bytes(imageBytes));
            mockMvc.perform(get("/uploads/id-cards/private.pdf"))
                    .andExpect(status().isUnauthorized());
        } finally {
            media.forEach(item -> fileStorageService.deleteQuietly(item.get("url").asText()));
        }
    }

    @Test
    void completedConfirmedStayCanCreateAReviewAndDuplicateIsRejected() throws Exception {
        Property property = property("Review Villa");
        User author = user("review-author", UserRole.CLIENT);
        booking(property, author, BookingStatus.CONFIRMED, LocalDate.now().minusDays(1));
        mockMvc.perform(post("/api/properties/{id}/reviews", property.getId())
                        .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"A wonderful verified stay.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorId").value(author.getId().toString()))
                .andExpect(jsonPath("$.rating").value(5));
        mockMvc.perform(get("/api/properties/{id}/reviews", property.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(post("/api/properties/{id}/reviews", property.getId())
                        .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"comment\":\"Duplicate review\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void unqualifiedPendingAndFutureStaysCannotReview() throws Exception {
        Property property = property("Not Yet Reviewed Villa");
        User author = user("unqualified-author", UserRole.CLIENT);
        for (int scenario = 0; scenario < 3; scenario++) {
            if (scenario == 1) booking(property, author, BookingStatus.PENDING, LocalDate.now().minusDays(2));
            if (scenario == 2) booking(property, author, BookingStatus.CONFIRMED, LocalDate.now().plusDays(3));
            mockMvc.perform(post("/api/properties/{id}/reviews", property.getId())
                            .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"rating\":5,\"comment\":\"Not eligible yet\"}"))
                    .andExpect(status().isForbidden());
        }
        assertThat(reviewRepository.findByPropertyIdOrderByCreatedAtDesc(property.getId())).isEmpty();
    }

    @Test
    void confirmedStayCanBeReviewedOnCheckInDayBeforeCheckout() throws Exception {
        Property property = property("Check-in Day Villa");
        User author = user("check-in-reviewer", UserRole.CLIENT);
        booking(property, author, BookingStatus.CONFIRMED, LocalDate.now().plusDays(2));
        mockMvc.perform(post("/api/properties/{id}/reviews", property.getId())
                        .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"comment\":\"A welcoming arrival today.\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void propertyAcceptsMixedLinksAndMultiplePanoramaAndVideoFiles() throws Exception {
        MockMultipartFile details = new MockMultipartFile("property", "property.json", "application/json", """
                {"title":"Mixed Media Villa","description":"All media types.","propertyType":"VILLA",
                 "address":"A street","city":"Marrakesh","pricePerNight":1000,"latitude":31,"longitude":-7,
                 "maxGuests":4,"bedrooms":2,"bathrooms":2,"active":true,"tagNames":[],
                 "media":[{"url":"https://example.com/cover.jpg","type":"IMAGE","displayOrder":0},
                          {"url":"https://example.com/tour.jpg","type":"IMAGE_360","displayOrder":1},
                          {"url":"https://example.com/video.mp4","type":"VIDEO","displayOrder":2}]}
                """.getBytes());
        var response = mockMvc.perform(multipart("/api/properties").file(details)
                        .file(new MockMultipartFile("panorama", "tour1.jpg", "image/jpeg", new byte[]{1, 2}))
                        .file(new MockMultipartFile("panorama", "tour2.jpg", "image/jpeg", new byte[]{1, 2}))
                        .file(new MockMultipartFile("video", "video1.mp4", "video/mp4", new byte[]{1, 2}))
                        .file(new MockMultipartFile("video", "video2.mp4", "video/mp4", new byte[]{1, 2}))
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")).jwt(token -> token
                                .subject("mixed-media-admin").claim("email", "mixed-media-admin@example.test"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.media.length()").value(7))
                .andReturn().getResponse().getContentAsString();
        JsonNode media = objectMapper.readTree(response).get("media");
        try {
            assertThat(media.findValuesAsText("type")).containsExactly("IMAGE", "IMAGE_360", "VIDEO", "IMAGE_360", "IMAGE_360", "VIDEO", "VIDEO");
        } finally {
            media.forEach(item -> {
                if (item.get("url").asText().startsWith("http://localhost:8080/uploads/property-media/")) fileStorageService.deleteQuietly(item.get("url").asText());
            });
        }
    }

    @Test
    void completedStayAtAnotherPropertyOrByAnotherGuestDoesNotQualify() throws Exception {
        Property target = property("Target Villa");
        Property other = property("Other Villa");
        User author = user("wrong-stay-author", UserRole.CLIENT);
        User otherGuest = user("different-guest", UserRole.CLIENT);
        booking(other, author, BookingStatus.CONFIRMED, LocalDate.now().minusDays(1));
        booking(target, otherGuest, BookingStatus.CONFIRMED, LocalDate.now().minusDays(1));
        booking(target, author, BookingStatus.CANCELLED, LocalDate.now().minusDays(1));
        mockMvc.perform(post("/api/properties/{id}/reviews", target.getId())
                        .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"Not a verified stay\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can review confirmed stays from your check-in date."));
    }

    @Test
    void reviewsRequireAuthenticationAndValidRatingAndComment() throws Exception {
        Property property = property("Validation Villa");
        User author = user("validation-author", UserRole.CLIENT);
        booking(property, author, BookingStatus.CONFIRMED, LocalDate.now().minusDays(1));
        mockMvc.perform(post("/api/properties/{id}/reviews", property.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"No authentication\"}"))
                .andExpect(status().isUnauthorized());
        for (String invalid : new String[]{
                "{\"rating\":0,\"comment\":\"Invalid rating\"}",
                "{\"rating\":6,\"comment\":\"Invalid rating\"}",
                "{\"rating\":5,\"comment\":\"   \"}"
        }) {
            mockMvc.perform(post("/api/properties/{id}/reviews", property.getId())
                            .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail())))
                            .contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isBadRequest());
        }
        assertThat(reviewRepository.findByPropertyIdOrderByCreatedAtDesc(property.getId())).isEmpty();
    }

    @Test
    void failedMultipartUploadRemovesAlreadyStoredFilesAndDoesNotCreateProperty() throws Exception {
        MockMultipartFile details = new MockMultipartFile("property", "property.json", "application/json", """
                {"title":"Failed Upload Villa","description":"A property with an invalid video.",
                 "propertyType":"VILLA","address":"Test street","city":"Marrakesh",
                 "pricePerNight":1000,"latitude":31.62,"longitude":-7.98,
                 "maxGuests":4,"bedrooms":2,"bathrooms":2,"active":true,"tagNames":[]}
                """.getBytes());
        long propertyCount = propertyRepository.count();
        List<Path> originalFiles;
        try (var files = Files.list(fileStorageService.storageDirectory())) {
            originalFiles = files.toList();
        }
        mockMvc.perform(multipart("/api/properties")
                        .file(details)
                        .file(new MockMultipartFile("images", "cover.png", "image/png", new byte[]{1, 2, 3}))
                        .file(new MockMultipartFile("video", "bad.html", "text/html", "not a video".getBytes()))
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")).jwt(token -> token
                                .subject("failed-upload-admin").claim("email", "failed-upload-admin@example.test"))))
                .andExpect(status().isBadRequest());
        assertThat(propertyRepository.count()).isEqualTo(propertyCount);
        try (var files = Files.list(fileStorageService.storageDirectory())) {
            assertThat(files.toList()).containsExactlyInAnyOrderElementsOf(originalFiles);
        }
    }

    @Test
    void onlyAuthorOrAdminCanDeleteReview() throws Exception {
        Property property = property("Deletion Villa");
        User author = user("delete-author", UserRole.CLIENT);
        User stranger = user("delete-stranger", UserRole.CLIENT);
        User admin = user("delete-admin", UserRole.ADMIN);
        Review review = reviewRepository.saveAndFlush(Review.builder()
                .property(property).user(author).rating(4).comment("Review to remove").build());
        mockMvc.perform(delete("/api/reviews/{id}", review.getId())
                        .with(jwt().jwt(token -> token.subject(stranger.getGoogleSubject()).claim("email", stranger.getEmail()))))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/reviews/{id}", review.getId())
                        .with(jwt().jwt(token -> token.subject(author.getGoogleSubject()).claim("email", author.getEmail()))))
                .andExpect(status().isNoContent());
        // These requests share the test transaction; flush to mirror the first request's commit.
        reviewRepository.flush();
        Review secondReview = reviewRepository.saveAndFlush(Review.builder()
                .property(property).user(author).rating(4).comment("Admin removal").build());
        mockMvc.perform(delete("/api/reviews/{id}", secondReview.getId())
                        .with(jwt().jwt(token -> token.subject(admin.getGoogleSubject()).claim("email", admin.getEmail()))))
                .andExpect(status().isNoContent());
    }

    private Property property(String title) {
        return propertyRepository.saveAndFlush(Property.builder()
                .title(title).description("Test property").propertyType(PropertyType.VILLA)
                .address("Test address").city("Marrakesh").pricePerNight(new BigDecimal("1000.00"))
                .latitude(new BigDecimal("31.62")).longitude(new BigDecimal("-7.98"))
                .maxGuests(4).bedrooms(2).bathrooms(2).active(true).build());
    }

    private User user(String subject, UserRole role) {
        return userRepository.saveAndFlush(User.builder()
                .googleSubject(subject).email(subject + "@example.test").displayName(subject)
                .telephone("+212600000000").role(role).build());
    }

    private void booking(Property property, User user, BookingStatus status, LocalDate checkOut) {
        bookingRepository.saveAndFlush(Booking.builder()
                .property(property).user(user).checkInDate(checkOut.minusDays(2)).checkOutDate(checkOut)
                .adults(2).children(0).totalPrice(new BigDecimal("2000.00")).status(status).build());
    }
}

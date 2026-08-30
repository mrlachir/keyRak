package com.keyrak.marketplace.web;

import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProfileIdCardIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;

    @Test
    void uploadAndReplaceBelongsToAuthenticatedProfileAndRemainsPrivate() throws Exception {
        User user = user("id-owner");
        User other = user("id-other");
        var auth = jwt().jwt(token -> token.subject(user.getGoogleSubject()).claim("email", user.getEmail()));
        mvc.perform(multipart(HttpMethod.PUT, "/api/users/me/id-card").file(idCard("first.pdf")).with(auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(user.getId().toString()))
                .andExpect(jsonPath("$.idCardUrl").isNotEmpty());
        String firstPath = users.findById(user.getId()).orElseThrow().getIdCardUrl();
        mvc.perform(get(firstPath)).andExpect(status().isUnauthorized());
        mvc.perform(get(firstPath).with(auth)).andExpect(status().isNotFound());
        mvc.perform(multipart(HttpMethod.PUT, "/api/users/me/id-card").file(idCard("replacement.pdf")).with(auth))
                .andExpect(status().isOk());
        assertThat(users.findById(user.getId()).orElseThrow().getIdCardUrl()).isNotEqualTo(firstPath);
        assertThat(users.findById(other.getId()).orElseThrow().getIdCardUrl()).isNull();
    }

    @Test
    void existingProfileIdCanBeReusedAcrossBookingsButMissingIdCannotBypassValidation() throws Exception {
        User user = user("repeat-guest");
        var auth = jwt().jwt(token -> token.subject(user.getGoogleSubject()).claim("email", user.getEmail()));
        Property property = properties.saveAndFlush(Property.builder().title("Reuse Villa").description("ID reuse test")
                .propertyType(PropertyType.VILLA).address("A street").city("Marrakesh")
                .pricePerNight(new BigDecimal("1000")).latitude(BigDecimal.ZERO).longitude(BigDecimal.ZERO)
                .maxGuests(4).bedrooms(2).bathrooms(1).active(true).build());
        LocalDate checkIn = LocalDate.now().plusDays(10);
        MockMultipartFile details = booking(property, checkIn);
        mvc.perform(multipart("/api/bookings").file(details).with(auth)).andExpect(status().isBadRequest());
        mvc.perform(multipart(HttpMethod.PUT, "/api/users/me/id-card").file(idCard("reusable.pdf")).with(auth))
                .andExpect(status().isOk());
        String savedId = users.findById(user.getId()).orElseThrow().getIdCardUrl();
        mvc.perform(multipart("/api/bookings").file(details).with(auth))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.idCardUrl").doesNotExist());
        mvc.perform(multipart("/api/bookings").file(booking(property, checkIn.plusDays(5))).with(auth))
                .andExpect(status().isCreated());
        assertThat(users.findById(user.getId()).orElseThrow().getIdCardUrl()).isEqualTo(savedId);
    }

    @Test
    void uploadRejectsUnauthenticatedAndUnsupportedFiles() throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/api/users/me/id-card").file(idCard("unauth.pdf")))
                .andExpect(status().isUnauthorized());
        User user = user("invalid-id");
        mvc.perform(multipart(HttpMethod.PUT, "/api/users/me/id-card")
                        .file(new MockMultipartFile("idCard", "script.html", "text/html", "not an ID".getBytes()))
                        .with(jwt().jwt(token -> token.subject(user.getGoogleSubject()).claim("email", user.getEmail()))))
                .andExpect(status().isBadRequest());
        assertThat(users.findById(user.getId()).orElseThrow().getIdCardUrl()).isNull();
    }

    private MockMultipartFile booking(Property property, LocalDate checkIn) {
        return new MockMultipartFile("booking", "booking.json", "application/json", """
                {"propertyId":"%s","checkInDate":"%s","checkOutDate":"%s","adults":2,"children":0,"paymentMethod":"CASH_ON_ARRIVAL"}
                """.formatted(property.getId(), checkIn, checkIn.plusDays(2)).getBytes());
    }

    private MockMultipartFile idCard(String name) {
        return new MockMultipartFile("idCard", name, "application/pdf", "test document".getBytes());
    }

    private User user(String subject) {
        return users.saveAndFlush(User.builder().googleSubject(subject).email(subject + "@example.test")
                .displayName(subject).telephone("+212600000000").build());
    }
}

package com.keyrak.marketplace.web;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.Tag;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.TagRepository;
import com.keyrak.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MarketplaceFeatureIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Test
    void publicSearchAndBlockedDatesReturnBackendPropertyData() throws Exception {
        Property property = createProperty("Integration Villa");
        Tag pool = tagRepository.save(Tag.builder().name("Integration Pool").build());
        property.addTag(pool);
        property.addMedia(PropertyMedia.builder()
                .url("/uploads/integration-villa.jpg")
                .type(PropertyMediaType.IMAGE)
                .displayOrder(0)
                .build());
        property = propertyRepository.saveAndFlush(property);

        User user = userRepository.saveAndFlush(User.builder()
                .googleSubject("blocked-date-user")
                .email("blocked-date@example.com")
                .build());
        LocalDate checkIn = LocalDate.now().plusDays(4);
        bookingRepository.saveAndFlush(Booking.builder()
                .user(user)
                .property(property)
                .checkInDate(checkIn)
                .checkOutDate(checkIn.plusDays(2))
                .adults(2)
                .children(0)
                .totalPrice(new BigDecimal("3000.00"))
                .status(BookingStatus.CONFIRMED)
                .build());

        mockMvc.perform(get("/api/properties/search")
                        .param("location", "Marrakesh")
                        .param("guests", "4")
                        .param("amenities", "Integration Pool"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Integration Villa"))
                .andExpect(jsonPath("$[0].media[0].type").value("IMAGE"))
                .andExpect(jsonPath("$[0].tags[0].name").value("Integration Pool"));

        mockMvc.perform(get("/api/properties/{id}/blocked-dates", property.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blockedDates[0]").value(checkIn.toString()))
                .andExpect(jsonPath("$.blockedDates[1]").value(checkIn.plusDays(1).toString()));
    }

    @Test
    void authenticatedBookingRequestCreatesPendingRecordWithServerPrice() throws Exception {
        Property property = propertyRepository.saveAndFlush(createProperty("Booking Integration Villa"));
        LocalDate checkIn = LocalDate.now().plusDays(14);

        mockMvc.perform(post("/api/bookings")
                        .with(jwt().jwt(token -> token
                                .subject("booking-google-account")
                                .claim("email", "booking@example.com")
                                .claim("email_verified", true)
                                .claim("name", "Booking Guest")
                                .claim("roles", java.util.List.of("CLIENT"))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "propertyId": "%s",
                                  "checkInDate": "%s",
                                  "checkOutDate": "%s",
                                  "adults": 2,
                                  "children": 1,
                                  "specialRequests": "Airport transfer"
                                }
                                """.formatted(property.getId(), checkIn, checkIn.plusDays(3))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalPrice").value(4500.00))
                .andExpect(jsonPath("$.adults").value(2))
                .andExpect(jsonPath("$.children").value(1));
    }

    @Test
    void clientTripHistoryIsScopedToTheAuthenticatedGoogleSubject() throws Exception {
        Property property = propertyRepository.saveAndFlush(createProperty("Client Portal Villa"));
        User client = userRepository.saveAndFlush(User.builder()
                .googleSubject("portal-client")
                .email("portal-client@example.com")
                .displayName("Portal Client")
                .build());
        User anotherClient = userRepository.saveAndFlush(User.builder()
                .googleSubject("another-client")
                .email("another-client@example.com")
                .displayName("Another Client")
                .build());
        LocalDate checkIn = LocalDate.now().plusDays(30);
        bookingRepository.saveAndFlush(Booking.builder()
                .user(client)
                .property(property)
                .checkInDate(checkIn)
                .checkOutDate(checkIn.plusDays(3))
                .adults(2)
                .children(0)
                .totalPrice(new BigDecimal("4500.00"))
                .status(BookingStatus.CONFIRMED)
                .build());
        bookingRepository.saveAndFlush(Booking.builder()
                .user(anotherClient)
                .property(property)
                .checkInDate(checkIn.plusDays(10))
                .checkOutDate(checkIn.plusDays(12))
                .adults(1)
                .children(0)
                .totalPrice(new BigDecimal("3000.00"))
                .status(BookingStatus.PENDING)
                .build());

        mockMvc.perform(get("/api/bookings/me")
                        .with(jwt().jwt(token -> token
                                .subject("portal-client")
                                .claim("email", "portal-client@example.com")
                                .claim("email_verified", true)
                                .claim("name", "Portal Client")
                                .claim("roles", java.util.List.of("CLIENT")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].propertyTitle").value("Client Portal Villa"))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    @Test
    void adminCanReadMetricsAndModeratePendingBookings() throws Exception {
        Property property = propertyRepository.saveAndFlush(createProperty("Admin Review Villa"));
        User guest = userRepository.saveAndFlush(User.builder()
                .googleSubject("review-guest")
                .email("review-guest@example.com")
                .displayName("Review Guest")
                .build());
        LocalDate checkIn = LocalDate.now().plusDays(45);
        Booking confirmed = bookingRepository.saveAndFlush(Booking.builder()
                .user(guest)
                .property(property)
                .checkInDate(checkIn)
                .checkOutDate(checkIn.plusDays(2))
                .adults(2)
                .children(0)
                .totalPrice(new BigDecimal("3000.00"))
                .status(BookingStatus.CONFIRMED)
                .build());
        Booking pending = bookingRepository.saveAndFlush(Booking.builder()
                .user(guest)
                .property(property)
                .checkInDate(checkIn.plusDays(10))
                .checkOutDate(checkIn.plusDays(13))
                .adults(2)
                .children(1)
                .totalPrice(new BigDecimal("4500.00"))
                .status(BookingStatus.PENDING)
                .build());

        var admin = jwt().jwt(token -> token
                        .subject("admin-google-account")
                        .claim("email", "admin@example.com")
                        .claim("email_verified", true)
                        .claim("name", "KEYRAK Admin")
                        .claim("roles", java.util.List.of("ADMIN")))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));

        mockMvc.perform(get("/api/admin/dashboard/metrics").with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalActiveProperties").value(1))
                .andExpect(jsonPath("$.pendingBookingRequests").value(1))
                .andExpect(jsonPath("$.estimatedRevenue").value(confirmed.getTotalPrice().doubleValue()));

        mockMvc.perform(get("/api/admin/bookings").with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(pending.getId().toString()))
                .andExpect(jsonPath("$[0].guestEmail").value("review-guest@example.com"));

        mockMvc.perform(patch("/api/admin/bookings/{bookingId}/status", pending.getId())
                        .with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "CONFIRMED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(get("/api/properties/{id}/blocked-dates", property.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blockedDates").isArray())
                .andExpect(jsonPath("$.blockedDates[2]").value(pending.getCheckInDate().toString()));
    }

    private Property createProperty(String title) {
        return Property.builder()
                .title(title)
                .description("A property created for integration testing.")
                .propertyType(PropertyType.VILLA)
                .address("Route de l'Ourika")
                .city("Marrakesh")
                .pricePerNight(new BigDecimal("1500.00"))
                .latitude(new BigDecimal("31.5000000"))
                .longitude(new BigDecimal("-7.9000000"))
                .maxGuests(6)
                .bedrooms(3)
                .bathrooms(3)
                .active(true)
                .build();
    }
}

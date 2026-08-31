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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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

    @org.junit.jupiter.api.BeforeEach
    void persistedAdminRole() {
        userRepository.saveAndFlush(User.builder().googleSubject("admin-google-account").email("admin@example.com")
                .role(com.keyrak.marketplace.domain.enumeration.UserRole.ADMIN).build());
    }

    @Test
    void publicSearchAndBlockedDatesReturnBackendPropertyData() throws Exception {
        Property property = createProperty("Integration Villa");
        Property excludedByPriceAndCapacity = createProperty("Budget Studio");
        excludedByPriceAndCapacity.setPricePerNight(new BigDecimal("750.00"));
        excludedByPriceAndCapacity.setMaxGuests(2);
        excludedByPriceAndCapacity.setBedrooms(1);
        excludedByPriceAndCapacity.setBathrooms(1);
        excludedByPriceAndCapacity.setPropertyType(PropertyType.APARTMENT);
        propertyRepository.saveAndFlush(excludedByPriceAndCapacity);
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
                        .param("keyword", "Integration Marrakesh")
                        .param("location", "Marrakesh")
                        .param("guests", "4")
                        .param("minPrice", "1000")
                        .param("maxPrice", "2000")
                        .param("bedrooms", "3")
                        .param("bathrooms", "3")
                        .param("tags", "Integration Pool"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Integration Villa"))
                .andExpect(jsonPath("$[0].media[0].type").value("IMAGE"))
                .andExpect(jsonPath("$[0].tags[0].name").value("Integration Pool"));

        mockMvc.perform(get("/api/properties/search")
                        .param("keyword", "apartment")
                        .param("bedrooms", "1")
                        .param("bathrooms", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Budget Studio"));

        mockMvc.perform(get("/api/properties/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Integration Pool"));

        mockMvc.perform(get("/api/properties/{id}/blocked-dates", property.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blockedDates[0]").value(checkIn.toString()))
                .andExpect(jsonPath("$.blockedDates[1]").value(checkIn.plusDays(1).toString()));

        mockMvc.perform(get("/api/properties/search")
                        .param("checkInDate", checkIn.toString())
                        .param("checkOutDate", checkIn.plusDays(2).toString())
                        .param("tags", "Integration Pool"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void authenticatedBookingRequestCreatesPendingRecordWithServerPrice() throws Exception {
        Property property = propertyRepository.saveAndFlush(createProperty("Booking Integration Villa"));
        userRepository.saveAndFlush(User.builder()
                .googleSubject("booking-google-account")
                .email("booking@example.com")
                .displayName("Booking Guest")
                .telephone("+212 622 222 222")
                .build());
        LocalDate checkIn = LocalDate.now().plusDays(14);

        MockMultipartFile bookingPart = new MockMultipartFile(
                "booking",
                "booking.json",
                MediaType.APPLICATION_JSON_VALUE,
                """
                        {
                          "propertyId": "%s",
                          "checkInDate": "%s",
                          "checkOutDate": "%s",
                          "adults": 2,
                          "children": 1,
                          "paymentMethod": "CREDIT_CARD",
                          "specialRequests": "Airport transfer"
                        }
                        """.formatted(property.getId(), checkIn, checkIn.plusDays(3)).getBytes()
        );
        MockMultipartFile idCard = new MockMultipartFile(
                "idCard",
                "identity.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "test government id".getBytes()
        );

        mockMvc.perform(multipart("/api/bookings")
                        .file(bookingPart)
                        .file(idCard)
                        .with(jwt().jwt(token -> token
                                .subject("booking-google-account")
                                .claim("email", "booking@example.com")
                                .claim("email_verified", true)
                                .claim("name", "Booking Guest")
                                .claim("roles", java.util.List.of("CLIENT")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalPrice").value(4500.00))
                .andExpect(jsonPath("$.adults").value(2))
                .andExpect(jsonPath("$.children").value(1))
                .andExpect(jsonPath("$.paymentMethod").value("CREDIT_CARD"))
                .andExpect(jsonPath("$.idCardUrl").doesNotExist())
                .andExpect(jsonPath("$.cancellationRequested").value(false));
        mockMvc.perform(get("/api/users/me").with(jwt().jwt(token -> token
                        .subject("booking-google-account").claim("email", "booking@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCardUrl").value(org.hamcrest.Matchers.startsWith("/uploads/id-cards/")));
    }

    @Test
    void clientCanCancelOnlyTheirPendingReservation() throws Exception {
        Property property = propertyRepository.saveAndFlush(createProperty("Cancellation Villa"));
        User user = userRepository.saveAndFlush(User.builder()
                .googleSubject("cancellation-client")
                .email("cancellation@example.com")
                .displayName("Cancellation Client")
                .telephone("+212 611 111 111")
                .build());
        LocalDate checkIn = LocalDate.now().plusDays(21);
        Booking booking = bookingRepository.saveAndFlush(Booking.builder()
                .user(user)
                .property(property)
                .checkInDate(checkIn)
                .checkOutDate(checkIn.plusDays(2))
                .adults(2)
                .children(0)
                .totalPrice(new BigDecimal("3000.00"))
                .status(BookingStatus.PENDING)
                .build());

        mockMvc.perform(patch("/api/bookings/{bookingId}/status", booking.getId())
                        .with(jwt().jwt(token -> token
                                .subject("cancellation-client")
                                .claim("email", "cancellation@example.com")
                                .claim("email_verified", true)
                                .claim("name", "Cancellation Client")
                                .claim("roles", java.util.List.of("CLIENT"))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "CANCELLED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        mockMvc.perform(get("/api/properties/{id}/blocked-dates", property.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blockedDates.length()").value(0));
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
                .telephone("+212 633 333 333")
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
                .andExpect(jsonPath("$[0].guestEmail").value("review-guest@example.com"))
                .andExpect(jsonPath("$[0].guestTelephone").value("+212 633 333 333"));

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

    @Test
    void confirmedCancellationRequestsCanBeRejectedOrApprovedByAdmin() throws Exception {
        Property property = propertyRepository.saveAndFlush(createProperty("Cancellation Review Villa"));
        User guest = userRepository.saveAndFlush(User.builder()
                .googleSubject("confirmed-cancellation-client")
                .email("confirmed-cancellation@example.com")
                .displayName("Confirmed Guest")
                .telephone("+212 644 444 444")
                .build());
        LocalDate checkIn = LocalDate.now().plusDays(50);
        Booking booking = bookingRepository.saveAndFlush(Booking.builder()
                .user(guest)
                .property(property)
                .checkInDate(checkIn)
                .checkOutDate(checkIn.plusDays(3))
                .adults(2)
                .children(0)
                .totalPrice(new BigDecimal("4500.00"))
                .status(BookingStatus.CONFIRMED)
                .build());

        var client = jwt().jwt(token -> token
                .subject("confirmed-cancellation-client")
                .claim("email", "confirmed-cancellation@example.com")
                .claim("email_verified", true)
                .claim("name", "Confirmed Guest")
                .claim("roles", java.util.List.of("CLIENT")));
        var admin = jwt().jwt(token -> token
                        .subject("admin-google-account")
                        .claim("email", "admin@example.com")
                        .claim("email_verified", true)
                        .claim("name", "KEYRAK Admin")
                        .claim("roles", java.util.List.of("ADMIN")))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));

        mockMvc.perform(patch("/api/bookings/{bookingId}/request-cancel", booking.getId()).with(client))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.cancellationRequested").value(true));

        mockMvc.perform(get("/api/admin/bookings").with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].guestTelephone").value("+212 644 444 444"))
                .andExpect(jsonPath("$[0].cancellationRequested").value(true));

        mockMvc.perform(patch("/api/admin/bookings/{bookingId}/cancellation-request", booking.getId())
                        .with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.cancellationRequested").value(false));

        mockMvc.perform(patch("/api/bookings/{bookingId}/request-cancel", booking.getId()).with(client))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancellationRequested").value(true));

        mockMvc.perform(patch("/api/admin/bookings/{bookingId}/cancellation-request", booking.getId())
                        .with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancellationRequested").value(false));

        mockMvc.perform(get("/api/properties/{id}/blocked-dates", property.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blockedDates.length()").value(0));
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

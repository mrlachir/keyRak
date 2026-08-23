package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.web.dto.BlockedDatesResponse;
import com.keyrak.marketplace.web.dto.BookingResponse;
import com.keyrak.marketplace.web.dto.CreateBookingRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private UserService userService;

    private BookingService bookingService;
    private Property property;
    private User user;

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(bookingRepository, propertyRepository, userService);
        property = Property.builder()
                .id(UUID.randomUUID())
                .title("Villa Atlas")
                .propertyType(PropertyType.VILLA)
                .address("Route de l'Ourika")
                .city("Marrakesh")
                .pricePerNight(new BigDecimal("1250.00"))
                .latitude(new BigDecimal("31.5000000"))
                .longitude(new BigDecimal("-7.9000000"))
                .maxGuests(6)
                .bedrooms(3)
                .bathrooms(3)
                .active(true)
                .build();
        user = User.builder()
                .id(UUID.randomUUID())
                .googleSubject("google-subject")
                .email("guest@example.com")
                .build();
    }

    @Test
    void createCalculatesPriceOnServerAndCreatesPendingBooking() {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        CreateBookingRequest request = new CreateBookingRequest(
                property.getId(),
                checkIn,
                checkIn.plusDays(3),
                2,
                1,
                "Late arrival"
        );
        when(propertyRepository.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(bookingRepository.countByPropertyIdAndStatusInAndCheckOutDateGreaterThanAndCheckInDateLessThan(
                any(UUID.class), anyCollection(), any(LocalDate.class), any(LocalDate.class)
        )).thenReturn(0L);
        when(userService.getByGoogleSubject("google-subject")).thenReturn(user);
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(UUID.randomUUID());
            return booking;
        });

        BookingResponse response = bookingService.create(request, "google-subject");

        assertThat(response.totalPrice()).isEqualByComparingTo("3750.00");
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING);
        assertThat(response.adults()).isEqualTo(2);
        assertThat(response.children()).isEqualTo(1);
    }

    @Test
    void createRejectsOverlappingPendingOrConfirmedDates() {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        CreateBookingRequest request = new CreateBookingRequest(
                property.getId(), checkIn, checkIn.plusDays(2), 2, 0, null
        );
        when(propertyRepository.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(bookingRepository.countByPropertyIdAndStatusInAndCheckOutDateGreaterThanAndCheckInDateLessThan(
                any(UUID.class), anyCollection(), any(LocalDate.class), any(LocalDate.class)
        )).thenReturn(1L);

        assertThatThrownBy(() -> bookingService.create(request, "google-subject"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("no longer available");
        verify(bookingRepository, never()).saveAndFlush(any(Booking.class));
    }

    @Test
    void blockedDatesExpandEachReservedNightAndExcludeCheckout() {
        LocalDate checkIn = LocalDate.now().plusDays(2);
        Booking booking = Booking.builder()
                .property(property)
                .user(user)
                .checkInDate(checkIn)
                .checkOutDate(checkIn.plusDays(3))
                .adults(2)
                .children(0)
                .totalPrice(new BigDecimal("3750.00"))
                .status(BookingStatus.CONFIRMED)
                .build();
        when(propertyRepository.existsById(property.getId())).thenReturn(true);
        when(bookingRepository.findByPropertyIdAndStatusInAndCheckOutDateAfterOrderByCheckInDateAsc(
                any(UUID.class), anyCollection(), any(LocalDate.class)
        )).thenReturn(List.of(booking));

        BlockedDatesResponse response = bookingService.getBlockedDates(property.getId());

        assertThat(response.blockedDates()).containsExactly(
                checkIn,
                checkIn.plusDays(1),
                checkIn.plusDays(2)
        );
    }
}

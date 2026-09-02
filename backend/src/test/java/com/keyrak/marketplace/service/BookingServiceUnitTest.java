package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PaymentMethod;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.web.dto.CreateBookingRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceUnitTest {

    private static final String SUBJECT = "test-google-subject";
    private static final LocalDate CHECK_IN = LocalDate.of(2030, 9, 10);

    @Mock private BookingRepository bookingRepository;
    @Mock private PropertyRepository propertyRepository;
    @Mock private UserService userService;
    @Mock private NotificationService notificationService;
    @InjectMocks private BookingService service;

    private Property property;
    private User user;

    @BeforeEach
    void setUp() {
        property = Property.builder().id(UUID.randomUUID()).title("Atlas home")
                .active(true).maxGuests(6).pricePerNight(new BigDecimal("1250.50")).build();
        user = User.builder().id(UUID.randomUUID()).googleSubject(SUBJECT)
                .displayName("Test Guest").email("guest@example.test").telephone("+212600000000").build();
    }

    @Test
    void missingOrInactivePropertyCannotBeBooked() {
        CreateBookingRequest request = request(CHECK_IN.plusDays(2), 2, null);
        assertStatus(HttpStatus.NOT_FOUND, () -> service.create(request, null, SUBJECT));

        property.setActive(false);
        when(propertyRepository.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.create(request, null, SUBJECT));
        verifyNoInteractions(userService, bookingRepository);
    }

    @Test
    void incompleteProfileCannotCreateBooking() {
        when(propertyRepository.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(userService.getByGoogleSubject(SUBJECT)).thenReturn(user);

        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.create(request(CHECK_IN.plusDays(2), 2, null), null, SUBJECT));
        verifyNoInteractions(bookingRepository);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void checkoutMustBeStrictlyAfterCheckin(int days) {
        readyProfile();
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.create(request(CHECK_IN.plusDays(days), 2, null), null, SUBJECT));
        verifyNoInteractions(bookingRepository);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 7})
    void rejectsGuestCountOutsidePropertyCapacity(int guests) {
        readyProfile();
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.create(request(CHECK_IN.plusDays(2), guests, null), null, SUBJECT));
        verifyNoInteractions(bookingRepository);
    }

    @Test
    void requiresAnIdWhenNeitherProfileNorRequestHasOne() {
        readyProfile();
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.create(request(CHECK_IN.plusDays(2), 2, null), null, SUBJECT));
        verify(bookingRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "  Arriving late  "})
    void reusesProfileIdAndNormalizesSpecialRequests(String notes) {
        readyProfile();
        when(userService.hasIdCard(user)).thenReturn(true);
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(call -> call.getArgument(0));

        var result = service.create(request(CHECK_IN.plusDays(2), 6, notes), null, SUBJECT);

        assertThat(result.status()).isEqualTo(BookingStatus.PENDING);
        assertThat(result.paymentMethod()).isEqualTo(PaymentMethod.CASH_ON_ARRIVAL);
        assertThat(result.totalPrice()).isEqualByComparingTo("2501.00");
        assertThat(result.cancellationRequested()).isFalse();
        ArgumentCaptor<Booking> saved = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getSpecialRequests())
                .isEqualTo(notes == null || notes.isBlank() ? null : notes.trim());
        verify(userService, never()).updateIdCard(any(), any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void emptyOptionalUploadDoesNotReplaceExistingId() {
        readyProfile();
        when(userService.hasIdCard(user)).thenReturn(true);
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(call -> call.getArgument(0));
        var emptyFile = new MockMultipartFile("idCard", new byte[0]);

        service.create(request(CHECK_IN.plusDays(1), 1, null), emptyFile, SUBJECT);

        verify(userService, never()).updateIdCard(any(), any());
        verify(bookingRepository).saveAndFlush(any());
    }

    @Test
    void missingPropertyHasNoPublicAvailability() {
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getBlockedDates(property.getId()));
        verifyNoInteractions(bookingRepository);
    }

    @Test
    void invalidAdminDecisionDoesNotReadOrModifyBooking() {
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.updatePendingStatus(UUID.randomUUID(), BookingStatus.PENDING));
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.updatePendingStatus(UUID.randomUUID(), null));
        verifyNoInteractions(bookingRepository, notificationService);
    }

    @Test
    void missingBookingsReturnNotFoundAcrossModerationAndOwnerActions() {
        UUID missing = UUID.randomUUID();
        assertStatus(HttpStatus.NOT_FOUND, () -> service.updatePendingStatus(missing, BookingStatus.CONFIRMED));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.cancelPendingBooking(missing, SUBJECT));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.requestCancellation(missing, SUBJECT));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.moderateCancellationRequest(missing, true));
        verify(bookingRepository, never()).saveAndFlush(any());
        verifyNoInteractions(notificationService);
    }

    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = {"CONFIRMED", "CANCELLED"})
    void adminCannotReviewAnAlreadyReviewedBooking(BookingStatus status) {
        Booking booking = existingBooking(status, false);
        assertStatus(HttpStatus.CONFLICT, () -> service.updatePendingStatus(booking.getId(), BookingStatus.CONFIRMED));
        verify(bookingRepository, never()).saveAndFlush(any());
        verifyNoInteractions(notificationService);
    }

    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = {"CONFIRMED", "CANCELLED"})
    void adminSendsApprovalNotificationOnlyForConfirmedBookings(BookingStatus decision) {
        Booking booking = existingBooking(BookingStatus.PENDING, false);
        when(bookingRepository.saveAndFlush(booking)).thenReturn(booking);

        var result = service.updatePendingStatus(booking.getId(), decision);

        assertThat(result.status()).isEqualTo(decision);
        if (decision == BookingStatus.CONFIRMED) {
            verify(notificationService).notifyBookingApproved(booking);
        } else {
            verifyNoInteractions(notificationService);
        }
    }

    @Test
    void ownerActionsDoNotDiscloseAnotherUsersBooking() {
        Booking booking = existingBooking(BookingStatus.PENDING, false);
        assertStatus(HttpStatus.NOT_FOUND, () -> service.cancelPendingBooking(booking.getId(), "another-user"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.requestCancellation(booking.getId(), "another-user"));
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
        verify(bookingRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = {"CONFIRMED", "CANCELLED"})
    void ownerCannotDirectlyCancelReviewedBookings(BookingStatus status) {
        Booking booking = existingBooking(status, false);
        assertStatus(HttpStatus.CONFLICT, () -> service.cancelPendingBooking(booking.getId(), SUBJECT));
        verify(bookingRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = {"PENDING", "CANCELLED"})
    void onlyConfirmedBookingsCanRequestCancellation(BookingStatus status) {
        Booking booking = existingBooking(status, false);
        assertStatus(HttpStatus.CONFLICT, () -> service.requestCancellation(booking.getId(), SUBJECT));
        verify(bookingRepository, never()).saveAndFlush(any());
    }

    @Test
    void repeatedCancellationRequestIsIdempotent() {
        Booking booking = existingBooking(BookingStatus.CONFIRMED, true);
        var result = service.requestCancellation(booking.getId(), SUBJECT);
        assertThat(result.cancellationRequested()).isTrue();
        assertThat(result.status()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, never()).saveAndFlush(any());
        verifyNoInteractions(notificationService);
    }

    @ParameterizedTest
    @EnumSource(BookingStatus.class)
    void cancellationModerationRequiresAnOutstandingConfirmedRequest(BookingStatus status) {
        Booking booking = existingBooking(status, false);
        assertStatus(HttpStatus.CONFLICT, () -> service.moderateCancellationRequest(booking.getId(), true));
        verify(bookingRepository, never()).saveAndFlush(any());
        verifyNoInteractions(notificationService);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void cancellationDecisionUpdatesStateAndNotifiesOnlyOnApproval(boolean approved) {
        Booking booking = existingBooking(BookingStatus.CONFIRMED, true);
        when(bookingRepository.saveAndFlush(booking)).thenReturn(booking);

        var result = service.moderateCancellationRequest(booking.getId(), approved);

        assertThat(result.cancellationRequested()).isFalse();
        assertThat(result.status()).isEqualTo(approved ? BookingStatus.CANCELLED : BookingStatus.CONFIRMED);
        if (approved) {
            verify(notificationService).notifyCancellationApproved(booking);
        } else {
            verifyNoInteractions(notificationService);
        }
    }

    private void readyProfile() {
        when(propertyRepository.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(userService.getByGoogleSubject(SUBJECT)).thenReturn(user);
        when(userService.isProfileComplete(user)).thenReturn(true);
    }

    private CreateBookingRequest request(LocalDate checkout, int guests, String notes) {
        return new CreateBookingRequest(property.getId(), CHECK_IN, checkout, guests, 0,
                PaymentMethod.CASH_ON_ARRIVAL, notes);
    }

    private Booking existingBooking(BookingStatus status, boolean cancellationRequested) {
        Booking booking = Booking.builder().id(UUID.randomUUID()).property(property).user(user)
                .checkInDate(CHECK_IN).checkOutDate(CHECK_IN.plusDays(2)).adults(2).children(0)
                .totalPrice(new BigDecimal("2501.00")).paymentMethod(PaymentMethod.CASH_ON_ARRIVAL)
                .status(status).cancellationRequested(cancellationRequested).build();
        when(bookingRepository.findByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        return booking;
    }

    private void assertStatus(HttpStatus status, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}

package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.web.dto.BlockedDatesResponse;
import com.keyrak.marketplace.web.dto.AdminBookingResponse;
import com.keyrak.marketplace.web.dto.AdminDashboardResponse;
import com.keyrak.marketplace.web.dto.BookingResponse;
import com.keyrak.marketplace.web.dto.CreateBookingRequest;
import com.keyrak.marketplace.web.dto.TripResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.UUID;

@Service
public class BookingService {

    private static final EnumSet<BookingStatus> BLOCKING_STATUSES =
            EnumSet.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);

    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final UserService userService;

    public BookingService(
            BookingRepository bookingRepository,
            PropertyRepository propertyRepository,
            UserService userService
    ) {
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public BlockedDatesResponse getBlockedDates(UUID propertyId) {
        if (!propertyRepository.existsById(propertyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        SortedSet<LocalDate> dates = new TreeSet<>();
        bookingRepository.findByPropertyIdAndStatusInAndCheckOutDateAfterOrderByCheckInDateAsc(
                        propertyId,
                        BLOCKING_STATUSES,
                        LocalDate.now()
                )
                .forEach(booking -> {
                    for (LocalDate date = booking.getCheckInDate();
                         date.isBefore(booking.getCheckOutDate());
                         date = date.plusDays(1)) {
                        dates.add(date);
                    }
                });
        return new BlockedDatesResponse(dates.stream().toList());
    }

    @Transactional
    public BookingResponse create(CreateBookingRequest request, String googleSubject) {
        Property property = propertyRepository.findByIdForUpdate(request.propertyId())
                .filter(Property::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        User user = userService.getByGoogleSubject(googleSubject);
        if (!userService.isProfileComplete(user)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Complete your full name and telephone before requesting a booking"
            );
        }

        if (!request.checkOutDate().isAfter(request.checkInDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-out must be after check-in");
        }
        int totalGuests = request.adults() + request.children();
        if (totalGuests < 1 || totalGuests > property.getMaxGuests()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Guest count must be between 1 and " + property.getMaxGuests()
            );
        }

        long conflicts = bookingRepository
                .countByPropertyIdAndStatusInAndCheckOutDateGreaterThanAndCheckInDateLessThan(
                        property.getId(),
                        BLOCKING_STATUSES,
                        request.checkInDate(),
                        request.checkOutDate()
                );
        if (conflicts > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected dates are no longer available");
        }

        long nights = ChronoUnit.DAYS.between(request.checkInDate(), request.checkOutDate());
        BigDecimal totalPrice = property.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        Booking booking = Booking.builder()
                .property(property)
                .user(user)
                .checkInDate(request.checkInDate())
                .checkOutDate(request.checkOutDate())
                .adults(request.adults())
                .children(request.children())
                .specialRequests(normalizeSpecialRequests(request.specialRequests()))
                .totalPrice(totalPrice)
                .status(BookingStatus.PENDING)
                .build();
        return BookingResponse.from(bookingRepository.saveAndFlush(booking));
    }

    @Transactional(readOnly = true)
    public List<TripResponse> getTrips(String googleSubject) {
        userService.getByGoogleSubject(googleSubject);
        return bookingRepository.findByUserGoogleSubjectOrderByCheckInDateDesc(googleSubject)
                .stream()
                .map(TripResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse getAdminDashboard() {
        return new AdminDashboardResponse(
                propertyRepository.countByActiveTrue(),
                bookingRepository.countByStatus(BookingStatus.PENDING),
                bookingRepository.sumTotalPriceByStatus(BookingStatus.CONFIRMED)
        );
    }

    @Transactional(readOnly = true)
    public List<AdminBookingResponse> getPendingBookings() {
        return bookingRepository.findByStatusOrderByCreatedAtAsc(BookingStatus.PENDING)
                .stream()
                .map(AdminBookingResponse::from)
                .toList();
    }

    @Transactional
    public AdminBookingResponse updatePendingStatus(UUID bookingId, BookingStatus requestedStatus) {
        if (requestedStatus != BookingStatus.CONFIRMED && requestedStatus != BookingStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A pending booking can only be confirmed or cancelled"
            );
        }

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has already been reviewed");
        }

        booking.setStatus(requestedStatus);
        return AdminBookingResponse.from(bookingRepository.saveAndFlush(booking));
    }

    @Transactional
    public BookingResponse cancelPendingBooking(UUID bookingId, String googleSubject) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!googleSubject.equals(booking.getUser().getGoogleSubject())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only pending reservations can be cancelled online"
            );
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return BookingResponse.from(bookingRepository.saveAndFlush(booking));
    }

    private String normalizeSpecialRequests(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

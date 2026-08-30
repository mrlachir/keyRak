package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    long countByStatus(BookingStatus status);

    boolean existsByPropertyId(UUID propertyId);

    @Query("select coalesce(sum(b.totalPrice), 0) from Booking b where b.paymentCompleted = true")
    BigDecimal sumCompletedPayments();

    @Query("""
            select coalesce(sum(b.totalPrice), 0) from Booking b
            where b.status = com.keyrak.marketplace.domain.enumeration.BookingStatus.CONFIRMED
              and b.paymentMethod = com.keyrak.marketplace.domain.enumeration.PaymentMethod.CASH_ON_ARRIVAL
            """)
    BigDecimal sumConfirmedCashOnArrival();

    @EntityGraph(attributePaths = {"property", "property.media", "user"})
    List<Booking> findAllByOrderByCreatedAtDesc();

    @Query("select coalesce(sum(booking.totalPrice), 0) from Booking booking where booking.status = :status")
    BigDecimal sumTotalPriceByStatus(@Param("status") BookingStatus status);

    @EntityGraph(attributePaths = {"property", "user"})
    List<Booking> findByStatusOrderByCreatedAtAsc(BookingStatus status);

    @EntityGraph(attributePaths = {"property", "property.media", "user"})
    @Query("""
            select booking from Booking booking
            where booking.status = com.keyrak.marketplace.domain.enumeration.BookingStatus.PENDING
               or (booking.status = com.keyrak.marketplace.domain.enumeration.BookingStatus.CONFIRMED
                   and booking.cancellationRequested = true)
            order by booking.createdAt asc
            """)
    List<Booking> findAdminReviewQueue();

    @EntityGraph(attributePaths = {"property", "property.media"})
    List<Booking> findByUserGoogleSubjectOrderByCheckInDateDesc(String googleSubject);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select booking from Booking booking where booking.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") UUID id);

    long countByPropertyIdAndStatusInAndCheckOutDateGreaterThanAndCheckInDateLessThan(
            UUID propertyId,
            Collection<BookingStatus> statuses,
            LocalDate requestedCheckIn,
            LocalDate requestedCheckOut
    );

    List<Booking> findByPropertyIdAndStatusInAndCheckOutDateAfterOrderByCheckInDateAsc(
            UUID propertyId,
            Collection<BookingStatus> statuses,
            LocalDate date
    );

    boolean existsByPropertyIdAndUserIdAndStatusAndCheckInDateLessThanEqual(
            UUID propertyId,
            UUID userId,
            BookingStatus status,
            LocalDate date
    );
}

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

    @Query("select coalesce(sum(booking.totalPrice), 0) from Booking booking where booking.status = :status")
    BigDecimal sumTotalPriceByStatus(@Param("status") BookingStatus status);

    @EntityGraph(attributePaths = {"property", "user"})
    List<Booking> findByStatusOrderByCreatedAtAsc(BookingStatus status);

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
}

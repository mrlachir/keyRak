package com.keyrak.marketplace.repository;

import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    List<User> findByRole(UserRole role);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByGoogleSubject(String googleSubject);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.role = com.keyrak.marketplace.domain.enumeration.UserRole.ADMIN order by u.id")
    List<User> lockAdministrators();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.googleSubject = :subject")
    Optional<User> findByGoogleSubjectForUpdate(@Param("subject") String googleSubject);
}

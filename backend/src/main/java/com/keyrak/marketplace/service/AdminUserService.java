package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.AccountSessionRevocation;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.AccountSessionRevocationRepository;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.security.AccountIdentityFingerprint;
import com.keyrak.marketplace.web.dto.AdminUserResponse;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserService {
    private final UserRepository users;
    private final BookingRepository bookings;
    private final BookingDocumentStorageService documents;
    private final AccountSessionRevocationRepository sessionRevocations;

    public AdminUserService(UserRepository users, BookingRepository bookings, BookingDocumentStorageService documents,
                            AccountSessionRevocationRepository sessionRevocations) {
        this.users = users;
        this.bookings = bookings;
        this.documents = documents;
        this.sessionRevocations = sessionRevocations;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> list() {
        return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream().map(AdminUserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse get(UUID id) { return AdminUserResponse.from(find(id)); }

    @Transactional(readOnly = true)
    public BookingDocumentStorageService.StoredDocument getIdCard(UUID id) {
        return documents.read(find(id).getIdCardUrl());
    }

    @Transactional
    public AdminUserResponse updateRole(UUID id, UserRole role, String actorSubject) {
        List<User> administrators = users.lockAdministrators();
        requireCurrentAdmin(administrators, actorSubject);
        User user = users.findByIdForUpdate(id).orElseThrow(this::notFound);
        if (user.getRole() == role) return AdminUserResponse.from(user);
        guardAccountChange(user, administrators, actorSubject);
        user.setRole(role);
        return AdminUserResponse.from(users.saveAndFlush(user));
    }

    @Transactional
    public void delete(UUID id, String actorSubject) {
        List<User> administrators = users.lockAdministrators();
        requireCurrentAdmin(administrators, actorSubject);
        User user = users.findByIdForUpdate(id).orElseThrow(this::notFound);
        guardAccountChange(user, administrators, actorSubject);
        // A locking read plus the user lock also protects against a concurrent reservation insert.
        if (!bookings.findByUserIdForUpdate(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This account has booking history and cannot be permanently removed. Reservations and financial records must be preserved.");
        }
        if (user.getGoogleSubject() != null) {
            sessionRevocations.save(new AccountSessionRevocation(AccountIdentityFingerprint.of(user.getGoogleSubject()), Instant.now()));
        }
        String documentPath = user.getIdCardUrl();
        users.delete(user); // Explicit User cascades remove reviews, saved properties, and notifications.
        users.flush();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { documents.deleteQuietly(documentPath); }
        });
    }

    private void requireCurrentAdmin(List<User> administrators, String subject) {
        if (administrators.stream().noneMatch(user -> subject.equals(user.getGoogleSubject()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required");
        }
    }

    private void guardAccountChange(User user, List<User> administrators, String actorSubject) {
        if (actorSubject.equals(user.getGoogleSubject())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot remove your own account or change your own role.");
        }
        if (user.getRole() == UserRole.ADMIN && administrators.size() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "At least one administrator must remain.");
        }
    }

    private User find(UUID id) { return users.findById(id).orElseThrow(this::notFound); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"); }
}

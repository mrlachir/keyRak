package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.AccountSessionRevocation;
import com.keyrak.marketplace.domain.entity.User;
import com.keyrak.marketplace.domain.enumeration.UserRole;
import com.keyrak.marketplace.repository.AccountSessionRevocationRepository;
import com.keyrak.marketplace.repository.UserRepository;
import com.keyrak.marketplace.security.AccountIdentityFingerprint;
import com.keyrak.marketplace.security.InvalidGoogleIdentityException;
import com.keyrak.marketplace.web.dto.UpdateUserProfileRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceUnitTest {

    private static final String SUBJECT = "test-google-subject";
    private static final String EMAIL = "guest@example.test";

    @Mock private UserRepository userRepository;
    @Mock private BookingDocumentStorageService documentStorageService;
    @Mock private AccountSessionRevocationRepository sessionRevocations;
    @InjectMocks private UserService service;

    @Test
    void createsClientFromNormalizedGoogleClaimsWithoutTrustingTokenRoles() {
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        Jwt jwt = token().subject(" " + SUBJECT + " ").claim("email", " Guest@Example.Test ")
                .claim("name", " Test Guest ").claim("picture", " https://example.test/avatar.png ")
                .claim("roles", "ADMIN").build();

        User result = service.synchronizeGoogleUser(jwt);

        assertThat(result.getRole()).isEqualTo(UserRole.CLIENT);
        assertThat(result.getGoogleSubject()).isEqualTo(SUBJECT);
        assertThat(result.getEmail()).isEqualTo(EMAIL);
        assertThat(result.getDisplayName()).isEqualTo("Test Guest");
        assertThat(result.getAvatarUrl()).isEqualTo("https://example.test/avatar.png");
        verify(sessionRevocations).findById(AccountIdentityFingerprint.of(SUBJECT));
    }

    @Test
    void preservesUserEditedNameAndDatabaseRoleOnSubsequentSignIn() {
        User existing = user();
        existing.setDisplayName("Preferred name");
        existing.setRole(UserRole.ADMIN);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(existing));
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        User result = service.synchronizeGoogleUser(token().claim("name", "Google name").build());

        assertThat(result).isSameAs(existing);
        assertThat(result.getDisplayName()).isEqualTo("Preferred name");
        assertThat(result.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(result.getAvatarUrl()).isNull();
    }

    @Test
    void linksAnUnlinkedEmailAccountAndFillsBlankName() {
        User existing = user();
        existing.setGoogleSubject(null);
        existing.setDisplayName(" ");
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        User result = service.synchronizeGoogleUser(token().claim("name", " Google Guest ").build());

        assertThat(result).isSameAs(existing);
        assertThat(result.getGoogleSubject()).isEqualTo(SUBJECT);
        assertThat(result.getDisplayName()).isEqualTo("Google Guest");
    }

    @Test
    void boundsGoogleMetadataToDatabaseColumnLengths() {
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        User result = service.synchronizeGoogleUser(token().claim("name", "N".repeat(160))
                .claim("picture", "P".repeat(2050)).build());
        assertThat(result.getDisplayName()).isEqualTo("N".repeat(150));
        assertThat(result.getAvatarUrl()).isEqualTo("P".repeat(2048));
    }

    @Test
    void missingOptionalGoogleMetadataDoesNotPreventProfileCreation() {
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        User result = service.synchronizeGoogleUser(token().build());
        assertThat(result.getDisplayName()).isNull();
        assertThat(result.getAvatarUrl()).isNull();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void rejectsMissingSubject(String subject) {
        Jwt.Builder builder = token();
        builder.claims(claims -> {
            claims.remove("sub");
            if (subject != null) claims.put("sub", subject);
        });
        assertThatThrownBy(() -> service.synchronizeGoogleUser(builder.build()))
                .isInstanceOf(InvalidGoogleIdentityException.class)
                .hasMessage("The token is missing the JWT subject claim");
        verifyNoInteractions(userRepository, sessionRevocations);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void rejectsMissingEmail(String email) {
        Jwt.Builder builder = token();
        builder.claims(claims -> {
            claims.remove("email");
            if (email != null) claims.put("email", email);
        });
        assertThatThrownBy(() -> service.synchronizeGoogleUser(builder.build()))
                .isInstanceOf(InvalidGoogleIdentityException.class)
                .hasMessage("The token is missing the email claim");
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsMalformedOrOversizedEmail() {
        for (String email : new String[] {"not-an-email", "x".repeat(321) + "@example.test"}) {
            assertThatThrownBy(() -> service.synchronizeGoogleUser(token().claim("email", email).build()))
                    .isInstanceOf(InvalidGoogleIdentityException.class)
                    .hasMessage("The token contains an invalid email address");
        }
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsAnExplicitlyUnverifiedEmail() {
        assertThatThrownBy(() -> service.synchronizeGoogleUser(token().claim("email_verified", false).build()))
                .isInstanceOf(InvalidGoogleIdentityException.class)
                .hasMessage("The Google email address is not verified");
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsSubjectAndEmailThatIdentifyDifferentUsers() {
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(user()));
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));

        assertThatThrownBy(() -> service.synchronizeGoogleUser(token().build()))
                .isInstanceOf(InvalidGoogleIdentityException.class)
                .hasMessage("The Google identity conflicts with an existing account");
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsEmailAlreadyLinkedToADifferentGoogleIdentity() {
        User existing = user();
        existing.setGoogleSubject("different-subject");
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.synchronizeGoogleUser(token().build()))
                .isInstanceOf(InvalidGoogleIdentityException.class)
                .hasMessage("The email address belongs to another Google identity");
        assertThat(existing.getGoogleSubject()).isEqualTo("different-subject");
        verify(userRepository, never()).save(any());
    }

    @ParameterizedTest
    @MethodSource("revokedAuthTimes")
    void rejectsRevokedLoginEvenWhenAccessTokenWasRecentlyRefreshed(Object authTime) {
        stubRevocation();
        Jwt.Builder builder = token().issuedAt(Instant.ofEpochSecond(200));
        if (authTime != null) builder.claim("auth_time", authTime);

        assertThatThrownBy(() -> service.synchronizeGoogleUser(builder.build()))
                .isInstanceOf(InvalidGoogleIdentityException.class)
                .hasMessageContaining("session was revoked");
        verifyNoInteractions(userRepository);
    }

    @Test
    void freshGoogleLoginAfterRevocationCanCreateAProfile() {
        stubRevocation();
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        User result = service.synchronizeGoogleUser(token().claim("auth_time", 101L).build());
        assertThat(result.getGoogleSubject()).isEqualTo(SUBJECT);
        assertThat(result.getRole()).isEqualTo(UserRole.CLIENT);
    }

    @Test
    void updateProfileTrimsNameAndPhone() {
        User existing = user();
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        User result = service.updateProfile(SUBJECT, new UpdateUserProfileRequest(" Updated Guest ", " +212600000000 "));

        assertThat(result.getDisplayName()).isEqualTo("Updated Guest");
        assertThat(result.getTelephone()).isEqualTo("+212600000000");
    }

    @Test
    void missingUserCannotReadOrUpdateTheirProfileOrId() {
        assertThatThrownBy(() -> service.getByGoogleSubject(SUBJECT)).isInstanceOf(InvalidGoogleIdentityException.class);
        assertThatThrownBy(() -> service.updateProfile(SUBJECT, new UpdateUserProfileRequest("Guest", "123456789")))
                .isInstanceOf(InvalidGoogleIdentityException.class);
        assertThatThrownBy(() -> service.updateIdCard(SUBJECT, new MockMultipartFile("idCard", new byte[] {1})))
                .isInstanceOf(InvalidGoogleIdentityException.class);
        verifyNoInteractions(documentStorageService);
        verify(userRepository, never()).save(any());
    }

    @ParameterizedTest
    @MethodSource("profileCompleteness")
    void profileRequiresBothNonblankNameAndPhone(String name, String phone, boolean complete) {
        User existing = user();
        existing.setDisplayName(name);
        existing.setTelephone(phone);
        assertThat(service.isProfileComplete(existing)).isEqualTo(complete);
        verifyNoInteractions(userRepository);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    void blankIdPathDoesNotCountAsAnUploadedDocument(String path) {
        User existing = user();
        existing.setIdCardUrl(path);
        assertThat(service.hasIdCard(existing)).isFalse();
    }

    @Test
    void storedIdPathCountsAsAnUploadedDocument() {
        User existing = user();
        existing.setIdCardUrl("/uploads/id-cards/existing.pdf");
        assertThat(service.hasIdCard(existing)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {TransactionSynchronization.STATUS_COMMITTED, TransactionSynchronization.STATUS_ROLLED_BACK})
    void idReplacementDeletesOnlyTheSupersededFileAfterTransactionCompletion(int completionStatus) {
        String oldPath = "/uploads/id-cards/old.pdf";
        String newPath = "/uploads/id-cards/new.pdf";
        User existing = user();
        existing.setIdCardUrl(oldPath);
        var upload = new MockMultipartFile("idCard", "identity.pdf", "application/pdf", new byte[] {1});
        when(userRepository.findByGoogleSubjectForUpdate(SUBJECT)).thenReturn(Optional.of(existing));
        when(documentStorageService.store(upload)).thenReturn(newPath);
        when(userRepository.saveAndFlush(existing)).thenReturn(existing);

        // Exercise the transaction callback in memory: no Spring context, database, or disk access.
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertThat(service.updateIdCard(SUBJECT, upload).getIdCardUrl()).isEqualTo(newPath);
            verify(documentStorageService, never()).deleteQuietly(any());
            var callbacks = TransactionSynchronizationManager.getSynchronizations();
            assertThat(callbacks).hasSize(1);
            callbacks.get(0).afterCompletion(completionStatus);

            String deleted = completionStatus == TransactionSynchronization.STATUS_COMMITTED ? oldPath : newPath;
            String retained = completionStatus == TransactionSynchronization.STATUS_COMMITTED ? newPath : oldPath;
            verify(documentStorageService).deleteQuietly(deleted);
            verify(documentStorageService, never()).deleteQuietly(retained);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private Jwt.Builder token() {
        return Jwt.withTokenValue("test-token").header("alg", "HS256").subject(SUBJECT)
                .claim("email", EMAIL).claim("email_verified", true);
    }

    private User user() {
        return User.builder().id(UUID.randomUUID()).googleSubject(SUBJECT).email(EMAIL).role(UserRole.CLIENT).build();
    }

    private void stubRevocation() {
        String fingerprint = AccountIdentityFingerprint.of(SUBJECT);
        when(sessionRevocations.findById(fingerprint))
                .thenReturn(Optional.of(new AccountSessionRevocation(fingerprint, Instant.ofEpochSecond(100))));
    }

    private static Stream<Arguments> revokedAuthTimes() {
        return Stream.of(Arguments.of((Object) null), Arguments.of("101"), Arguments.of(99L), Arguments.of(100L));
    }

    private static Stream<Arguments> profileCompleteness() {
        return Stream.of(Arguments.of(null, "123456789", false), Arguments.of(" ", "123456789", false),
                Arguments.of("Guest", null, false), Arguments.of("Guest", " ", false),
                Arguments.of("Guest", "123456789", true));
    }
}

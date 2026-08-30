package com.keyrak.marketplace.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class BookingDocumentStorageService {

    private static final Logger log = LoggerFactory.getLogger(BookingDocumentStorageService.class);
    private static final long MAX_FILE_SIZE_BYTES = 8L * 1024L * 1024L;
    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.ofEntries(
            Map.entry("application/pdf", ".pdf"),
            Map.entry("image/jpeg", ".jpg"),
            Map.entry("image/png", ".png"),
            Map.entry("image/webp", ".webp"),
            Map.entry("image/gif", ".gif"),
            Map.entry("image/bmp", ".bmp"),
            Map.entry("image/tiff", ".tiff"),
            Map.entry("image/heic", ".heic"),
            Map.entry("image/heif", ".heif")
    );

    private final Path storageDirectory;

    public BookingDocumentStorageService(
            @Value("${app.storage.id-card-directory:./uploads/id-cards}") String storageDirectory
    ) {
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    @PostConstruct
    void initialize() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not initialize ID document storage", exception);
        }
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A government ID image or PDF is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The government ID file must be 8 MB or smaller");
        }

        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = ALLOWED_CONTENT_TYPES.get(contentType);
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Government ID must be an image or PDF file");
        }

        String storedFileName = UUID.randomUUID() + extension;
        Path target = storageDirectory.resolve(storedFileName).normalize();
        if (!target.startsWith(storageDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid government ID file name");
        }

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target);
        } catch (IOException exception) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException cleanupException) {
                exception.addSuppressed(cleanupException);
            }
            log.error("Could not store profile ID document", exception);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "The government ID could not be stored");
        }
        return "/uploads/id-cards/" + storedFileName;
    }

    public void deleteQuietly(String storedUrl) {
        if (storedUrl == null || storedUrl.isBlank()) {
            return;
        }
        try {
            String fileName = Path.of(storedUrl).getFileName().toString();
            Path target = storageDirectory.resolve(fileName).normalize();
            if (target.getParent().equals(storageDirectory)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException | RuntimeException exception) {
            log.warn("Could not remove unused profile ID document", exception);
        }
    }
}

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
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import java.nio.file.LinkOption;

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
        if (!isDocumentPath(storedUrl)) return;
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

    public record StoredDocument(Resource resource, MediaType contentType, String filename) {}

    /** Called only after authorization against the owning profile, never a caller-supplied path. */
    public StoredDocument read(String storedUrl) {
        if (!isDocumentPath(storedUrl)) throw unavailable();
        String filename = storedUrl.substring("/uploads/id-cards/".length());
        Path file = storageDirectory.resolve(filename).normalize();
        String extension = filename.substring(filename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        String contentType = ALLOWED_CONTENT_TYPES.entrySet().stream()
                .filter(entry -> entry.getValue().equals(extension)).map(Map.Entry::getKey).findFirst().orElse(null);
        try {
            if (contentType == null || !file.getParent().equals(storageDirectory)
                    || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS) || !Files.isReadable(file)
                    || !file.toRealPath().getParent().equals(storageDirectory.toRealPath())) throw unavailable();
            return new StoredDocument(new FileSystemResource(file), MediaType.parseMediaType(contentType), "identity-document" + extension);
        } catch (IOException exception) {
            throw unavailable();
        }
    }

    private boolean isDocumentPath(String path) {
        return path != null && path.matches("/uploads/id-cards/[A-Za-z0-9][A-Za-z0-9_-]*\\.[A-Za-z0-9]+$");
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not available");
    }
}

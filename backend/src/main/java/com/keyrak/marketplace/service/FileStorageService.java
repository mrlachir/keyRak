package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
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
public class FileStorageService {

    public static final String PUBLIC_MEDIA_PATH = "/uploads/property-media/";
    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private static final long MAX_IMAGE_SIZE_BYTES = 12L * 1024L * 1024L;
    private static final long MAX_VIDEO_SIZE_BYTES = 100L * 1024L * 1024L;
    private static final Map<String, String> IMAGE_CONTENT_TYPES = Map.ofEntries(
            Map.entry("image/jpeg", ".jpg"),
            Map.entry("image/png", ".png"),
            Map.entry("image/webp", ".webp"),
            Map.entry("image/gif", ".gif"),
            Map.entry("image/avif", ".avif")
    );
    private static final Map<String, String> VIDEO_CONTENT_TYPES = Map.ofEntries(
            Map.entry("video/mp4", ".mp4"),
            Map.entry("video/webm", ".webm"),
            Map.entry("video/quicktime", ".mov"),
            Map.entry("video/x-m4v", ".m4v")
    );

    private final Path storageDirectory;

    public FileStorageService(
            @Value("${app.storage.property-media-directory:./uploads/property-media}") String storageDirectory
    ) {
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    @PostConstruct
    void initialize() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not initialize property media storage", exception);
        }
    }

    public String store(MultipartFile file, PropertyMediaType mediaType) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mediaLabel(mediaType) + " is empty");
        }

        Map<String, String> allowedTypes = mediaType == PropertyMediaType.VIDEO
                ? VIDEO_CONTENT_TYPES
                : IMAGE_CONTENT_TYPES;
        long maximumSize = mediaType == PropertyMediaType.VIDEO
                ? MAX_VIDEO_SIZE_BYTES
                : MAX_IMAGE_SIZE_BYTES;
        if (file.getSize() > maximumSize) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    mediaLabel(mediaType) + " exceeds the " + (maximumSize / 1024 / 1024) + " MB limit"
            );
        }

        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = allowedTypes.get(contentType);
        if (extension == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    mediaType == PropertyMediaType.VIDEO
                            ? "Property video must be MP4, WebM, MOV, or M4V"
                            : "Property images must be JPEG, PNG, WebP, GIF, or AVIF"
            );
        }

        String storedFileName = UUID.randomUUID() + extension;
        Path target = storageDirectory.resolve(storedFileName).normalize();
        if (!target.startsWith(storageDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid property media file name");
        }

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target);
        } catch (IOException exception) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException cleanupException) {
                exception.addSuppressed(cleanupException);
            }
            log.error("Could not store property media file {}", file.getOriginalFilename(), exception);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Property media could not be stored");
        }
        // Persist a portable reference, never a deployment-specific host/origin.
        return PUBLIC_MEDIA_PATH + storedFileName;
    }

    public static boolean isStoredMediaPath(String value) {
        if (value == null || !value.startsWith(PUBLIC_MEDIA_PATH)) return false;
        String fileName = value.substring(PUBLIC_MEDIA_PATH.length());
        return fileName.matches("[A-Za-z0-9][A-Za-z0-9._-]*") && !fileName.contains("..");
    }

    public void deleteQuietly(String storedPath) {
        // Only references created by this storage service are eligible for cleanup.
        // Never infer a local file to delete from an arbitrary external URL.
        if (!isStoredMediaPath(storedPath)) {
            return;
        }
        try {
            String fileName = storedPath.substring(PUBLIC_MEDIA_PATH.length());
            Path target = storageDirectory.resolve(fileName).normalize();
            if (!fileName.isBlank() && target.getParent().equals(storageDirectory)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException | RuntimeException exception) {
            log.warn("Could not remove unused property media {}", storedPath, exception);
        }
    }

    public Path storageDirectory() {
        return storageDirectory;
    }

    private String mediaLabel(PropertyMediaType mediaType) {
        return switch (mediaType) {
            case IMAGE -> "Property image";
            case IMAGE_360 -> "360-degree property image";
            case VIDEO -> "Property video";
        };
    }
}

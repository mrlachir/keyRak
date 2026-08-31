package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FileStorageServiceTest {

    @TempDir
    Path directory;

    private FileStorageService storage;

    @BeforeEach
    void setUp() {
        storage = new FileStorageService(directory.toString());
        storage.initialize();
    }

    @Test
    void storesOnlyRelativePathWithRandomizedFileNameAndCanCleanUp() throws Exception {
        byte[] content = {1, 2, 3, 4};
        String url = storage.store(
                new MockMultipartFile("images", "../../unsafe.png", "image/png", content),
                PropertyMediaType.IMAGE
        );
        assertThat(url).startsWith("/uploads/property-media/").endsWith(".png").doesNotContain("://", "localhost");
        Path storedFile = directory.resolve(url.substring(url.lastIndexOf('/') + 1));
        assertThat(Files.readAllBytes(storedFile)).isEqualTo(content);
        assertThat(storedFile.getFileName().toString()).doesNotContain("unsafe");

        storage.deleteQuietly(url);
        assertThat(Files.exists(storedFile)).isFalse();
    }

    @Test
    void videosAndPanoramasAlsoUseRelativePaths() {
        String video = storage.store(new MockMultipartFile("video", "tour.mp4", "video/mp4", new byte[]{1}), PropertyMediaType.VIDEO);
        String panorama = storage.store(new MockMultipartFile("panorama", "tour.jpg", "image/jpeg", new byte[]{1}), PropertyMediaType.IMAGE_360);
        assertThat(video).startsWith(FileStorageService.PUBLIC_MEDIA_PATH).endsWith(".mp4");
        assertThat(panorama).startsWith(FileStorageService.PUBLIC_MEDIA_PATH).endsWith(".jpg");
        storage.deleteQuietly(video);
        storage.deleteQuietly(panorama);
    }

    @Test
    void cleanupRejectsExternalUrlsTraversalAndOtherUploadDirectories() throws Exception {
        String stored = storage.store(new MockMultipartFile("images", "cover.png", "image/png", new byte[]{1}), PropertyMediaType.IMAGE);
        Path file = directory.resolve(stored.substring(stored.lastIndexOf('/') + 1));
        for (String invalid : new String[]{"https://example.test" + stored, "/uploads/property-media/../cover.png",
                "/uploads/property-media/%2e%2e%2fcover.png", "/uploads/id-cards/private.png",
                "/uploads/property-media/subdirectory/cover.png", "/uploads/property-media/", "//example.test/file.png"}) {
            assertThat(FileStorageService.isStoredMediaPath(invalid)).isFalse();
            storage.deleteQuietly(invalid);
        }
        assertThat(Files.exists(file)).isTrue();
        storage.deleteQuietly(stored);
        assertThat(Files.exists(file)).isFalse();
    }

    @Test
    void rejectsUnsupportedAndEmptyFiles() {
        assertThatThrownBy(() -> storage.store(
                new MockMultipartFile("images", "script.svg", "image/svg+xml", "<svg/>".getBytes()),
                PropertyMediaType.IMAGE
        )).isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThatThrownBy(() -> storage.store(
                new MockMultipartFile("images", new byte[0]), PropertyMediaType.IMAGE
        )).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void enforcesImageAndVideoSizeLimits() {
        MultipartFile largeImage = mock(MultipartFile.class);
        when(largeImage.getSize()).thenReturn(13L * 1024L * 1024L);
        assertThatThrownBy(() -> storage.store(largeImage, PropertyMediaType.IMAGE))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
        MultipartFile largeVideo = mock(MultipartFile.class);
        when(largeVideo.getSize()).thenReturn(101L * 1024L * 1024L);
        assertThatThrownBy(() -> storage.store(largeVideo, PropertyMediaType.VIDEO))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
    }

    @Test
    void removesPartialFileWhenInputStreamFails() throws Exception {
        MultipartFile interruptedFile = mock(MultipartFile.class);
        when(interruptedFile.getContentType()).thenReturn("image/png");
        when(interruptedFile.getSize()).thenReturn(128L);
        when(interruptedFile.getInputStream()).thenReturn(new InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("Simulated interrupted upload");
            }
        });
        assertThatThrownBy(() -> storage.store(interruptedFile, PropertyMediaType.IMAGE))
                .isInstanceOf(ResponseStatusException.class);
        try (var storedFiles = Files.list(directory)) {
            assertThat(storedFiles).isEmpty();
        }
    }
}

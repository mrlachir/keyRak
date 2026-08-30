package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.Tag;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.BookingRepository;
import com.keyrak.marketplace.repository.TagRepository;
import com.keyrak.marketplace.web.dto.CreatePropertyRequest;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import com.keyrak.marketplace.web.dto.TagOptionResponse;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final TagRepository tagRepository;
    private final FileStorageService fileStorageService;
    private final BookingRepository bookingRepository;
    private final JdbcTemplate jdbc;

    public PropertyService(
            PropertyRepository propertyRepository,
            TagRepository tagRepository,
            FileStorageService fileStorageService,
            BookingRepository bookingRepository,
            JdbcTemplate jdbc
    ) {
        this.propertyRepository = propertyRepository;
        this.tagRepository = tagRepository;
        this.fileStorageService = fileStorageService;
        this.bookingRepository = bookingRepository;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> listAdmin() {
        return propertyRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(PropertyResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PropertyResponse getAdmin(UUID id) {
        return PropertyResponse.from(propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found")));
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> featured() {
        return propertyRepository.findFeatured().stream().limit(3).map(PropertyResponse::from).toList();
    }

    @Transactional
    public PropertyResponse setFeatured(UUID id, boolean featured) {
        // The mutex is database-backed: count + update remain atomic with multiple admin/API sessions.
        jdbc.queryForObject("SELECT id FROM catalog_locks WHERE id = 1 FOR UPDATE", Integer.class);
        Property property = propertyRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (featured && !property.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Publish this property before featuring it");
        }
        if (featured && !property.isFeatured() && propertyRepository.countFeatured() >= 3) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only 3 properties can be featured. Unfeature one first.");
        }
        property.setFeatured(featured);
        return PropertyResponse.from(propertyRepository.saveAndFlush(property));
    }

    @Transactional
    public void delete(UUID id) {
        Property property = propertyRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (bookingRepository.existsByPropertyId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This property has reservations and cannot be deleted. Unpublish it in the edit form to preserve trip history.");
        }
        propertyRepository.delete(property);
        propertyRepository.flush();
    }

    @Transactional(readOnly = true)
    public PropertyResponse get(UUID id) {
        return PropertyResponse.from(propertyRepository.findById(id)
                .filter(Property::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found")));
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> search(
            String keyword,
            String location,
            Integer guests,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Integer bedrooms,
            Integer bathrooms,
            List<String> tags,
            LocalDate checkInDate,
            LocalDate checkOutDate
    ) {
        validateDateRange(checkInDate, checkOutDate);
        validatePriceRange(minPrice, maxPrice);
        validateRoomCount("Bedrooms", bedrooms);
        validateRoomCount("Bathrooms", bathrooms);
        List<String> normalizedTags = normalizeTags(tags);
        Specification<Property> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.isTrue(root.get("active")));

            if (keyword != null && !keyword.isBlank()) {
                List<String> keywordTerms = List.of(keyword.trim().toLowerCase(Locale.ROOT).split("\\s+"))
                        .stream()
                        .filter(value -> !value.isBlank())
                        .distinct()
                        .limit(12)
                        .toList();
                for (String keywordTerm : keywordTerms) {
                    String keywordPattern = "%" + keywordTerm + "%";
                    String propertyTypePattern = "%" + keywordTerm.replace('-', '_') + "%";
                    predicates.add(criteriaBuilder.or(
                            criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("title")), keywordPattern),
                            criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("description")), keywordPattern),
                            criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("city")), keywordPattern),
                            criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("address")), keywordPattern),
                            criteriaBuilder.like(
                                    criteriaBuilder.lower(root.get("propertyType").as(String.class)),
                                    propertyTypePattern
                            )
                    ));
                }
            }
            if (location != null && !location.isBlank()) {
                String locationPattern = "%" + location.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("city")), locationPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("address")), locationPattern)
                ));
            }
            if (guests != null && guests > 0) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("maxGuests"), guests));
            }
            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.<BigDecimal>get("pricePerNight"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.<BigDecimal>get("pricePerNight"), maxPrice));
            }
            if (bedrooms != null) {
                predicates.add(criteriaBuilder.equal(root.get("bedrooms"), bedrooms));
            }
            if (bathrooms != null) {
                predicates.add(criteriaBuilder.equal(root.get("bathrooms"), bathrooms));
            }
            if (!normalizedTags.isEmpty()) {
                Join<Property, Tag> tagJoin = root.join("tags", JoinType.INNER);
                predicates.add(criteriaBuilder.lower(tagJoin.<String>get("name")).in(normalizedTags));
                query.distinct(true);
            }
            if (checkInDate != null && checkOutDate != null) {
                Subquery<UUID> conflicts = query.subquery(UUID.class);
                Root<Booking> booking = conflicts.from(Booking.class);
                conflicts.select(booking.get("property").get("id"));
                conflicts.where(
                        criteriaBuilder.equal(booking.get("property").get("id"), root.get("id")),
                        booking.get("status").in(EnumSet.of(BookingStatus.PENDING, BookingStatus.CONFIRMED)),
                        criteriaBuilder.greaterThan(booking.get("checkOutDate"), checkInDate),
                        criteriaBuilder.lessThan(booking.get("checkInDate"), checkOutDate)
                );
                predicates.add(criteriaBuilder.not(criteriaBuilder.exists(conflicts)));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        return propertyRepository.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .limit(100)
                .map(PropertyResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TagOptionResponse> listTags() {
        return tagRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(TagOptionResponse::from)
                .toList();
    }

    private void validateDateRange(LocalDate checkInDate, LocalDate checkOutDate) {
        if ((checkInDate == null) != (checkOutDate == null)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Check-in and check-out must be provided together"
            );
        }
        if (checkInDate != null && !checkOutDate.isAfter(checkInDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-out must be after check-in");
        }
    }

    private void validatePriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice != null && minPrice.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum nightly price cannot be negative");
        }
        if (maxPrice != null && maxPrice.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum nightly price cannot be negative");
        }
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum nightly price cannot be greater than maximum nightly price"
            );
        }
    }

    private void validateRoomCount(String label, Integer value) {
        if (value != null && (value < 0 || value > 100)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    label + " must be between 0 and 100"
            );
        }
    }

    @Transactional
    public PropertyResponse create(
            CreatePropertyRequest request,
            List<MultipartFile> imageFiles,
            List<MultipartFile> panoramaFiles,
            List<MultipartFile> videoFiles
    ) {
        return saveProperty(null, request, imageFiles, panoramaFiles, videoFiles);
    }

    @Transactional
    public PropertyResponse update(UUID id, CreatePropertyRequest request, List<MultipartFile> images,
                                   List<MultipartFile> panoramas, List<MultipartFile> videos) {
        return saveProperty(id, request, images, panoramas, videos);
    }

    private PropertyResponse saveProperty(UUID id, CreatePropertyRequest request, List<MultipartFile> imageFiles,
                                          List<MultipartFile> panoramaFiles, List<MultipartFile> videoFiles) {
        List<MultipartFile> images = nonEmptyFiles(imageFiles);
        List<MultipartFile> panoramas = nonEmptyFiles(panoramaFiles);
        List<MultipartFile> videos = nonEmptyFiles(videoFiles);
        List<CreatePropertyRequest.MediaInput> linkedMedia = request.media() == null
                ? List.of()
                : request.media();
        boolean hasLinkedImage = linkedMedia.stream()
                .anyMatch(input -> input.type() == PropertyMediaType.IMAGE);
        if (images.isEmpty() && !hasLinkedImage) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one standard property image is required");
        }
        long linkedImages = linkedMedia.stream().filter(input -> input.type() == PropertyMediaType.IMAGE).count();
        if (images.size() + linkedImages > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A property can contain up to 20 standard images");
        }
        for (CreatePropertyRequest.MediaInput media : linkedMedia) validateMediaUrl(media.url());
        if (panoramas.size() + linkedMedia.stream().filter(media -> media.type() == PropertyMediaType.IMAGE_360).count() > 10
                || videos.size() + linkedMedia.stream().filter(media -> media.type() == PropertyMediaType.VIDEO).count() > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A property can contain up to 10 panoramas and 10 videos");
        }
        long totalUploadSize = images.stream().mapToLong(MultipartFile::getSize).sum()
                + panoramas.stream().mapToLong(MultipartFile::getSize).sum()
                + videos.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalUploadSize > 150L * 1024L * 1024L) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The combined media upload must be 150 MB or smaller");
        }

        Property property = id == null ? Property.builder().build() : propertyRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        property.setTitle(request.title().trim());
        property.setDescription(request.description().trim());
        property.setPropertyType(request.propertyType());
        property.setAddress(request.address().trim());
        property.setCity(request.city().trim());
        property.setPricePerNight(request.pricePerNight());
        property.setLatitude(request.latitude());
        property.setLongitude(request.longitude());
        property.setMaxGuests(request.maxGuests());
        property.setBedrooms(request.bedrooms());
        property.setBathrooms(request.bathrooms());
        property.setActive(request.active());
        if (!request.active()) property.setFeatured(false);
        new ArrayList<>(property.getTags()).forEach(property::removeTag);
        new ArrayList<>(property.getMedia()).forEach(property::removeMedia);

        Set<String> tagNames = request.tagNames() == null ? Set.of() : request.tagNames();
        for (String rawName : new LinkedHashSet<>(tagNames)) {
            String name = rawName.trim();
            Tag tag = tagRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build()));
            property.addTag(tag);
        }

        for (CreatePropertyRequest.MediaInput input : linkedMedia) {
            property.addMedia(PropertyMedia.builder()
                    .url(input.url().trim())
                    .type(input.type())
                    .displayOrder(input.displayOrder() == null ? 0 : input.displayOrder())
                    .build());
        }

        List<String> storedUrls = new ArrayList<>();
        try {
            int displayOrder = linkedMedia.stream()
                    .map(CreatePropertyRequest.MediaInput::displayOrder)
                    .filter(Objects::nonNull)
                    .max(Integer::compareTo)
                    .orElse(-1) + 1;
            for (MultipartFile image : images) {
                String url = fileStorageService.store(
                        image,
                        PropertyMediaType.IMAGE
                );
                storedUrls.add(url);
                property.addMedia(PropertyMedia.builder()
                        .url(url)
                        .type(PropertyMediaType.IMAGE)
                        .displayOrder(displayOrder++)
                        .build());
            }
            for (MultipartFile panoramaFile : panoramas) {
                String url = fileStorageService.store(
                        panoramaFile,
                        PropertyMediaType.IMAGE_360
                );
                storedUrls.add(url);
                property.addMedia(PropertyMedia.builder()
                        .url(url)
                        .type(PropertyMediaType.IMAGE_360)
                        .displayOrder(displayOrder++)
                        .build());
            }
            for (MultipartFile videoFile : videos) {
                String url = fileStorageService.store(
                        videoFile,
                        PropertyMediaType.VIDEO
                );
                storedUrls.add(url);
                property.addMedia(PropertyMedia.builder()
                        .url(url)
                        .type(PropertyMediaType.VIDEO)
                        .displayOrder(displayOrder++)
                        .build());
            }

            return PropertyResponse.from(propertyRepository.saveAndFlush(property));
        } catch (RuntimeException exception) {
            storedUrls.forEach(fileStorageService::deleteQuietly);
            throw exception;
        }
    }

    private List<MultipartFile> nonEmptyFiles(List<MultipartFile> files) {
        return files == null ? List.of() : files.stream().filter(file -> file != null && !file.isEmpty()).toList();
    }

    private void validateMediaUrl(String value) {
        try {
            URI uri = URI.create(value.trim());
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null) return;
        } catch (IllegalArgumentException ignored) {
            // Return one consistent validation response for malformed or unsafe links.
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Media links must be absolute HTTP or HTTPS URLs without credentials");
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        return tags.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .limit(30)
                .toList();
    }
}

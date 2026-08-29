package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Booking;
import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.Tag;
import com.keyrak.marketplace.domain.enumeration.BookingStatus;
import com.keyrak.marketplace.repository.PropertyRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final TagRepository tagRepository;

    public PropertyService(PropertyRepository propertyRepository, TagRepository tagRepository) {
        this.propertyRepository = propertyRepository;
        this.tagRepository = tagRepository;
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
    public PropertyResponse create(CreatePropertyRequest request) {
        Property property = Property.builder()
                .title(request.title().trim())
                .description(request.description().trim())
                .propertyType(request.propertyType())
                .address(request.address().trim())
                .city(request.city().trim())
                .pricePerNight(request.pricePerNight())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .maxGuests(request.maxGuests())
                .bedrooms(request.bedrooms())
                .bathrooms(request.bathrooms())
                .active(request.active())
                .build();

        Set<String> tagNames = request.tagNames() == null ? Set.of() : request.tagNames();
        for (String rawName : new LinkedHashSet<>(tagNames)) {
            String name = rawName.trim();
            Tag tag = tagRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build()));
            property.addTag(tag);
        }

        for (CreatePropertyRequest.MediaInput input : request.media()) {
            property.addMedia(PropertyMedia.builder()
                    .url(input.url().trim())
                    .type(input.type())
                    .displayOrder(input.displayOrder() == null ? 0 : input.displayOrder())
                    .build());
        }

        return PropertyResponse.from(propertyRepository.saveAndFlush(property));
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

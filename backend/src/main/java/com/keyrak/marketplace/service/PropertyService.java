package com.keyrak.marketplace.service;

import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.Tag;
import com.keyrak.marketplace.repository.PropertyRepository;
import com.keyrak.marketplace.repository.TagRepository;
import com.keyrak.marketplace.web.dto.CreatePropertyRequest;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
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
    public List<PropertyResponse> search(String location, Integer guests, List<String> amenities) {
        List<String> normalizedAmenities = normalizeAmenities(amenities);
        Specification<Property> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.isTrue(root.get("active")));

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
            if (!normalizedAmenities.isEmpty()) {
                Join<Property, Tag> tags = root.join("tags", JoinType.LEFT);
                predicates.add(criteriaBuilder.lower(tags.<String>get("name")).in(normalizedAmenities));
                query.distinct(true);
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        return propertyRepository.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .limit(100)
                .map(PropertyResponse::from)
                .toList();
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

    private List<String> normalizeAmenities(List<String> amenities) {
        if (amenities == null) {
            return List.of();
        }
        return amenities.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .limit(30)
                .toList();
    }
}

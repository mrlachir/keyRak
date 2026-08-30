package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Property;
import com.keyrak.marketplace.domain.entity.PropertyMedia;
import com.keyrak.marketplace.domain.entity.Tag;
import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import com.keyrak.marketplace.domain.enumeration.PropertyType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record PropertyResponse(
        UUID id,
        String title,
        String description,
        PropertyType propertyType,
        String address,
        String city,
        BigDecimal pricePerNight,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer maxGuests,
        Integer bedrooms,
        Integer bathrooms,
        boolean active,
        boolean isFeatured,
        List<MediaResponse> media,
        List<TagResponse> tags,
        Instant createdAt,
        Instant updatedAt
) {
    public static PropertyResponse from(Property property) {
        List<MediaResponse> media = property.getMedia().stream()
                .sorted(Comparator.comparing(PropertyMedia::getDisplayOrder))
                .map(MediaResponse::from)
                .toList();
        List<TagResponse> tags = property.getTags().stream()
                .sorted(Comparator.comparing(Tag::getName, String.CASE_INSENSITIVE_ORDER))
                .map(TagResponse::from)
                .toList();
        return new PropertyResponse(
                property.getId(),
                property.getTitle(),
                property.getDescription(),
                property.getPropertyType(),
                property.getAddress(),
                property.getCity(),
                property.getPricePerNight(),
                property.getLatitude(),
                property.getLongitude(),
                property.getMaxGuests(),
                property.getBedrooms(),
                property.getBathrooms(),
                property.isActive(),
                property.isFeatured(),
                media,
                tags,
                property.getCreatedAt(),
                property.getUpdatedAt()
        );
    }

    public record MediaResponse(
            UUID id,
            String url,
            PropertyMediaType type,
            Integer displayOrder,
            Instant createdAt
    ) {
        private static MediaResponse from(PropertyMedia media) {
            return new MediaResponse(
                    media.getId(),
                    media.getUrl(),
                    media.getType(),
                    media.getDisplayOrder(),
                    media.getCreatedAt()
            );
        }
    }

    public record TagResponse(Integer id, String name, String icon) {
        private static TagResponse from(Tag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getIcon());
        }
    }
}

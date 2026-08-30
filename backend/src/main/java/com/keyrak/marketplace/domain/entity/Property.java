package com.keyrak.marketplace.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.keyrak.marketplace.domain.enumeration.PropertyType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
        name = "properties",
        indexes = {
                @Index(name = "idx_properties_type_active", columnList = "property_type,active"),
                @Index(name = "idx_properties_coordinates", columnList = "latitude,longitude")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false, length = 20)
    private PropertyType propertyType;

    @Column(nullable = false, length = 255)
    private String address;

    @Builder.Default
    @Column(nullable = false, length = 100)
    private String city = "Marrakesh";

    @Column(name = "price_per_night", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerNight;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "max_guests", nullable = false)
    private Integer maxGuests;

    @Column(nullable = false)
    private Integer bedrooms;

    @Column(nullable = false)
    private Integer bathrooms;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(name = "is_featured", nullable = false, columnDefinition = "boolean default false")
    private boolean isFeatured = false;

    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PropertyMedia> media = new ArrayList<>();

    @ToString.Exclude
    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "property_tags",
            joinColumns = @JoinColumn(name = "property_id", nullable = false),
            inverseJoinColumns = @JoinColumn(name = "tag_id", nullable = false)
    )
    private Set<Tag> tags = new LinkedHashSet<>();

    @JsonIgnore
    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "property")
    private List<Booking> bookings = new ArrayList<>();

    @JsonIgnore
    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Review> reviews = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void addMedia(PropertyMedia propertyMedia) {
        media.add(propertyMedia);
        propertyMedia.setProperty(this);
    }

    public void removeMedia(PropertyMedia propertyMedia) {
        media.remove(propertyMedia);
        propertyMedia.setProperty(null);
    }

    public void addTag(Tag tag) {
        tags.add(tag);
        tag.getProperties().add(this);
    }

    public void removeTag(Tag tag) {
        tags.remove(tag);
        tag.getProperties().remove(this);
    }
}

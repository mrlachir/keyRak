package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.PropertyService;
import com.keyrak.marketplace.web.dto.CreatePropertyRequest;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import com.keyrak.marketplace.web.dto.TagOptionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @GetMapping("/{id}")
    public PropertyResponse getProperty(@PathVariable UUID id) {
        return propertyService.get(id);
    }

    @GetMapping("/search")
    public List<PropertyResponse> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer bedrooms,
            @RequestParam(required = false) Integer bathrooms,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<String> amenities,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkInDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOutDate
    ) {
        List<String> requestedTags = new ArrayList<>();
        if (tags != null) {
            requestedTags.addAll(tags);
        }
        if (amenities != null) {
            requestedTags.addAll(amenities);
        }
        return propertyService.search(
                keyword,
                location,
                guests,
                minPrice,
                maxPrice,
                bedrooms,
                bathrooms,
                requestedTags,
                checkInDate,
                checkOutDate
        );
    }

    @GetMapping("/tags")
    public List<TagOptionResponse> listTags() {
        return propertyService.listTags();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public PropertyResponse createProperty(
            @Valid @RequestPart("property") CreatePropertyRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestPart(value = "panorama", required = false) List<MultipartFile> panoramas,
            @RequestPart(value = "video", required = false) List<MultipartFile> videos
    ) {
        return propertyService.create(request, images, panoramas, videos);
    }
}

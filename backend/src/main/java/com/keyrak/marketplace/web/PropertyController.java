package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.PropertyService;
import com.keyrak.marketplace.web.dto.CreatePropertyRequest;
import com.keyrak.marketplace.web.dto.PropertyResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

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
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false) List<String> amenities
    ) {
        return propertyService.search(location, guests, amenities);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public PropertyResponse createProperty(@Valid @RequestBody CreatePropertyRequest request) {
        return propertyService.create(request);
    }
}

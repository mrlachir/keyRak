package com.keyrak.marketplace.web.dto;

import com.keyrak.marketplace.domain.entity.Tag;

public record TagOptionResponse(Integer id, String name, String icon) {

    public static TagOptionResponse from(Tag tag) {
        return new TagOptionResponse(tag.getId(), tag.getName(), tag.getIcon());
    }
}

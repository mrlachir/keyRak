package com.keyrak.marketplace.domain.enumeration;

public enum PropertyMediaType {
    IMAGE("IMAGE"),
    VIDEO("VIDEO"),
    IMAGE_360("360_IMAGE");

    private final String databaseValue;

    PropertyMediaType(String databaseValue) {
        this.databaseValue = databaseValue;
    }

    public String getDatabaseValue() {
        return databaseValue;
    }

    public static PropertyMediaType fromDatabaseValue(String value) {
        for (PropertyMediaType mediaType : values()) {
            if (mediaType.databaseValue.equals(value)) {
                return mediaType;
            }
        }
        throw new IllegalArgumentException("Unsupported property media type: " + value);
    }
}

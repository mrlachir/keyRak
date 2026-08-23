package com.keyrak.marketplace.domain.converter;

import com.keyrak.marketplace.domain.enumeration.PropertyMediaType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class PropertyMediaTypeConverter implements AttributeConverter<PropertyMediaType, String> {

    @Override
    public String convertToDatabaseColumn(PropertyMediaType attribute) {
        return attribute == null ? null : attribute.getDatabaseValue();
    }

    @Override
    public PropertyMediaType convertToEntityAttribute(String databaseValue) {
        return databaseValue == null ? null : PropertyMediaType.fromDatabaseValue(databaseValue);
    }
}

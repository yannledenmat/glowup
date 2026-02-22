package com.glowcommerce.dto;

import com.glowcommerce.model.Category;
import lombok.Data;

@Data
public class CategoryDTO {
    private Long id;
    private String name;
    private String description;

    public static CategoryDTO fromCategory(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        return dto;
    }
}

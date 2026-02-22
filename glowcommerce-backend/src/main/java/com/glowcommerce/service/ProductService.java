package com.glowcommerce.service;

import com.glowcommerce.dto.ProductDTO;
import com.glowcommerce.model.Product;
import com.glowcommerce.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<ProductDTO> getAllProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(ProductDTO::fromProduct)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return ProductDTO.fromProduct(product);
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> searchProducts(String query) {
        return productRepository.searchProducts(query).stream()
                .map(ProductDTO::fromProduct)
                .collect(Collectors.toList());
    }
}

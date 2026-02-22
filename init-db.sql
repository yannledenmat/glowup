-- Script d'initialisation de la base de données GlowCommerce
-- Crée les tables et insère des données de démonstration

-- Extension pour crypto (optionnel)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500)
);

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    enabled BOOLEAN NOT NULL DEFAULT true,
    account_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Index sur users
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email);

-- Table des adresses
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    street_address VARCHAR(200) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_default BOOLEAN DEFAULT false
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT true,
    category_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index sur products
CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_product_category ON products(category_id);
CREATE INDEX idx_product_active ON products(active);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address_id BIGINT REFERENCES addresses(id),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Index sur orders
CREATE INDEX idx_order_customer ON orders(customer_id);
CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_order_date ON orders(created_at);

-- Table des items de commande
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Table d'audit (pour logs de sécurité)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL,
    details TEXT
);

CREATE INDEX idx_audit_username ON audit_logs(username);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Données de démonstration

-- Catégories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Smartphones, laptops, and electronic devices'),
('Fashion', 'Clothing, shoes, and accessories'),
('Home & Kitchen', 'Furniture, appliances, and home decor'),
('Beauty', 'Cosmetics, skincare, and beauty products'),
('Sports', 'Sports equipment and fitness gear');

-- Utilisateur admin (password: Admin123!)
INSERT INTO users (username, email, password, first_name, last_name, role) VALUES
('admin', 'admin@glowcommerce.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5gyg0qPTAp/1e', 'Admin', 'User', 'ADMIN');

-- Utilisateur de test (password: Test123!)
INSERT INTO users (username, email, password, first_name, last_name, role) VALUES
('testuser', 'test@example.com', '$2a$12$7d9vZPrVJL8zHDvK2x5zAO5Tx1QIGW3JNz3bPKLqZ8zXxNDV7GvXS', 'Test', 'User', 'CUSTOMER');

-- Produits
INSERT INTO products (name, description, price, stock_quantity, category_id, image_url) VALUES
('iPhone 15 Pro', 'Latest Apple smartphone with A17 Pro chip', 1199.99, 50, 1, 'https://via.placeholder.com/400x400?text=iPhone+15+Pro'),
('MacBook Pro 16"', 'Powerful laptop with M3 Max chip', 2999.99, 30, 1, 'https://via.placeholder.com/400x400?text=MacBook+Pro'),
('Samsung Galaxy S24', 'Flagship Android smartphone', 999.99, 75, 1, 'https://via.placeholder.com/400x400?text=Galaxy+S24'),
('Designer Jacket', 'Premium leather jacket', 299.99, 20, 2, 'https://via.placeholder.com/400x400?text=Jacket'),
('Running Shoes', 'High-performance running shoes', 149.99, 100, 5, 'https://via.placeholder.com/400x400?text=Shoes'),
('Coffee Maker', 'Automatic espresso machine', 399.99, 40, 3, 'https://via.placeholder.com/400x400?text=Coffee+Maker'),
('Skincare Set', 'Complete skincare routine set', 89.99, 60, 4, 'https://via.placeholder.com/400x400?text=Skincare'),
('Yoga Mat', 'Premium non-slip yoga mat', 49.99, 150, 5, 'https://via.placeholder.com/400x400?text=Yoga+Mat');

COMMIT;

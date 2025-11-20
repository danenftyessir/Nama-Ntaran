-- ============================================================================
-- MIGRATION 005: Add Menu Items and Allocations Tables
-- ============================================================================
-- Created: 2025-11-20
-- Purpose: Add tables required for seeding scripts 02 and 03
-- Dependencies: users, schools, caterings tables must exist
-- ============================================================================

-- ============================================================================
-- 1. MENU ITEMS TABLE
-- ============================================================================
-- Katalog menu makanan dari setiap catering
-- Seeder: 02-seed-menu-items.ts

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'main_course',
        'side_dish',
        'soup',
        'salad',
        'dessert',
        'beverage',
        'snack',
        'complete_meal'
    )),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),

    -- Nutritional Information
    calories INTEGER,
    protein INTEGER, -- grams
    carbohydrates INTEGER, -- grams
    fat INTEGER, -- grams
    fiber INTEGER, -- grams
    vitamins TEXT[], -- array of vitamins (A, B1, C, etc)
    minerals TEXT[], -- array of minerals (Zat Besi, Kalsium, etc)
    allergens TEXT[], -- array of allergens (Kedelai, Kacang, Telur, etc)

    -- Menu Properties
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_halal BOOLEAN DEFAULT true,
    preparation_time INTEGER, -- minutes
    serving_size VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for menu_items
CREATE INDEX idx_menu_items_catering ON menu_items(catering_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_price ON menu_items(price);

-- ============================================================================
-- 2. ALLOCATIONS TABLE
-- ============================================================================
-- Dana yang di-lock untuk pembayaran ke catering
-- Seeder: 03-seed-allocations.ts

CREATE TABLE IF NOT EXISTS allocations (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,
    allocation_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'IDR',

    status VARCHAR(50) NOT NULL CHECK (status IN (
        'PLANNED',
        'LOCKING',
        'LOCKED',
        'RELEASING',
        'RELEASED',
        'ON_HOLD',
        'CANCELLED'
    )),

    -- Blockchain tracking
    tx_hash_lock VARCHAR(255),
    tx_hash_release VARCHAR(255),
    blockchain_confirmed BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    locked_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for allocations
CREATE INDEX idx_allocations_school ON allocations(school_id);
CREATE INDEX idx_allocations_catering ON allocations(catering_id);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_allocations_allocation_id ON allocations(allocation_id);
CREATE INDEX idx_allocations_tx_hash_lock ON allocations(tx_hash_lock);
CREATE INDEX idx_allocations_tx_hash_release ON allocations(tx_hash_release);
CREATE INDEX idx_allocations_locked_at ON allocations(locked_at);
CREATE INDEX idx_allocations_released_at ON allocations(released_at);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE menu_items IS 'Katalog menu makanan dari setiap catering dengan informasi nutrisi lengkap';
COMMENT ON COLUMN menu_items.catering_id IS 'Reference ke catering yang menyediakan menu ini';
COMMENT ON COLUMN menu_items.category IS 'Kategori menu: main_course, side_dish, soup, salad, dessert, beverage, snack, complete_meal';
COMMENT ON COLUMN menu_items.vitamins IS 'Array vitamin yang terkandung (A, B1, B6, C, D, E, K, dll)';
COMMENT ON COLUMN menu_items.minerals IS 'Array mineral yang terkandung (Zat Besi, Kalsium, Zinc, dll)';
COMMENT ON COLUMN menu_items.allergens IS 'Array alergen (Kedelai, Kacang, Telur, Gluten, Susu, Ikan, dll)';

COMMENT ON TABLE allocations IS 'Budget allocation dan locking system untuk pembayaran ke catering';
COMMENT ON COLUMN allocations.allocation_id IS 'Unique allocation ID (SHA256 hash dari schoolId-cateringId-deliveryDate)';
COMMENT ON COLUMN allocations.status IS 'Status: PLANNED, LOCKING, LOCKED, RELEASING, RELEASED, ON_HOLD, CANCELLED';
COMMENT ON COLUMN allocations.tx_hash_lock IS 'Ethereum transaction hash untuk lock operation (0x + 64 hex)';
COMMENT ON COLUMN allocations.tx_hash_release IS 'Ethereum transaction hash untuk release operation (0x + 64 hex)';
COMMENT ON COLUMN allocations.metadata IS 'JSON metadata: {deliveryDate, portions, deliveryId, notes, schoolName, cateringName}';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 005 completed successfully!';
    RAISE NOTICE 'Created tables: menu_items, allocations';
    RAISE NOTICE 'Ready to run seeders: 02-seed-menu-items.ts, 03-seed-allocations.ts';
END $$;

-- Drop tables if exist (untuk development)
DROP TABLE IF EXISTS escrow_transactions CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS caterings CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table (untuk autentikasi)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'school', 'catering')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools Table
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    npsn VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    address TEXT,
    priority_score DECIMAL(5,2) DEFAULT 0,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Caterings Table
CREATE TABLE caterings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    wallet_address VARCHAR(42) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries Table (Jadwal pengiriman)
CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    catering_id INTEGER REFERENCES caterings(id) ON DELETE CASCADE,
    delivery_date DATE NOT NULL,
    portions INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'delivered', 'verified', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escrow Transactions Table (On-chain records)
CREATE TABLE escrow_transactions (
    id SERIAL PRIMARY KEY,
    escrow_id VARCHAR(66) UNIQUE NOT NULL, -- blockchain hash
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE SET NULL,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    catering_id INTEGER REFERENCES caterings(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'failed')),
    tx_hash VARCHAR(66),
    block_number INTEGER,
    locked_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance
CREATE INDEX idx_schools_npsn ON schools(npsn);
CREATE INDEX idx_schools_priority ON schools(priority_score DESC);
CREATE INDEX idx_caterings_wallet ON caterings(wallet_address);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_id ON escrow_transactions(escrow_id);
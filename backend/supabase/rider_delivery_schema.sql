-- Rider delivery schema for the unified Digifix Supabase database.
-- Apply in Supabase SQL editor or convert to a Prisma migration.

CREATE TABLE IF NOT EXISTS rider_delivery_partners (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(50),
    profile_photo_url TEXT,
    bio TEXT,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    push_token TEXT,
    push_platform VARCHAR(20),
    push_token_updated_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rider_refresh_tokens (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES rider_delivery_partners(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rider_delivery_jobs (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES rider_delivery_partners(id) ON DELETE SET NULL,
    marketplace_order_id TEXT REFERENCES "Order"(id) ON DELETE SET NULL,

    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,

    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_contact_name VARCHAR(255),
    pickup_contact_phone VARCHAR(20),

    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10, 8) NOT NULL,
    dropoff_longitude DECIMAL(11, 8) NOT NULL,

    distance_km DECIMAL(6, 2),
    payment_amount DECIMAL(10, 2) NOT NULL,
    items_description TEXT,
    special_instructions TEXT,

    status VARCHAR(30) DEFAULT 'available' CHECK (
        status IN (
            'available',
            'assigned',
            'accepted',
            'arrived_at_pickup',
            'picked_up',
            'in_transit',
            'arrived_at_dropoff',
            'delivered',
            'failed',
            'cancelled'
        )
    ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    accepted_at TIMESTAMP,
    arrived_at_pickup_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    arrived_at_dropoff_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rider_job_status_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES rider_delivery_jobs(id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES rider_delivery_partners(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL,
    reason TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rider_job_tracking (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES rider_delivery_jobs(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES rider_delivery_partners(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rider_proof_of_delivery (
    id SERIAL PRIMARY KEY,
    job_id INTEGER UNIQUE NOT NULL REFERENCES rider_delivery_jobs(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES rider_delivery_partners(id) ON DELETE CASCADE,
    photo_url TEXT,
    signature_data TEXT,
    recipient_name VARCHAR(255),
    notes TEXT,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rider_delivery_request_offers (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES rider_delivery_jobs(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES rider_delivery_partners(id) ON DELETE CASCADE,
    offer_status VARCHAR(20) NOT NULL CHECK (
        offer_status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')
    ),
    distance_to_pickup_km DECIMAL(8, 3),
    offered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    response_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_rider_partners_email ON rider_delivery_partners(email);
CREATE INDEX IF NOT EXISTS idx_rider_partners_status ON rider_delivery_partners(status);
CREATE INDEX IF NOT EXISTS idx_rider_jobs_status ON rider_delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_rider_jobs_partner ON rider_delivery_jobs(partner_id);
CREATE INDEX IF NOT EXISTS idx_rider_jobs_order_number ON rider_delivery_jobs(order_number);
CREATE INDEX IF NOT EXISTS idx_rider_jobs_marketplace_order ON rider_delivery_jobs(marketplace_order_id);
CREATE INDEX IF NOT EXISTS idx_rider_tracking_job ON rider_job_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_rider_tracking_recorded_at ON rider_job_tracking(recorded_at);
CREATE INDEX IF NOT EXISTS idx_rider_refresh_tokens_token ON rider_refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_rider_refresh_tokens_partner ON rider_refresh_tokens(partner_id);
CREATE INDEX IF NOT EXISTS idx_rider_dispatch_offers_job_id ON rider_delivery_request_offers(job_id);
CREATE INDEX IF NOT EXISTS idx_rider_dispatch_offers_partner_id ON rider_delivery_request_offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_rider_dispatch_offers_status ON rider_delivery_request_offers(offer_status, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_dispatch_single_pending_job
    ON rider_delivery_request_offers(job_id)
    WHERE offer_status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_dispatch_single_pending_partner
    ON rider_delivery_request_offers(partner_id)
    WHERE offer_status = 'pending';

CREATE OR REPLACE FUNCTION rider_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rider_delivery_partners_updated_at ON rider_delivery_partners;
CREATE TRIGGER update_rider_delivery_partners_updated_at
    BEFORE UPDATE ON rider_delivery_partners
    FOR EACH ROW EXECUTE FUNCTION rider_update_updated_at_column();

DROP TRIGGER IF EXISTS update_rider_delivery_jobs_updated_at ON rider_delivery_jobs;
CREATE TRIGGER update_rider_delivery_jobs_updated_at
    BEFORE UPDATE ON rider_delivery_jobs
    FOR EACH ROW EXECUTE FUNCTION rider_update_updated_at_column();


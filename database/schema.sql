-- ============================================================
-- ARIPAY DATABASE SCHEMA (PostgreSQL)
-- Versi: 1.0.0
-- ============================================================

SET TIMEZONE = 'Asia/Jakarta';

-- 1. Tabel admin_users (Akun Pengelola & Superadmin)
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'ADMIN' CHECK (role IN ('SUPERADMIN', 'ADMIN', 'FINANCE')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seeder Akun Superadmin Default (Password: AdminAriPay2026!)
INSERT INTO admin_users (username, email, password_hash, role, is_active)
VALUES (
    'admin',
    'admin@aripay.id',
    '$2a$10$wY9dY6O2p5X.uE6sW8b2te2G56uRkeG6B5Q2a5iGqSgT2dDk1bW6m',
    'SUPERADMIN',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- 2. Tabel users (Pelanggan AriPay)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- 3. Tabel products (Etalase Produk Digital)
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    price_cost NUMERIC(15, 2) NOT NULL,
    price_sell NUMERIC(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel transactions (Riwayat Pembelian Pulsa / Data)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    target_number VARCHAR(50) NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    price_cost NUMERIC(15, 2),
    margin NUMERIC(15, 2),
    supplier VARCHAR(50) DEFAULT 'DIGIFLAZZ',
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    sn_token VARCHAR(255),
    supplier_ref_id VARCHAR(100),
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Snapshot columns migration if transactions already exists
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS price_cost NUMERIC(15, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS margin NUMERIC(15, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier VARCHAR(50) DEFAULT 'DIGIFLAZZ';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS inquiry_status VARCHAR(20) DEFAULT 'IDLE';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS inquiry_claim_id VARCHAR(64) DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS last_inquiry_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_response TEXT;

-- 5. Tabel balance_mutations (Buku Kas / Mutasi Saldo Wajib Audit)
CREATE TABLE IF NOT EXISTS balance_mutations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    balance_before NUMERIC(15, 2) NOT NULL,
    balance_after NUMERIC(15, 2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mutations_user ON balance_mutations(user_id);
CREATE INDEX IF NOT EXISTS idx_mutations_ref ON balance_mutations(reference_type, reference_id);

-- Constraint Idempotensi: Partial Unique Index Khusus Transaksi & Refund
CREATE UNIQUE INDEX IF NOT EXISTS uq_mutations_tx_debit 
ON balance_mutations(reference_id) 
WHERE reference_type = 'TRANSACTION';

CREATE UNIQUE INDEX IF NOT EXISTS uq_mutations_tx_refund 
ON balance_mutations(reference_id) 
WHERE reference_type = 'REFUND';

-- 6. Tabel deposits (Top Up Saldo)
CREATE TABLE IF NOT EXISTS deposits (
    id BIGSERIAL PRIMARY KEY,
    deposit_number VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    unique_code INT DEFAULT 0,
    total_payment NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK (status IN ('PENDING', 'SUCCESS', 'EXPIRED', 'REJECTED')),
    approved_by BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel withdrawals (Penarikan Saldo)
CREATE TABLE IF NOT EXISTS withdrawals (
    id BIGSERIAL PRIMARY KEY,
    withdrawal_number VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    fee NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'REJECTED')),
    rejection_reason TEXT,
    approved_by BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Seeder Contoh Data Permohonan Penarikan (Withdrawals)
INSERT INTO withdrawals (withdrawal_number, user_id, amount, bank_name, account_number, account_holder_name, fee, status, rejection_reason, approved_by, created_at, updated_at)
VALUES 
    ('WD-20260909-001', 1, 50000.00, 'BCA', '8271928371', 'Budi Santoso', 0.00, 'PENDING', NULL, NULL, '2026-09-09 11:50:00+07', '2026-09-09 11:50:00+07'),
    ('WD-20260909-002', 4, 100000.00, 'Mandiri', '1370019283741', 'Dewi Lestari', 0.00, 'PENDING', NULL, NULL, '2026-09-09 13:40:00+07', '2026-09-09 13:40:00+07'),
    ('WD-20260908-005', 2, 100000.00, 'BRI', '028192817291', 'Siti Rahmawati', 0.00, 'SUCCESS', NULL, 1, '2026-09-08 16:20:00+07', '2026-09-08 16:25:12+07'),
    ('WD-20260908-003', 5, 50000.00, 'DANA', '087812349876', 'Rian Pratama', 0.00, 'SUCCESS', NULL, 1, '2026-09-08 10:15:00+07', '2026-09-08 10:18:40+07'),
    ('WD-20260907-002', 3, 75000.00, 'BNI', '0918273645', 'Ahmad Fauzi', 0.00, 'REJECTED', 'Nama pemilik rekening bank tidak cocok dengan data verifikasi identitas akun AriPay.', 1, '2026-09-07 14:10:00+07', '2026-09-07 14:30:15+07'),
    ('WD-20260906-001', 1, 25000.00, 'BCA', '8271928371', 'Budi Santoso', 0.00, 'SUCCESS', NULL, 1, '2026-09-06 09:30:00+07', '2026-09-06 09:34:20+07')
ON CONFLICT (withdrawal_number) DO NOTHING;


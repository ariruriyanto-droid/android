const { Pool } = require('pg');
require('dotenv').config();

// Konfigurasi koneksi ke database PostgreSQL AriPay
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'aripay_db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 20, // Kapasitas antrean koneksi bersamaan
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Tes koneksi database saat pertama kali diakses
pool.on('connect', () => {
  console.log('✅ Terhubung ke database PostgreSQL AriPay');
});

pool.on('error', (err) => {
  console.error('❌ Terjadi kesalahan pada pool PostgreSQL:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

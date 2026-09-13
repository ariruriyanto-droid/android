const express = require('express');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const adminRoutes = require('./routes/adminRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware untuk membaca format JSON dari request body dan menyimpan raw buffer untuk validasi HMAC
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// Jalur tes kesehatan server
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend AriPay berjalan dengan baik!',
    timestamp: new Date().toISOString(),
  });
});

// Daftarkan modul rute
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/webhook', webhookRoutes);

// Penanganan rute yang tidak ditemukan (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute '${req.originalUrl}' tidak ditemukan pada server AriPay.`,
  });
});

// Penanganan error global
app.use((err, req, res, next) => {
  console.error('Terjadi error tak terduga:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🚀 Server Backend AriPay berhasil aktif!`);
  console.log(`📡 Berjalan di alamat: http://localhost:${PORT}`);
  console.log(`===========================================`);
});

module.exports = app;

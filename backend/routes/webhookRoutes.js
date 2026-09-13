const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 1. Webhook Publik Server-to-Server (Bebas JWT, dilindungi HMAC Signature)
router.post('/digiflazz', webhookController.handleDigiflazzWebhook);
router.post('/payment', webhookController.handlePaymentWebhook);

// 2. Endpoint Khusus Admin untuk Menguji Simulasi Callback
router.post('/simulate', verifyToken, requireRole('ADMIN'), webhookController.simulateWebhook);

module.exports = router;

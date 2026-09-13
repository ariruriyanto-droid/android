const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Seluruh rute transaksi pelanggan memerlukan autentikasi
router.use(verifyToken);

router.post('/create', transactionController.createTransaction);
router.get('/my', transactionController.getMyTransactions);
router.get('/:invoiceNumber', transactionController.getTransactionDetail);
router.post('/:invoiceNumber/inquiry', transactionController.inquiryTransaction);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 1. Jalur Publik: Login Admin
router.post('/login', adminController.adminLogin);

// 2. Jalur Terproteksi: Wajib Token dengan role 'ADMIN'
router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsersList);
router.patch('/users/:userId/status', adminController.toggleUserStatus);
router.post('/adjust-balance', adminController.manualBalanceAdjustment);
router.get('/transactions', adminController.getAllTransactions);
router.get('/withdrawals', adminController.getWithdrawalsList);
router.get('/withdrawals/summary', adminController.getBalanceSummary);
router.post('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.post('/withdrawals/:id/reject', adminController.rejectWithdrawal);
router.get('/reports', adminController.getFinancialReports);
router.get('/settings', adminController.getSystemSettings);
router.post('/settings/change-password', adminController.changeAdminPassword);
router.post('/settings/parameters', adminController.updateSystemParameters);
router.get('/settings/health', adminController.getSystemHealth);

// LANGKAH 6.9: Manajemen Deposit & Top-Up Saldo Pelanggan serta Buku Kas Mutasi
router.get('/deposits', adminController.getDepositsList);
router.get('/deposits/summary', adminController.getDepositsSummary);
router.post('/deposits/:id/approve', adminController.approveDeposit);
router.post('/deposits/:id/reject', adminController.rejectDeposit);
router.get('/mutations', adminController.getBalanceMutationsList);

// LANGKAH 6.10: Manajemen Produk & Kontrol Margin Harga Etalase
router.get('/products', adminController.getProductsList);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.patch('/products/:id/status', adminController.toggleProductStatus);

module.exports = router;

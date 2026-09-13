const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 1. Jalur Publik (Bisa diakses siapa saja)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// 2. Jalur Terproteksi Pengguna (Wajib membawa Token JWT yang valid)
router.get('/me', verifyToken, authController.getMyProfile);

// 3. Jalur Khusus Admin (Hanya akun dengan role 'ADMIN' yang bisa mengakses)
router.get('/admin/users', verifyToken, requireRole('ADMIN'), authController.getAllUsersForAdmin);

module.exports = router;

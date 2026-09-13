const jwt = require('jsonwebtoken');

// Kunci rahasia JWT (diambil dari .env)
const JWT_SECRET = process.env.JWT_SECRET || 'aripay_super_secret_jwt_key_2026';

/**
 * Middleware untuk memverifikasi apakah request membawa token JWT yang valid.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token autentikasi tidak ditemukan atau format salah.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Simpan data user yang login ke dalam req.user
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Sesi kedaluwarsa atau token tidak valid. Silakan login kembali.',
    });
  }
}

/**
 * Middleware untuk memastikan hanya role tertentu (misal: ADMIN) yang dapat mengakses route.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki wewenang untuk tindakan ini.',
      });
    }
    next();
  };
}

/**
 * Middleware untuk memastikan pengguna hanya bisa mengakses data miliknya sendiri,
 * kecuali jika dia adalah ADMIN.
 */
function checkUserOwnership(req, res, next) {
  const requestedUserId = parseInt(req.params.userId || req.body.userId, 10);
  
  if (req.user.role !== 'ADMIN' && req.user.id !== requestedUserId) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Anda hanya diperbolehkan mengakses data akun Anda sendiri.',
    });
  }
  next();
}

module.exports = {
  verifyToken,
  requireRole,
  checkUserOwnership,
  JWT_SECRET,
};

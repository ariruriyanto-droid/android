const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

/**
 * 1. REGISTER PENGGUNA BARU
 */
async function register(req, res) {
  try {
    const { full_name, phone_number, password, confirm_password } = req.body;

    // A. Validasi: Semua field wajib diisi
    if (!full_name || !phone_number || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Semua kolom (Nama, Nomor HP, Password, Konfirmasi Password) wajib diisi.',
      });
    }

    // B. Bersihkan dan format nomor HP (hanya angka)
    const cleanedPhone = phone_number.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP tidak valid. Masukkan nomor HP aktif antara 10 hingga 15 digit angka.',
      });
    }

    // C. Validasi kekuatan password (minimal 8 karakter, ada huruf dan angka)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password terlalu pendek. Minimal harus 8 karakter demi keamanan akun Anda.',
      });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password harus mengandung kombinasi huruf dan angka.',
      });
    }

    // D. Validasi kecocokan konfirmasi password
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Konfirmasi password tidak cocok dengan password yang dimasukkan.',
      });
    }

    // E. Cek apakah nomor HP sudah terdaftar
    const existingUser = await db.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [cleanedPhone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Nomor HP ini sudah terdaftar di AriPay. Silakan gunakan nomor lain atau login.',
      });
    }

    // F. HASHING PASSWORD (Tidak pernah menyimpan teks asli ke database)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // G. Simpan user baru ke database PostgreSQL
    const insertQuery = `
      INSERT INTO users (full_name, phone_number, password_hash, role, is_active, balance)
      VALUES ($1, $2, $3, 'USER', TRUE, 0.00)
      RETURNING id, full_name, phone_number, role, is_active, balance, created_at;
    `;
    const result = await db.query(insertQuery, [
      full_name.trim(),
      cleanedPhone,
      passwordHash,
    ]);

    const newUser = result.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda siap digunakan.',
      data: {
        id: newUser.id,
        full_name: newUser.full_name,
        phone_number: newUser.phone_number,
        role: newUser.role,
        is_active: newUser.is_active,
        balance: parseFloat(newUser.balance),
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error saat register:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat mendaftarkan akun.',
      error: error.message,
    });
  }
}

/**
 * 2. LOGIN PENGGUNA (NOMOR HP & PASSWORD)
 */
async function login(req, res) {
  try {
    const { phone_number, password } = req.body;

    // Validasi field
    if (!phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP dan Password wajib diisi.',
      });
    }

    const cleanedPhone = phone_number.replace(/[^0-9]/g, '');

    // Ambil data user dari database
    const userQuery = await db.query(
      'SELECT id, full_name, phone_number, password_hash, role, is_active, balance FROM users WHERE phone_number = $1',
      [cleanedPhone]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Nomor HP atau password yang Anda masukkan salah.',
      });
    }

    const user = userQuery.rows[0];

    // Cek status keaktifan akun
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan. Silakan hubungi layanan pelanggan AriPay.',
      });
    }

    // Bandingkan password yang diinput dengan hash yang tersimpan
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Nomor HP atau password yang Anda masukkan salah.',
      });
    }

    // Buat JWT Token aman yang berlaku selama 7 hari
    const tokenPayload = {
      id: user.id,
      phone_number: user.phone_number,
      full_name: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      message: 'Login berhasil! Selamat datang di AriPay.',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          phone_number: user.phone_number,
          role: user.role,
          balance: parseFloat(user.balance),
        },
      },
    });
  } catch (error) {
    console.error('Error saat login:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat memproses login.',
      error: error.message,
    });
  }
}

/**
 * 3. LOGOUT PENGGUNA
 */
function logout(req, res) {
  // Dalam sistem JWT (stateless), klien cukup menghapus token dari penyimpanan lokal
  return res.status(200).json({
    success: true,
    message: 'Logout berhasil. Sesi Anda telah diakhiri dengan aman.',
  });
}

/**
 * 4. AMBIL PROFIL PRIBADI USER (Hanya data miliknya sendiri)
 */
async function getMyProfile(req, res) {
  try {
    const userId = req.user.id;
    const userQuery = await db.query(
      'SELECT id, full_name, phone_number, role, is_active, balance, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data pengguna tidak ditemukan.',
      });
    }

    const user = userQuery.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        is_active: user.is_active,
        balance: parseFloat(user.balance),
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data profil.',
      error: error.message,
    });
  }
}

/**
 * 5. KHUSUS ADMIN: LIHAT DAFTAR SEMUA PENGGUNA
 */
async function getAllUsersForAdmin(req, res) {
  try {
    const query = await db.query(
      'SELECT id, full_name, phone_number, role, is_active, balance, created_at FROM users ORDER BY id DESC'
    );
    return res.status(200).json({
      success: true,
      total: query.rows.length,
      data: query.rows.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        phone_number: u.phone_number,
        role: u.role,
        is_active: u.is_active,
        balance: parseFloat(u.balance),
        created_at: u.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pengguna untuk admin.',
      error: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMyProfile,
  getAllUsersForAdmin,
};

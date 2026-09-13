import React, { useState } from 'react';
import { loginAdmin } from '../../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username_or_email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const inputUser = formData.username_or_email.trim();
    const inputPass = formData.password;

    // 1. Validasi Sisi Klien
    if (!inputUser) {
      setErrorMessage('Username atau email admin wajib diisi.');
      return;
    }
    if (inputUser.length < 3) {
      setErrorMessage('Username/email minimal 3 karakter.');
      return;
    }
    if (!inputPass) {
      setErrorMessage('Password admin wajib diisi.');
      return;
    }
    if (inputPass.length < 6) {
      setErrorMessage('Password admin minimal 6 karakter.');
      return;
    }

    // 2. Kirim Request ke Backend
    setIsLoading(true);
    try {
      const response = await loginAdmin(inputUser, inputPass);
      if (onLoginSuccess) {
        onLoginSuccess(response.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setFormData({
      username_or_email: 'admin',
      password: 'AdminAriPay2026!',
    });
    setErrorMessage('');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        {/* Header Identitas AriPay */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '14px', margin: '0 auto 12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 6px 0' }}>
            AriPay Admin Panel
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            Masuk untuk mengelola sistem, pengguna, dan transaksi.
          </p>
        </div>

        {/* Pesan Error */}
        {errorMessage && (
          <div style={{ marginBottom: '20px', padding: '12px 14px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', color: '#fda4af', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>⚠️</span>
            <span style={{ flex: 1 }}>{errorMessage}</span>
          </div>
        )}

        {/* Formulir Login */}
        <form onSubmit={handleSubmit}>
          {/* Input Username/Email */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Username atau Email Admin
            </label>
            <input
              type="text"
              name="username_or_email"
              value={formData.username_or_email}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="admin atau admin@aripay.id"
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
            />
          </div>

          {/* Input Password */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Password Admin
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="••••••••••••"
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', padding: '10px 42px 10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', padding: '4px' }}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{ width: '100%', backgroundColor: isLoading ? '#1d4ed8' : '#2563eb', color: '#ffffff', fontWeight: 600, padding: '12px', borderRadius: '10px', border: 'none', fontSize: '14px', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk ke Admin Panel'}
          </button>
        </form>

        {/* Bantuan Akun Default */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e293b', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          <span>Kredensial Bawaan Database: </span>
          <button
            type="button"
            onClick={handleFillDemo}
            style={{ background: 'none', border: 'none', color: '#60a5fa', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '12px', fontWeight: 600 }}
          >
            admin / AdminAriPay2026!
          </button>
        </div>
      </div>
    </div>
  );
}

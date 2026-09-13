import React, { useState, useEffect } from 'react';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import { getStoredAdminToken, getStoredAdminUser } from './services/api';

export default function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const token = getStoredAdminToken();
    const user = getStoredAdminUser();
    if (token && user) {
      setAdminUser(user);
    }
    setIsCheckingAuth(false);
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-sm">
        Memuat sesi admin AriPay...
      </div>
    );
  }

  if (!adminUser) {
    return <LoginPage onLoginSuccess={(user) => setAdminUser(user)} />;
  }

  return (
    <DashboardPage
      adminUser={adminUser}
      onLogout={() => setAdminUser(null)}
    />
  );
}

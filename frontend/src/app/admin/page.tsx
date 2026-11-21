"use client";

import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { useApp } from "@/context/AppContext";

export default function AdminPage() {
  const {
    socket,
    isAdminLoggedIn,
    handleAdminLogin,
    handleAdminLogout,
    handleAdminSessionExpired,
    showNotification,
  } = useApp();

  if (!isAdminLoggedIn) {
    return (
      <AdminLogin
        socket={socket}
        onLoginSuccess={handleAdminLogin}
        onShowNotification={showNotification}
      />
    );
  }

  return (
    <AdminDashboard
      socket={socket}
      onShowNotification={showNotification}
      onLogout={handleAdminLogout}
      onSessionExpired={handleAdminSessionExpired}
    />
  );
}

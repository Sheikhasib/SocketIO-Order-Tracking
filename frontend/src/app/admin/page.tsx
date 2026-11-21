"use client";

import AdminLogin from "@/components/admin/AdminLogin";
import { useApp } from "@/context/AppContext";

export default function AdminPage() {
  const {
    socket,
    isAdminLoggedIn,
    handleAdminLogin,
    handleAdminLogout,
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

  // সাময়িক: পরের ধাপে এখানে AdminDashboard বসবে
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Admin Dashboard (coming next)</h1>
      <button
        onClick={handleAdminLogout}
        className="mt-4 rounded bg-red-500 px-4 py-2 text-white"
      >
        Logout
      </button>
    </main>
  );
}

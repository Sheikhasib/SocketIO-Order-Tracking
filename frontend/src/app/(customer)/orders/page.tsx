"use client";

import OrderHistory from "@/components/customer/OrderHistory";
import { useApp } from "@/context/AppContext";

export default function OrdersPage() {
  const { socket, showNotification } = useApp();

  return <OrderHistory socket={socket} onShowNotification={showNotification} />;
}

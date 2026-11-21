"use client";

import OrderTracking from "@/components/customer/OrderTracking";
import { useApp } from "@/context/AppContext";

export default function TrackPage() {
  const { socket, showNotification } = useApp();

  return (
    <OrderTracking socket={socket} onShowNotification={showNotification} />
  );
}

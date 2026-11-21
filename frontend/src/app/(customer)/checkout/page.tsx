"use client";

import OrderForm from "@/components/customer/OrderForm";
import { useApp } from "@/context/AppContext";

export default function CheckoutPage() {
  const { cart, socket, showNotification } = useApp();

  return (
    <OrderForm
      cart={cart}
      socket={socket}
      onShowNotification={showNotification}
    />
  );
}

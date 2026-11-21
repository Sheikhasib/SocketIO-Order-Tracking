"use client";

import Cart from "@/components/customer/Cart";
import { useApp } from "@/context/AppContext";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart } = useApp();

  return (
    <Cart
      cart={cart}
      onUpdateQuantity={updateQuantity}
      onRemoveItem={removeFromCart}
      onClearCart={clearCart}
    />
  );
}

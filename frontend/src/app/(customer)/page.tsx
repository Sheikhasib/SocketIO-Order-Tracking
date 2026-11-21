"use client";

import Menu from "@/components/customer/Menu";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { addToCart } = useApp();
  return <Menu onAddToCart={addToCart} />;
}

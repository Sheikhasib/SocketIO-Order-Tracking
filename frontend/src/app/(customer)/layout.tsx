"use client";

import type { ReactNode } from "react";
import Header from "@/components/common/Header";
import { useApp } from "@/context/AppContext";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { cart, connected } = useApp();

  return (
    <>
      <Header cartCount={cart.length} connected={connected} />
      {children}
    </>
  );
}

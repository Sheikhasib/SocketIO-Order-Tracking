import type { ReactNode } from "react";
import Header from "@/components/common/Header";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

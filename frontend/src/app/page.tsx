"use client";

import Header from "@/components/common/Header";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { connected, showNotification } = useApp();

  return (
    <>
      <Header />
      <main className="p-8">
        <p>Socket: {connected ? "connected" : "disconnected"}</p>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
          onClick={() => showNotification("Hello from Next.js!", "success")}
        >
          Test notification
        </button>
      </main>
    </>
  );
}

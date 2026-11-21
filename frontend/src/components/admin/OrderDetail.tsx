"use client";

import type { Socket } from "socket.io-client";
import type { NotificationType, Order } from "@/types";

interface Props {
  order: Order;
  onClose: () => void;
  socket: Socket | null;
  onShowNotification: (message: string, type?: NotificationType) => void;
}

// সাময়িক: পরের ধাপে আসল OrderDetail বসবে
export default function OrderDetail({ order, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-xl bg-white p-6">
        <p className="font-bold">{order.orderId}</p>
        <button
          onClick={onClose}
          className="mt-4 rounded bg-slate-800 px-4 py-2 text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

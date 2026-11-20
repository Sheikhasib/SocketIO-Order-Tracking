"use client";

import { useEffect } from "react";
import type { NotificationType } from "@/types";

interface Props {
  message: string;
  type?: NotificationType;
  onClose: () => void;
}

const bgColors: Record<NotificationType, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  warning: "bg-yellow-500",
};

const icons: Record<NotificationType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
};

export default function Notification({
  message,
  type = "success",
  onClose,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div
      className={`fixed top-20 right-4 z-50 ${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-2xl max-w-md`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 font-bold text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

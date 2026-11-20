"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { socket } from "@/lib/socket";
import Notification from "@/components/common/Notification";
import type { CartItem, MenuItem, NotificationType } from "@/types";

interface AppContextValue {
  connected: boolean;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  clearCartSilently: () => void;
  isAdminLoggedIn: boolean;
  adminLoginSuccess: () => void;
  adminLogout: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);

  // Socket connection (একবারই)
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.connect();
    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  // localStorage থেকে cart ও admin অবস্থা লোড
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) setCart(JSON.parse(saved));
      if (localStorage.getItem("isAdmin") === "true") setIsAdminLoggedIn(true);
    } catch (error) {
      console.error("Failed to load saved data:", error);
    }
    setHydrated(true);
  }, []);

  // লোড হওয়ার পরেই শুধু cart সেভ হবে (নাহলে সেভ করা cart মুছে যেত)
  useEffect(() => {
    if (hydrated) localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  const showNotification = useCallback(
    (message: string, type: NotificationType = "success") => {
      setNotification({ message, type });
    },
    [],
  );

  const closeNotification = useCallback(() => setNotification(null), []);

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
      showNotification(`Added another ${item.name} to cart`, "success");
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
      showNotification(`${item.name} added to cart`, "success");
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
    showNotification("Item removed from cart", "info");
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(
      cart.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setCart([]);
      showNotification("Cart cleared", "info");
    }
  };

  // order সফল হলে confirm ছাড়াই cart খালি করার জন্য
  const clearCartSilently = () => setCart([]);

  const adminLoginSuccess = () => setIsAdminLoggedIn(true);

  const adminLogout = () => {
    localStorage.removeItem("isAdmin");
    setIsAdminLoggedIn(false);
    showNotification("Logged out successfully", "success");
  };

  return (
    <AppContext.Provider
      value={{
        connected,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        clearCartSilently,
        isAdminLoggedIn,
        adminLoginSuccess,
        adminLogout,
        showNotification,
      }}
    >
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

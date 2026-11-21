"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { useSocket } from "@/hooks/useSocket";
import Notification from "@/components/common/Notification";
import type { CartItem, MenuItem, NotificationType } from "@/types";

interface AppContextValue {
  socket: Socket | null;
  connected: boolean;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  isAdminLoggedIn: boolean;
  handleAdminLogin: () => void;
  handleAdminLogout: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
  handleAdminSessionExpired: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// AppProvider component to wrap the application and provide context values
export function AppProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useSocket();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);

  // Admin login state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Load cart & admin status from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        // Parse and set the cart state from localStorage
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error("Failed to load cart:", error);
      }
    }

    // Check admin login status from localStorage
    const adminStatus = localStorage.getItem("isAdmin");
    if (adminStatus === "true") {
      setIsAdminLoggedIn(true);
    }
    // Mark the component as hydrated after loading from localStorage
    setHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes (লোড হওয়ার পরে)
  useEffect(() => {
    if (hydrated) localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  // Show notification helper
  const showNotification = useCallback(
    (message: string, type: NotificationType = "success") => {
      setNotification({ message, type });
    },
    [],
  );

  // Close notification helper
  const closeNotification = useCallback(() => setNotification(null), []);

  // Cart functions
  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);

    // If the item already exists in the cart, increase its quantity; otherwise, add it as a new item
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        ),
      );
      // Show notification for adding another item to the cart
      showNotification(`Added another ${item.name} to cart`, "success");
    } else {
      // If the item is not in the cart, add it with an initial quantity of 1
      setCart([...cart, { ...item, quantity: 1 }]);
      // Show notification for adding a new item to the cart
      showNotification(`${item.name} added to cart`, "success");
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
    showNotification("Item removed from cart", "info");
  };

  // Update item quantity in cart
  const updateQuantity = (itemId: string, newQuantity: number) => {
    // If the new quantity is less than or equal to 0, remove the item from the cart
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    // Update the quantity of the specified item in the cart
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  // Clear the entire cart with confirmation
  const clearCart = () => {
    // Prompt the user for confirmation before clearing the cart
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setCart([]);
      showNotification("Cart cleared", "info");
    }
  };

  // Admin functions
  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
  };

  // Admin logout function
  const handleAdminLogout = () => {
    localStorage.removeItem("isAdmin");
    setIsAdminLoggedIn(false);
    showNotification("Logged out successfully", "success");
  };

  // Dashboard-এ "Unauthorized" পেলে (refresh-এর পর নতুন socket admin থাকে না)
  const handleAdminSessionExpired = () => {
    localStorage.removeItem("isAdmin");
    setIsAdminLoggedIn(false);
    showNotification("Session expired. Please login again", "warning");
  };

  // Persist admin login status in localStorage whenever it changes
  return (
    <AppContext.Provider
      value={{
        socket,
        connected,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isAdminLoggedIn,
        handleAdminLogin,
        handleAdminLogout,
        handleAdminSessionExpired,
        showNotification,
      }}
    >
      <div className="min-h-screen text-slate-800">
        {/* Notification */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={closeNotification}
          />
        )}
        {children}
      </div>
    </AppContext.Provider>
  );
}

// Custom hook to use the AppContext
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

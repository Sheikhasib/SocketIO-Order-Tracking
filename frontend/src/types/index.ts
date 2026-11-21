export type NotificationType = "success" | "error" | "info" | "warning";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  specialInstructions?: string;
}

export interface StatusHistoryEntry {
  id: number;
  status: string;
  by: string;
  note: string;
  timestamp: string;
}

export interface Order {
  id: number;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  totalAmount: number;
  specialNotes: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  estimatedTime: number | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
}

export interface LiveStats {
  totalToday: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
}

export interface PlaceOrderResponse {
  success: boolean;
  message?: string;
  order?: Order;
}

export type OrderResponse = PlaceOrderResponse;

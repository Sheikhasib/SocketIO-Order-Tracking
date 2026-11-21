import type { Prisma } from "../generated/prisma/client.js";
import { OrderInput, OrderItem, Totals } from "../Interfaces/index.js";

// This function generates a unique order ID based on the current date and a random number. The format of the order ID is "ORD-YYYYMMDD-RANDOM", where "YYYY" is the year, "MM" is the month, "DD" is the day, and "RANDOM" is a three-digit random number. This ensures that each order has a unique identifier that can be easily traced back to the date it was created.
export function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${year}${month}${day}-${random}`;
}

// This function validates the order data received from the client. It checks for required fields and ensures that the items array is not empty and that each item has valid values.
export function validateOrderData(data: OrderInput): {
  valid: boolean;
  message?: string;
} {
  if (!data.customerName?.trim())
    return { valid: false, message: "Customer name is required" };
  if (!data.customerPhone?.trim())
    return { valid: false, message: "Phone number is required" };
  if (!data.customerAddress?.trim())
    return { valid: false, message: "Delivery address is required" };
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { valid: false, message: "Order must have at least one item" };
  }

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!item.name || !item.quantity || !item.price) {
      return { valid: false, message: `Item ${i + 1} is incomplete` };
    }
    if (item.quantity <= 0 || item.price <= 0) {
      return { valid: false, message: `Item ${i + 1} has invalid values` };
    }
  }

  return { valid: true };
}

// This function calculates the totals for an order based on the items provided. It computes the subtotal, tax, delivery fee, and total amount.
export function calculateTotals(items: OrderItem[]): Totals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.1;
  const deliveryFee = 5.0;
  const total = subtotal + tax + deliveryFee;

  // Round the values to two decimal places for better readability and consistency
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    deliveryFee,
    totalAmount: Math.round(total * 100) / 100,
  };
}

// This function checks if a status transition is valid based on the current status and the new status. It uses a predefined set of valid transitions to determine if the change is allowed.
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  // Check if the current status exists in the valid transitions and if the new status is included in the allowed transitions for that current status. If not, return false.
  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

// This function creates a new order document that can be inserted into the database. It takes the order data, a generated order ID, and the calculated totals as input, and returns an object that conforms to the Prisma OrderCreateInput type. It also initializes the status history with an entry indicating that the order has been placed.
export function createOrderDocument(
  orderData: OrderInput,
  orderId: string,
  totals: Totals,
): Prisma.OrderCreateInput {
  // Ensure that the items are stored as a JSON array in the database. The items are cast to Prisma.InputJsonValue to match the expected type for JSON fields in Prisma. This allows for flexible storage of order items while maintaining type safety.
  return {
    orderId,
    customerName: (orderData.customerName ?? "").trim(),
    customerPhone: (orderData.customerPhone ?? "").trim(),
    customerAddress: (orderData.customerAddress ?? "").trim(),
    items: (orderData.items ?? []) as unknown as Prisma.InputJsonValue,
    subtotal: totals.subtotal,
    tax: totals.tax,
    deliveryFee: totals.deliveryFee,
    totalAmount: totals.totalAmount,
    specialNotes: orderData.specialNotes || "",
    paymentMethod: orderData.paymentMethod || "cash",
    paymentStatus: "pending",
    status: "pending",
    statusHistory: {
      create: [{ status: "pending", by: "customer", note: "Order placed" }],
    },
  };
}

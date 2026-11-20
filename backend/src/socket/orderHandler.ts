import type { Server, Socket } from "socket.io";
import { prisma } from "../config/database.js";
import {
  generateOrderId,
  validateOrderData,
  calculateTotals,
  isValidStatusTransition,
  createOrderDocument,
} from "../utils/helper.js";
import { OrderInput } from "../Interfaces/index.js";

type Callback = (res: Record<string, unknown>) => void;

const withHistory = { statusHistory: true } as const;

export const orderHandler = (io: Server, socket: Socket): void => {
  console.log(`👤 User connected: ${socket.id}`);

  // ===== CUSTOMER EVENTS =====

  // emit => trigger => on => listen

  // Handle placing a new order
  socket.on("placeOrder", async (data: OrderInput, callback: Callback) => {
    try {
      // Validate the order data received from the client. This ensures that all required fields are present and that the items array is not empty and contains valid values.
      const validation = validateOrderData(data);

      // If validation fails, return an error message to the client
      if (!validation.valid) {
        return callback({ success: false, message: validation.message });
      }

      const totals = calculateTotals(data.items!);
      const orderId = generateOrderId();

      // Create the order in the database and include the status history for tracking
      const order = await prisma.order.create({
        data: createOrderDocument(data, orderId, totals),
        include: withHistory,
      });

      // Join the socket to a room specific to this order and a general "customers" room for broadcasting
      socket.join(`order_${orderId}`);
      socket.join("customers");

      // Emit the new order to all admins in the "admins" room
      io.to("admins").emit("newOrder", { order });

      // Return a success response to the client with the order details and a message
      callback({ success: true, order });
      console.log(`✅ Order created: ${orderId}`);
    } catch (error) {
      console.error("❌ Place order error:", error);
      callback({ success: false, message: "Failed to place order" });
    }
  });

  // Handle tracking an order
  socket.on(
    "trackOrder",
    async (data: { orderId: string }, callback: Callback) => {
      try {
        const order = await prisma.order.findUnique({
          where: { orderId: data.orderId },
          include: withHistory,
        });

        if (!order)
          return callback({ success: false, message: "Order not found" });

        // Join the socket to a room specific to this order for real-time updates
        socket.join(`order_${data.orderId}`);

        // Return the order details to the client after joining the room
        callback({ success: true, order });
      } catch (error) {
        console.error("❌ Track order error:", error);
        callback({ success: false, message: "Failed to load order" });
      }
    },
  );

  // Handle cancelling an order
  socket.on(
    "cancelOrder",
    async (data: { orderId: string; reason?: string }, callback: Callback) => {
      try {
        const order = await prisma.order.findUnique({
          where: { orderId: data.orderId },
        });

        if (!order)
          return callback({ success: false, message: "Order not found" });

        // Check if the order is in a state that allows cancellation. If the order is not "pending" or "confirmed", it cannot be cancelled, and an error message is returned to the client.
        if (!["pending", "confirmed"].includes(order.status)) {
          return callback({
            success: false,
            message: "Cannot cancel this order",
          });
        }

        // Update the order status to "cancelled" and add a new entry to the status history. The reason for cancellation is recorded, defaulting to "Cancelled by customer" if no reason is provided.
        await prisma.order.update({
          where: { orderId: data.orderId },
          data: {
            status: "cancelled",
            statusHistory: {
              create: {
                status: "cancelled",
                by: socket.id,
                note: data.reason || "Cancelled by customer",
              },
            },
          },
        });

        // Emit events to notify both the specific order room and the admins room about the cancellation. This allows all relevant parties to be informed of the change in order status.
        io.to(`order_${data.orderId}`).emit("orderCancelled", {
          orderId: data.orderId,
        });
        // Notify admins about the cancellation, including the order ID and customer name for context.
        io.to("admins").emit("orderCancelled", {
          orderId: data.orderId,
          customerName: order.customerName,
        });

        // Return a success response to the client indicating that the order has been successfully cancelled.
        callback({ success: true });
      } catch (error) {
        console.error("❌ Cancel order error:", error);
        callback({ success: false, message: "Failed to cancel order" });
      }
    },
  );

  // Handle fetching getting all orders for a customer
  socket.on(
    "getMyOrders",
    async (data: { customerPhone: string }, callback: Callback) => {
      try {
        // Fetch the most recent 50 orders for the customer based on their phone number. The results are ordered by creation date in descending order, and the status history is included for each order to provide context on the order's progress.
        const orders = await prisma.order.findMany({
          where: { customerPhone: data.customerPhone },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: withHistory,
        });

        // Return the list of orders to the client, indicating a successful retrieval of the customer's order history.
        callback({ success: true, orders });
      } catch (error) {
        console.error("❌ Get orders error:", error);
        callback({ success: false, message: "Failed to load orders" });
      }
    },
  );

  // ===== ADMIN EVENTS =====

  // Handle admin login
  socket.on("adminLogin", (data: { password: string }, callback: Callback) => {
    if (data.password === process.env.ADMIN_PASSWORD) {
      socket.data.isAdmin = true;
      socket.join("admins");
      console.log(`✅ Admin logged in: ${socket.id}`);

      callback({ success: true });
    } else {
      callback({ success: false, message: "Invalid password" });
    }
  });

  // Handle Getting all orders for admin
  socket.on(
    "getAllOrders",
    async (
      data: { status?: string; limit?: number } | undefined,
      callback: Callback,
    ) => {
      try {
        // Check if the user is an admin
        if (!socket.data.isAdmin)
          return callback({ success: false, message: "Unauthorized" });

        // Fetch orders from the database based on the provided status and limit. If no status is specified, all orders are fetched. The results are ordered by creation date in descending order, and the status history is included for each order.
        const orders = await prisma.order.findMany({
          where: data?.status ? { status: data.status } : {},
          orderBy: { createdAt: "desc" },
          take: data?.limit || 50,
          include: withHistory,
        });

        // Return the list of orders to the client, indicating a successful retrieval of all orders for the admin.
        callback({ success: true, orders });
      } catch (error) {
        console.error("❌ Get all orders error:", error);
        callback({ success: false, message: "Failed to load orders" });
      }
    },
  );

  // Handle updating order status
  socket.on(
    "updateOrderStatus",
    async (
      data: { orderId: string; newStatus: string },
      callback: Callback,
    ) => {
      try {
        // Check if the user is an admin before allowing them to update the order status. If the user is not an admin, return an unauthorized error message to the client.
        if (!socket.data.isAdmin)
          return callback({ success: false, message: "Unauthorized" });

        // Fetch the order from the database using the provided order ID. If the order does not exist, return an error message indicating that the order was not found.
        const order = await prisma.order.findUnique({
          where: { orderId: data.orderId },
        });
        if (!order)
          return callback({ success: false, message: "Order not found" });

        // Check if the status transition is valid based on the current status of the order and the new status provided. If the transition is not valid, return an error message indicating that the status transition is invalid.
        if (!isValidStatusTransition(order.status, data.newStatus)) {
          return callback({
            success: false,
            message: "Invalid status transition",
          });
        }

        const result = await prisma.order.update({
          where: { orderId: data.orderId },
          data: {
            status: data.newStatus,
            statusHistory: {
              create: {
                status: data.newStatus,
                by: socket.id, // Record the socket ID of the admin making the change for accountability
                note: "Status updated by admin",
              },
            },
          },
          include: withHistory,
        });

        // Emit events to notify both the specific order room and the admins room about the status update. This allows all relevant parties to be informed of the change in order status.
        io.to(`order_${data.orderId}`).emit("statusUpdated", {
          orderId: data.orderId,
          status: data.newStatus,
          order: result,
        });
        // Notify all admins about the status change, including the order ID and the new status for context.
        socket.to("admins").emit("orderStatusChanged", {
          orderId: data.orderId,
          newStatus: data.newStatus,
        });

        callback({ success: true, order: result });
      } catch (error) {
        console.error("❌ Update status error:", error);
        callback({ success: false, message: "Failed to update status" });
      }
    },
  );

  // Handle accepting an order
  socket.on(
    "acceptOrder",
    async (
      data: { orderId: string; estimatedTime?: number },
      callback: Callback,
    ) => {
      try {
        if (!socket.data.isAdmin)
          return callback({ success: false, message: "Unauthorized" });

        // Fetch the order from the database using the provided order ID. If the order does not exist or is not in a "pending" state, return an error message indicating that the order cannot be accepted. This ensures that only valid orders can be accepted by an admin.
        const order = await prisma.order.findUnique({
          where: { orderId: data.orderId },
        });
        if (!order || order.status !== "pending") {
          return callback({
            success: false,
            message: "Cannot accept this order",
          });
        }

        // Set the estimated time for the order. If no estimated time is provided in the request, default to 30 minutes. This value will be used to inform the customer of how long it will take for their order to be prepared and delivered.
        const estimatedTime = data.estimatedTime || 30;

        // Update the order status to "confirmed" and add a new entry to the status history. The estimated time is also recorded in the order for reference. This change reflects that the order has been accepted by an admin and is now being processed.
        const result = await prisma.order.update({
          where: { orderId: data.orderId },
          data: {
            status: "confirmed",
            estimatedTime,
            statusHistory: {
              create: {
                status: "confirmed",
                by: socket.id, // Record the socket ID of the admin making the change for accountability
                note: `Accepted with ${estimatedTime} min estimated time`,
              },
            },
          },
          include: withHistory,
        });

        // Emit events to notify both the specific order room and the admins room about the order acceptance.
        io.to(`order_${data.orderId}`).emit("orderAccepted", {
          orderId: data.orderId,
          estimatedTime,
        });
        // Notify all admins about the order acceptance
        socket
          .to("admins")
          .emit("orderAcceptedByAdmin", { orderId: data.orderId });

        callback({ success: true, order: result });
      } catch (error) {
        console.error("❌ Accept order error:", error);
        callback({ success: false, message: "Failed to accept order" });
      }
    },
  );

  // Handle rejecting an order
  socket.on(
    "rejectOrder",
    async (data: { orderId: string; reason?: string }, callback: Callback) => {
      try {
        if (!socket.data.isAdmin)
          return callback({ success: false, message: "Unauthorized" });

        const order = await prisma.order.findUnique({
          where: { orderId: data.orderId },
        });
        if (!order || order.status !== "pending") {
          return callback({
            success: false,
            message: "Cannot reject this order",
          });
        }

        // Update the order status to "cancelled" and add a new entry to the status history. The reason for rejection is recorded, defaulting to an empty string if no reason is provided. This change reflects that the order has been rejected by an admin and will not be processed further.
        await prisma.order.update({
          where: { orderId: data.orderId },
          data: {
            status: "cancelled",
            statusHistory: {
              create: {
                status: "cancelled",
                by: socket.id,
                note: `Rejected: ${data.reason ?? ""}`,
              },
            },
          },
        });

        // Emit events to notify both the specific order room and the admins room about the order rejection. This allows all relevant parties to be informed of the change in order status.
        io.to(`order_${data.orderId}`).emit("orderRejected", {
          orderId: data.orderId,
          reason: data.reason,
        });

        callback({ success: true });
      } catch (error) {
        console.error("❌ Reject order error:", error);
        callback({ success: false, message: "Failed to reject order" });
      }
    },
  );

  // Handle setting estimated time for an order
  socket.on(
    "setEstimatedTime",
    async (
      data: { orderId: string; estimatedTime: number },
      callback: Callback,
    ) => {
      try {
        if (!socket.data.isAdmin)
          return callback({ success: false, message: "Unauthorized" });

        const result = await prisma.order.update({
          where: { orderId: data.orderId },
          data: { estimatedTime: data.estimatedTime },
          include: withHistory,
        });

        io.to(`order_${data.orderId}`).emit("estimatedTimeUpdated", {
          orderId: data.orderId,
          estimatedTime: data.estimatedTime,
        });
        callback({ success: true, order: result });
      } catch (error) {
        console.error("❌ Set time error:", error);
        callback({
          success: false,
          message: "Order not found or update failed",
        });
      }
    },
  );

  // Handle getting live stats for admin
  socket.on("getLiveStats", async (callback: Callback) => {
    try {
      if (!socket.data.isAdmin)
        return callback({ success: false, message: "Unauthorized" });

      // Calculate the start of today to filter orders created from this point onwards. This is used to get the count of orders placed today and to group orders by their status for live statistics.
      const today = new Date();
      // Set the hours, minutes, seconds, and milliseconds to zero to get the start of today
      today.setHours(0, 0, 0, 0);

      // Use Promise.all to fetch the total count of orders created today and to group orders by their status. This allows for efficient retrieval of both pieces of information in parallel, reducing the overall response time for the live stats request.
      const [totalToday, grouped] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);

      // Create a counts object to hold the number of orders for each status. This is populated by iterating over the grouped results and assigning the count for each status to the corresponding key in the counts object.
      const counts: Record<string, number> = {};
      grouped.forEach((g) => (counts[g.status] = g._count._all));

      // Create a stats object to hold the total number of orders today and the counts for each status. This object is then returned to the client as part of the callback response, providing a snapshot of the current order statistics for the admin.
      const stats = {
        totalToday,
        pending: counts.pending ?? 0,
        confirmed: counts.confirmed ?? 0,
        preparing: counts.preparing ?? 0,
        ready: counts.ready ?? 0,
        outForDelivery: counts.out_for_delivery ?? 0,
        delivered: counts.delivered ?? 0,
        cancelled: counts.cancelled ?? 0,
      };

      callback({ success: true, stats });
    } catch (error) {
      console.error("❌ Get stats error:", error);
      callback({ success: false, message: "Failed to load stats" });
    }
  });

  // Handle disconnecting a user
  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.id}`);
    if (socket.data.isAdmin) {
      socket.to("admins").emit("adminDisconnected", { adminId: socket.id });
    }
  });
};

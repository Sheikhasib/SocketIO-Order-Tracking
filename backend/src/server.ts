// server.ts
// Main server file - Express + MongoDB (Socket.IO will be added in videos)

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB, prisma, closeDB } from "./config/database.js";
import { Server } from "socket.io";
import http from "http";
import { orderHandler } from "./socket/orderHandler.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// ==========================================
// SOCKET.IO SETUP
// ==========================================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("A user is connected", socket.id);
  socket.emit("connected", { message: `User ${socket.id} connected` });

  //For handling the orders
  orderHandler(io, socket);
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// REST API ROUTES
// ==========================================

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Get all orders
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { statusHistory: true },
    });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get single order by ID
app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderId: req.params.orderId },
      include: { statusHistory: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("\n👋 Shutting down gracefully...");
  await closeDB();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║  🚀 Server Running                     ║
║  📡 Port: ${PORT}                         ║
║  🌐 http://localhost:${PORT}              ║
║  📊 PostgreSQL: Connected              ║
╚════════════════════════════════════════╝
    `);
      console.log("📝 API Endpoints:");
      console.log(`   GET  /health`);
      console.log(`   GET  /api/orders`);
      console.log(`   GET  /api/orders/:orderId`);
      console.log("\n✨ Ready! time to explore Socket.IO \n");
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });

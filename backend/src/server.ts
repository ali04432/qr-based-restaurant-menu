import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import menuRouter from "./routes/menu.routes";
import ordersRouter from "./routes/orders.routes";
import authRouter from "./routes/auth.routes";
import usersRouter from "./routes/users.routes";
import tablesRouter from "./routes/tables.routes";
import restaurantRouter from "./routes/restaurant.routes";
import analyticsRouter from "./routes/analytics.routes";
import aiRouter from "./routes/ai.routes";

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Restrict in production via env var
    methods: ["GET", "POST", "PATCH"],
  },
});

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json());

// Socket.io connection logic
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join a restaurant-specific room for real-time data isolation
  socket.on("join-restaurant", (restaurantId: string) => {
    socket.join(restaurantId);
    console.log(`Socket ${socket.id} joined restaurant room: ${restaurantId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- API Routes ---
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/restaurant", restaurantRouter);
app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/ai", aiRouter);

// Health-check endpoint verifying PostgreSQL database connection
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Database health check failed:", message);
    res.status(500).json({
      status: "DOWN",
      database: "DISCONNECTED",
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// --- Development Seed Route ---
// Seeds demo restaurant, tables, and menu items for testing without Phase 3 admin panel
app.post("/api/seed", async (_req: Request, res: Response) => {
  try {
    // Upsert demo restaurant
    const restaurant = await prisma.restaurant.upsert({
      where: { id: "a0000000-0000-0000-0000-000000000001" },
      update: {},
      create: {
        id: "a0000000-0000-0000-0000-000000000001",
        name: "Cafe Aroma",
        logo: null,
        themeColor: "#4F46E5",
        subscriptionPlan: "PRO",
      },
    });

    // Seed 5 tables
    const tableData = ["T1", "T2", "T3", "T4", "T5"].map((num, i) => ({
      id: `b000000${i + 1}-0000-0000-0000-000000000001`,
      restaurantId: restaurant.id,
      tableNumber: num,
      qrCodeUrl: `http://localhost:3000/menu?restaurant=${restaurant.id}&table=b000000${i + 1}-0000-0000-0000-000000000001`,
    }));

    for (const table of tableData) {
      await prisma.table.upsert({
        where: { id: table.id },
        update: {},
        create: table,
      });
    }

    // Seed menu items
    const menuItems = [
      // Burgers
      {
        id: "c0000001-0000-0000-0000-000000000001",
        name: "Classic Double Smash",
        description: "Juicy smash patties, secret sauce, melted cheddar on toasted brioche.",
        price: 890,
        category: "Burgers",
        imageUrl: null,
        modelUrl: null,
      },
      {
        id: "c0000002-0000-0000-0000-000000000001",
        name: "Crispy Chicken Burger",
        description: "Southern-style fried chicken fillet, coleslaw, jalapeño mayo.",
        price: 750,
        category: "Burgers",
        imageUrl: null,
        modelUrl: null,
      },
      {
        id: "c0000003-0000-0000-0000-000000000001",
        name: "BBQ Bacon Stack",
        description: "Beef patty, smoky bacon, BBQ sauce, pickled onions.",
        price: 990,
        category: "Burgers",
        imageUrl: null,
        modelUrl: null,
      },
      // Drinks
      {
        id: "c0000004-0000-0000-0000-000000000001",
        name: "Classic Lemonade",
        description: "Fresh-squeezed lemonade with a hint of mint.",
        price: 250,
        category: "Drinks",
        imageUrl: null,
        modelUrl: null,
      },
      {
        id: "c0000005-0000-0000-0000-000000000001",
        name: "Mango Lassi",
        description: "Rich, chilled yogurt-mango blend.",
        price: 300,
        category: "Drinks",
        imageUrl: null,
        modelUrl: null,
      },
      {
        id: "c0000006-0000-0000-0000-000000000001",
        name: "Cold Brew Coffee",
        description: "12-hour steeped single origin cold brew over ice.",
        price: 350,
        category: "Drinks",
        imageUrl: null,
        modelUrl: null,
      },
      // Desserts
      {
        id: "c0000007-0000-0000-0000-000000000001",
        name: "Lotus Biscoff Cheesecake",
        description: "Creamy no-bake cheesecake on a biscoff crumb base.",
        price: 450,
        category: "Desserts",
        imageUrl: null,
        modelUrl: null,
      },
      {
        id: "c0000008-0000-0000-0000-000000000001",
        name: "Molten Lava Cake",
        description: "Warm chocolate cake with a gooey molten center, served with vanilla ice cream.",
        price: 500,
        category: "Desserts",
        imageUrl: null,
        modelUrl: null,
      },
    ];

    for (const item of menuItems) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {},
        create: { ...item, restaurantId: restaurant.id, isAvailable: true },
      });
    }

    res.json({
      message: "Seed complete",
      restaurantId: restaurant.id,
      tables: tableData.map((t) => ({ id: t.id, number: t.tableNumber, qr: t.qrCodeUrl })),
      menuItemsCreated: menuItems.length,
    });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ error: "Seed failed", details: String(err) });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 BiteFlow server running on port ${PORT}`);
});

// Export Prisma and Socket.io for use in routes/controllers
export { prisma, io };

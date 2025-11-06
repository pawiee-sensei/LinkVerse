// app.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool, dbHealthCheck } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ----- View engine & static first (clarity)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----- Core middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "linkverse_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 86400000 },
  })
);

// Expose session to all EJS templates (your header expects `session`)
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ----- Routes
app.use("/", authRoutes);
app.use("/", adminRoutes);

// Health check
app.get("/health", async (req, res) => {
  try {
    await dbHealthCheck();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Default route (temporary)
app.get("/", (req, res) => {
  res.send("<h2 style='color:white;background:#111;padding:20px;text-align:center'>Welcome to LinkVerse Backend (Server is running)</h2>");
});

// 404
app.use((req, res) => res.status(404).send("404 - Not Found"));

// ----- Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await dbHealthCheck();
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

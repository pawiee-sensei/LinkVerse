// app.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import expressLayouts from "express-ejs-layouts";
import { pool, dbHealthCheck } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import adminUploadsRoutes from "./routes/adminUploads.js";

dotenv.config();

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Initialize Express before using it
const app = express();

// ----- View Engine and Layouts -----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts); // ✅ after app is initialized
// Default layout off for user-facing routes
app.set("layout", false);
 // default layout (optional, can be overridden in each view)

// ----- Static Assets -----
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----- Core Middlewares -----
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

// ----- Expose session to all EJS templates -----
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ----- Routes -----
app.use("/", authRoutes);
app.use("/", adminRoutes);
app.use("/", adminUploadsRoutes);

// ----- Health Check -----
app.get("/health", async (req, res) => {
  try {
    await dbHealthCheck();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ----- Default Home Route -----
app.get("/", (req, res) => {
  res.render("home", { title: "Home", session: req.session });
});

// ----- 404 -----
app.use((req, res) => res.status(404).send("404 - Not Found"));

// ----- Start Server -----
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

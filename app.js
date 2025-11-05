// app.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { dbHealthCheck } from "./config/db.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Core middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_linkverse_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

// Expose current user to EJS templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Static + View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ---- Minimal routes (we’ll add feature routes next)
app.get("/", async (req, res) => {
  // Temporary home just to verify setup; will render cards later.
  res.render("index", { title: "LinkVerse — Home (Setup OK)" });
});

app.get("/health", async (req, res) => {
  try {
    await dbHealthCheck();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("404 — Not Found");
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`LinkVerse running at http://localhost:${PORT}`)
);

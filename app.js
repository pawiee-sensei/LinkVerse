// app.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool, dbHealthCheck } from "./config/db.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------- MIDDLEWARES -------------- //
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_linkverse_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Make current user accessible in all EJS views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Static & view engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// -------------- ROUTES -------------- //

// Homepage (Show approved links as cards)
app.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        l.*, 
        COALESCE(AVG(r.rating), 0) AS avg_rating 
      FROM links l
      LEFT JOIN ratings r ON l.id = r.link_id
      WHERE l.status = 'approved'
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);

    res.render("index", {
      title: "Home — LinkVerse",
      links: rows,
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).send("Database error while loading homepage");
  }
});

// Health check (for debugging)
app.get("/health", async (req, res) => {
  try {
    await dbHealthCheck();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Logout (temporary simple route)
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// 404 page
app.use((req, res) => {
  res.status(404).send("<h2 style='text-align:center;margin-top:50px'>404 — Page Not Found</h2>");
});

// -------------- SERVER -------------- //
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await dbHealthCheck();
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("⚠️ Database connection failed:", err.message);
  }

  console.log(`🚀 LinkVerse running at http://localhost:${PORT}`);
});

// app.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool, dbHealthCheck } from "./config/db.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- middlewares
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
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- homepage
app.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, COALESCE(AVG(r.rating),0) AS avg_rating
      FROM links l
      LEFT JOIN ratings r ON l.id = r.link_id
      WHERE l.status='approved'
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
    res.render("index", { title: "Home — LinkVerse", links: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("DB Error");
  }
});

// --- health & auth routes
app.get("/health", async (req, res) => {
  try { await dbHealthCheck(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.use("/", authRoutes);

// --- 404
app.use((req, res) => res.status(404).send("404 - Not Found"));

// --- start
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try { await dbHealthCheck(); console.log("✅ DB connected"); }
  catch (e) { console.error("⚠️ DB failed:", e.message); }
  console.log(`🚀 http://localhost:${PORT}`);
});

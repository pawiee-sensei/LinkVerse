import express from "express";
import { ensureAdmin } from "../middleware/authMiddleware.js";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/admin/dashboard", ensureAdmin, async (req, res) => {
  try {
    // Queries (safe even if tables are empty)
    const [[{ totalUsers }]]  = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalVideos }]] = await pool.query("SELECT COUNT(*) AS totalVideos FROM videos");
    const [[{ totalViews }]]  = await pool.query("SELECT COALESCE(SUM(views),0) AS totalViews FROM videos");

    // If you haven’t added ratings columns yet, compute avg from ratings table later.
    // For now, set 0 safely:
    const avgRating = 0;

    const [recent] = await pool.query(
      "SELECT title, category, views, last_updated FROM videos ORDER BY last_updated DESC LIMIT 5"
    );

    return res.render("admin/dashboard", {
      layout: "admin/layout",
      title: "Dashboard",
      stats: { totalUsers, totalVideos, avgRating, totalViews },
      recent,
    });
  } catch (err) {
    console.error("❌ DB Error on /admin/dashboard:", err);
    return res.status(500).send("Database error");
  }
});

export default router;

import express from "express";
import { pool } from "../config/db.js";
import { ensureUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================
   WATCH HISTORY PAGE
============================================ */
router.get("/", ensureUser, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [history] = await pool.query(
      `SELECT 
         h.id AS history_id,
         h.position,
         h.duration,
         h.last_watched,

         v.id AS video_id,
         v.title,
         v.banner,
         v.thumbnail,
         v.category,
         v.genre,
         
         ve.id AS episode_id,
         ve.episode_title,
         ve.episode_number,
         ve.episode_thumbnail,

         COALESCE(ve.episode_thumbnail, v.thumbnail, v.banner) AS thumb
       FROM history h
       JOIN videos v ON v.id = h.video_id
       LEFT JOIN video_episodes ve ON ve.id = h.episode_id
       WHERE h.user_id = ?
       ORDER BY h.last_watched DESC`,
      [userId]
    );

    res.render("history", {
      layout: false,
      title: "Watch History",
      session: req.session,
      history
    });

  } catch (err) {
    console.error("❌ HISTORY PAGE ERROR:", err);
    res.status(500).send("Database Error");
  }
});

/* ============================================
   REMOVE SINGLE HISTORY ENTRY
============================================ */
router.post("/remove/:historyId", ensureUser, async (req, res) => {
  const { historyId } = req.params;

  try {
    await pool.query("DELETE FROM history WHERE id = ?", [historyId]);
    res.redirect("/history");
  } catch (err) {
    console.error("❌ Remove History Error:", err);
    res.status(500).send("Database Error");
  }
});

/* ============================================
   CLEAR ALL HISTORY
============================================ */
router.post("/clear", ensureUser, async (req, res) => {
  const userId = req.session.user.id;

  try {
    await pool.query("DELETE FROM history WHERE user_id = ?", [userId]);
    res.redirect("/history");
  } catch (err) {
    console.error("❌ Clear History Error:", err);
    res.status(500).send("Database Error");
  }
});

export default router;

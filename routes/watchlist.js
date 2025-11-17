// routes/watchlist.js
import express from "express";
import { pool } from "../config/db.js";
import { ensureUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================
   ADD TO WATCHLIST
============================================ */
router.post("/add/:videoId", ensureUser, async (req, res) => {
  const userId = req.session.user.id;
  const { videoId } = req.params;

  try {
    await pool.query(
      "INSERT IGNORE INTO watchlist (user_id, video_id) VALUES (?, ?)",
      [userId, videoId]
    );
  } catch (err) {
    console.log("Watchlist insert error:", err.message);
  }

  return res.redirect("back");
});

/* ============================================
   REMOVE FROM WATCHLIST
============================================ */
router.post("/remove/:videoId", ensureUser, async (req, res) => {
  const userId = req.session.user.id;
  const { videoId } = req.params;

  await pool.query(
    "DELETE FROM watchlist WHERE user_id = ? AND video_id = ?",
    [userId, videoId]
  );

  return res.redirect("back");
});

/* ============================================
   WATCHLIST PAGE (Trending + Continue + For You + Watchlist + History)
============================================ */
router.get("/", ensureUser, async (req, res) => {
  const userId = req.session.user.id;

  try {
    /* -----------------------------
       1️⃣ TRENDING
    -------------------------------*/
    const [trending] = await pool.query(
      `SELECT id, title, banner, category, genre, views
       FROM videos
       ORDER BY views DESC
       LIMIT 8`
    );

    /* -----------------------------
       2️⃣ CONTINUE WATCHING (latest only)
    -------------------------------*/
    const [historyCurrent] = await pool.query(
      `SELECT 
         h.video_id,
         h.episode_id,
         h.position,
         h.duration,
         h.last_watched,
         v.title,
         v.category,
         v.genre,
         v.banner,
         v.thumbnail,
         ve.episode_thumbnail,
         COALESCE(ve.episode_thumbnail, v.thumbnail, v.banner) AS thumb
       FROM history h
       JOIN videos v ON v.id = h.video_id
       LEFT JOIN video_episodes ve ON ve.id = h.episode_id
       WHERE h.user_id = ?
       ORDER BY h.last_watched DESC
       LIMIT 12`,
      [userId]
    );

    /* -----------------------------
       3️⃣ FOR YOU (recommended genre)
    -------------------------------*/
    const [[favGenre]] = await pool.query(
      `SELECT v.genre, COUNT(*) AS total
       FROM history h
       JOIN videos v ON v.id = h.video_id
       WHERE h.user_id = ?
       GROUP BY v.genre
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );

    let forYou = [];

    if (favGenre && favGenre.genre) {
      [forYou] = await pool.query(
        `SELECT id, title, banner, category, genre, views, synopsis
         FROM videos
         WHERE genre = ?
         ORDER BY views DESC
         LIMIT 12`,
        [favGenre.genre]
      );
    }

    if (forYou.length === 0) {
      [forYou] = await pool.query(
        `SELECT id, title, banner, category, genre, views, synopsis
         FROM videos
         ORDER BY views DESC
         LIMIT 12`
      );
    }

    /* -----------------------------
       4️⃣ WATCHLIST
    -------------------------------*/
    const [watchlist] = await pool.query(
      `SELECT v.*
       FROM watchlist w
       JOIN videos v ON v.id = w.video_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    /* -----------------------------
       5️⃣ WATCH HISTORY (Paginated Table)
    -------------------------------*/
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const [[{ totalHistory }]] = await pool.query(
      `SELECT COUNT(*) AS totalHistory 
       FROM history 
       WHERE user_id = ?`,
      [userId]
    );

    const [historyFull] = await pool.query(
      `SELECT 
         h.video_id,
         h.episode_id,
         h.position,
         h.duration,
         h.last_watched,
         v.title,
         v.banner,
         v.thumbnail,
         ve.episode_title,
         ve.episode_number,
         ve.episode_thumbnail,
         COALESCE(ve.episode_thumbnail, v.thumbnail, v.banner) AS thumb
       FROM history h
       JOIN videos v ON v.id = h.video_id
       LEFT JOIN video_episodes ve ON ve.id = h.episode_id
       WHERE h.user_id = ?
       ORDER BY h.last_watched DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const totalPages = Math.ceil(totalHistory / limit);

    /* -----------------------------
       RENDER PAGE
    -------------------------------*/
    res.render("watchlist", {
      layout: false,
      title: "Your Dashboard",
      session: req.session,

      trending,
      historyCurrent,
      forYou,
      watchlist,

      // paginated history
      historyFull,
      totalPages,
      currentPage: page,
    });

  } catch (err) {
    console.error("❌ WATCHLIST PAGE ERROR:", err);
    return res.status(500).send("Database Error");
  }
});

export default router;

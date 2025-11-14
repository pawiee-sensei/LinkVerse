import express from "express";
import { pool } from "../config/db.js";
import { ensureUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// ADD TO WATCHLIST
router.post("/add/:videoId", ensureUser, async (req, res) => {
  const userId = req.session.user.id;
  const { videoId } = req.params;

  try {
    await pool.query(
      "INSERT INTO watchlist (user_id, video_id) VALUES (?, ?)",
      [userId, videoId]
    );
  } catch (err) {
    console.log("Watchlist insert error (duplicate likely):", err.message);
  }

  return res.redirect("back");
});

// REMOVE FROM WATCHLIST
router.post("/remove/:videoId", ensureUser, async (req, res) => {
  const userId = req.session.user.id;
  const { videoId } = req.params;

  await pool.query(
    "DELETE FROM watchlist WHERE user_id = ? AND video_id = ?",
    [userId, videoId]
  );

  return res.redirect("back");
});

// WATCHLIST PAGE
router.get("/", ensureUser, async (req, res) => {
  const userId = req.session.user.id;

  const [videos] = await pool.query(
    `SELECT videos.*
     FROM watchlist
     JOIN videos ON videos.id = watchlist.video_id
     WHERE watchlist.user_id = ?`,
    [userId]
  );

  res.render("watchlist", {
    layout: false,
    title: "Your Watchlist",
    session: req.session,
    videos
  });
});

export default router;

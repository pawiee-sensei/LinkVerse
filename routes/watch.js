import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// WATCH PAGE
router.get("/watch/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    if (!video) return res.status(404).send("Video not found");

    // increment view count
    await pool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [videoId]);

    // get reviews
    const [reviews] = await pool.query(
      `SELECT r.*, u.username 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.video_id = ? 
       ORDER BY r.created_at DESC`,
      [videoId]
    );

    // average rating
    const [[{ avgRating }]] = await pool.query(
      "SELECT ROUND(AVG(rating),1) AS avgRating FROM reviews WHERE video_id = ?",
      [videoId]
    );

    res.render("watch", {
      title: `${video.title} — LinkVerse`,
      layout: false,
      video,
      reviews,
      avgRating: avgRating || 0,
      session: req.session,
    });
  } catch (err) {
    console.error("❌ Error loading video:", err);
    res.status(500).send("Database Error");
  }
});

// SUBMIT REVIEW
router.post("/watch/:id/review", async (req, res) => {
  const videoId = req.params.id;
  const user = req.session.user;
  const { rating, comment } = req.body;

  if (!user) return res.redirect("/login");

  try {
    // check if user already reviewed
    const [[existing]] = await pool.query(
      "SELECT id FROM reviews WHERE user_id = ? AND video_id = ?",
      [user.id, videoId]
    );

    if (existing) {
      // update
      await pool.query(
        "UPDATE reviews SET rating = ?, comment = ? WHERE id = ?",
        [rating, comment, existing.id]
      );
    } else {
      // insert
      await pool.query(
        "INSERT INTO reviews (user_id, video_id, rating, comment) VALUES (?, ?, ?, ?)",
        [user.id, videoId, rating, comment]
      );
    }

    res.redirect(`/watch/${videoId}`);
  } catch (err) {
    console.error("❌ Error saving review:", err);
    res.status(500).send("Database Error");
  }
});

export default router;

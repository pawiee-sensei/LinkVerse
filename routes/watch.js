import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/watch/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);

    if (!video) return res.status(404).send("Video not found");

    // increment view count
    await pool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [videoId]);

    res.render("watch", {
      title: `${video.title} — LinkVerse`,
      layout: false,
      video,
      session: req.session,
    });
  } catch (err) {
    console.error("❌ Error loading video:", err);
    res.status(500).send("Database Error");
  }
});

export default router;

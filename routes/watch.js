// routes/watch.js
import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// -----------------------------
// WATCH PAGE (GET)
// -----------------------------
router.get("/watch/:id", async (req, res) => {
  const videoId = req.params.id;
  const episodeId = req.query.episode || null;
  const user = req.session.user;

  try {
    // fetch main video
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    if (!video) return res.status(404).send("Video not found");

    // increment views for the main video
    await pool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [videoId]);

    // fetch episodes from DB (those explicitly uploaded as episodes)
    const [episodesFromDB] = await pool.query(
      "SELECT * FROM video_episodes WHERE video_id = ? ORDER BY episode_number ASC",
      [videoId]
    );

    // Build episodes array — include main video as episode 1
    const episodes = [
      {
        id: null,
        episode_title: video.title,
        episode_number: 1,
        episode_file: video.video_file,
        episode_thumbnail: video.banner,
        isMain: true,
      },
      ...episodesFromDB.map((ep) => ({
        ...ep,
        episode_number: (ep.episode_number || 0) + 1,
        isMain: false,
      })),
    ];

    // Determine active episode
    let activeEpisode = episodes[0];
    if (episodeId) {
      const found = episodes.find((e) => e.id && String(e.id) === String(episodeId));
      if (found) activeEpisode = found;
    }

    const activeVideoFile = activeEpisode.episode_file;
    const activeThumbnail = activeEpisode.episode_thumbnail || video.banner;
    const activeEpisodeTitle = activeEpisode.isMain
      ? video.title
      : `${video.title} — ${activeEpisode.episode_title || `Episode ${activeEpisode.episode_number}`}`;

    // fetch reviews
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
      "SELECT ROUND(AVG(rating), 1) AS avgRating FROM reviews WHERE video_id = ?",
      [videoId]
    );

    // user's rating (if logged in)
    let userRating = null;
    if (user) {
      const [[userReview]] = await pool.query(
        "SELECT rating FROM reviews WHERE user_id = ? AND video_id = ?",
        [user.id, videoId]
      );
      if (userReview) userRating = userReview.rating;
    }

    // related videos
    const [related] = await pool.query(
      `SELECT id, title, banner, category, synopsis
       FROM videos
       WHERE category = ? AND id != ?
       ORDER BY views DESC
       LIMIT 6`,
      [video.category, video.id]
    );

    // ⭐⭐⭐ WATCHLIST CHECK (ADDED)
    let videosInWatchlist = [];
    if (req.session.user) {
      const [rows] = await pool.query(
        "SELECT video_id FROM watchlist WHERE user_id = ?",
        [req.session.user.id]
      );
      videosInWatchlist = rows.map((r) => r.video_id);
    }
    // ⭐⭐⭐ END WATCHLIST CHECK

    // Render page
    res.render("watch", {
      title: activeEpisodeTitle,
      layout: false,
      video,
      episodes,
      activeVideoFile,
      activeThumbnail,
      activeEpisodeTitle,
      reviews,
      avgRating: avgRating || 0,
      session: req.session,
      userRating: userRating || 0,
      related,
      page: "",
      videosInWatchlist, // ⭐ required by the watch.ejs button
    });
  } catch (err) {
    console.error("❌ Error loading watch page:", err);
    res.status(500).send("Database Error");
  }
});

// -----------------------------
// SUBMIT / UPDATE REVIEW (POST)
// -----------------------------
router.post("/watch/:id/review", async (req, res) => {
  const videoId = req.params.id;
  const user = req.session.user;
  const { rating, comment } = req.body;

  if (!user) return res.redirect("/login");

  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM reviews WHERE user_id = ? AND video_id = ?",
      [user.id, videoId]
    );

    if (existing) {
      await pool.query(
        "UPDATE reviews SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?",
        [rating, comment, existing.id]
      );
    } else {
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

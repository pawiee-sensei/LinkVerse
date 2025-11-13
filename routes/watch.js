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
    // Fetch main video
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    if (!video) return res.status(404).send("Video not found");

    // Increment main video views (only once per main video load)
    await pool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [videoId]);

    // Fetch all episodes for this video
    const [episodesFromDB] = await pool.query(
      "SELECT * FROM video_episodes WHERE video_id = ? ORDER BY episode_number ASC",
      [videoId]
    );

    // Combine main video as Episode 1 (only if episodes exist)
    const episodes =
      episodesFromDB.length > 0
        ? [
            {
              id: null, // no DB ID for the main video
              episode_title: video.title,
              episode_number: 1,
              episode_file: video.video_file,
              episode_thumbnail: video.banner,
              isMain: true,
            },
            ...episodesFromDB.map((ep) => ({
              ...ep,
              episode_number: ep.episode_number + 1, // shift numbering (main = Ep1)
              isMain: false,
            })),
          ]
        : []; // empty for non-series videos

    // Determine active video details
    let activeVideoFile = video.video_file;
    let activeEpisodeTitle = video.title;
    let activeThumbnail = video.banner;

    if (episodesFromDB.length > 0) {
      // This is a series → default to Episode 1 (main video)
      activeEpisodeTitle = `${video.title} — Episode 1`;

      if (episodeId) {
        const [[selectedEpisode]] = await pool.query(
          "SELECT * FROM video_episodes WHERE id = ? AND video_id = ?",
          [episodeId, videoId]
        );

        if (selectedEpisode) {
          activeVideoFile = selectedEpisode.episode_file;
          activeEpisodeTitle = `${video.title} — Episode ${selectedEpisode.episode_number}`;
          activeThumbnail =
            selectedEpisode.episode_thumbnail || video.banner;
        }
      }
    }

    // Fetch reviews with user info
    const [reviews] = await pool.query(
      `SELECT r.*, u.username
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.video_id = ?
       ORDER BY r.created_at DESC`,
      [videoId]
    );

    // Average rating
    const [[{ avgRating }]] = await pool.query(
      "SELECT ROUND(AVG(rating), 1) AS avgRating FROM reviews WHERE video_id = ?",
      [videoId]
    );

    // User’s existing rating
    let userRating = null;
    if (user) {
      const [[userReview]] = await pool.query(
        "SELECT rating FROM reviews WHERE user_id = ? AND video_id = ?",
        [user.id, videoId]
      );
      if (userReview) userRating = userReview.rating;
    }

    // Related videos
    const [related] = await pool.query(
      `SELECT id, title, banner, category, synopsis
       FROM videos
       WHERE category = ? AND id != ?
       ORDER BY views DESC
       LIMIT 6`,
      [video.category, video.id]
    );

    // Render page
    res.render("watch", {
      title: activeEpisodeTitle,
      layout: false,
      video,
      reviews,
      avgRating: avgRating || 0,
      session: req.session,
      userRating,
      related,
      episodes,
      activeVideoFile,
      activeThumbnail,
      activeEpisodeTitle,
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
        "UPDATE reviews SET rating=?, comment=?, updated_at=NOW() WHERE id=?",
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
    console.error("❌ Review Save Error:", err);
    res.status(500).send("Database Error");
  }
});

export default router;

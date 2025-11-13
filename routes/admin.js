import express from "express";
import path from "path";
import multer from "multer";
import { ensureAdmin } from "../middleware/authMiddleware.js";
import { pool } from "../config/db.js";

const router = express.Router();

/* ---------------------------------------------
   MULTER STORAGE
---------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "banner") return cb(null, "uploads/banners");
    if (file.fieldname === "episode_thumbnail") return cb(null, "uploads/episode_thumbnails");
    return cb(null, "uploads/videos");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ---------------------------------------------
   ADMIN DASHBOARD
---------------------------------------------- */
router.get("/admin/dashboard", ensureAdmin, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalVideos }]] = await pool.query("SELECT COUNT(*) AS totalVideos FROM videos");
    const [[{ totalViews }]] = await pool.query("SELECT COALESCE(SUM(views),0) AS totalViews FROM videos");

    const [recent] = await pool.query(
      "SELECT title, category, views, last_updated FROM videos ORDER BY last_updated DESC LIMIT 5"
    );

    res.render("admin/dashboard", {
      layout: "admin/layout",
      title: "Dashboard",
      stats: { totalUsers, totalVideos, totalViews },
      recent,
    });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).send("Database Error");
  }
});
// ---------------------------
// ADMIN UPLOADS LIST (WITH PAGINATION)
// ---------------------------
router.get("/admin/uploads", ensureAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";
    const sort = req.query.sort || "created_at";
    const page = parseInt(req.query.page) || 1;
    const limit = 8; // VIDEOS PER PAGE
    const offset = (page - 1) * limit;

    // Count total videos
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM videos
       WHERE title LIKE ? 
          OR category LIKE ?
          OR genre LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );

    // Fetch paginated videos
    const [videos] = await pool.query(
      `SELECT id, title, category, genre, views, banner, last_updated AS created_at
       FROM videos
       WHERE title LIKE ?
          OR category LIKE ?
          OR genre LIKE ?
       ORDER BY ${sort} DESC
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    res.render("admin/uploads", {
      title: "Manage Uploads — Admin",
      layout: "admin/layout",
      admin: req.session.admin,
      videos,
      search,
      sort,
      page,
      totalPages,
    });
  } catch (err) {
    console.error("❌ Error fetching videos:", err);
    res.status(500).send("Database Error");
  }
});


/* ---------------------------------------------
   ADMIN: UPLOAD FORM (GET)
---------------------------------------------- */
router.get("/admin/upload", ensureAdmin, (req, res) => {
  res.render("admin/upload-form", {
    title: "Upload Video — Admin",
    layout: "admin/layout",
    admin: req.session.admin,
  });
});

/* ---------------------------------------------
   ADMIN: UPLOAD NEW VIDEO (POST)
---------------------------------------------- */
router.post(
  "/admin/upload",
  ensureAdmin,
  upload.fields([{ name: "banner" }, { name: "video_file" }]),
  async (req, res) => {
    try {
      const { title, synopsis, category, genre, creator } = req.body;
      const banner = req.files["banner"] ? req.files["banner"][0].filename : null;
      const video_file = req.files["video_file"] ? req.files["video_file"][0].filename : null;

      await pool.query(
        `INSERT INTO videos (title, synopsis, category, genre, creator, banner, video_file, views, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [title, synopsis, category, genre, creator, banner, video_file]
      );

      res.redirect("/admin/uploads");
    } catch (err) {
      console.error("❌ Upload Error:", err);
      res.status(500).send("Database Error");
    }
  }
);

/* ---------------------------------------------
   ADMIN: EDIT VIDEO PAGE (GET)
---------------------------------------------- */
router.get("/admin/edit/:id", ensureAdmin, async (req, res) => {
  const videoId = req.params.id;

  try {
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    if (!video) return res.status(404).send("Video not found");

    const [episodes] = await pool.query(
      "SELECT * FROM video_episodes WHERE video_id = ? ORDER BY episode_number ASC",
      [videoId]
    );

    res.render("admin/edit-video", {
      title: `Edit: ${video.title}`,
      layout: "admin/layout",
      video,
      episodes,
      admin: req.session.admin,
    });
  } catch (err) {
    console.error("❌ Edit Video Error:", err);
    res.status(500).send("Database Error");
  }
});

/* ---------------------------------------------
   ADMIN: UPDATE VIDEO (POST)
---------------------------------------------- */
router.post(
  "/admin/edit/:id",
  ensureAdmin,
  upload.single("banner"),
  async (req, res) => {
    const videoId = req.params.id;
    const { title, synopsis, category, genre } = req.body;
    const banner = req.file ? req.file.filename : null;

    try {
      if (banner) {
        await pool.query(
          "UPDATE videos SET title=?, synopsis=?, category=?, genre=?, banner=?, last_updated=NOW() WHERE id=?",
          [title, synopsis, category, genre, banner, videoId]
        );
      } else {
        await pool.query(
          "UPDATE videos SET title=?, synopsis=?, category=?, genre=?, last_updated=NOW() WHERE id=?",
          [title, synopsis, category, genre, videoId]
        );
      }

      res.redirect("/admin/uploads");
    } catch (err) {
      console.error("❌ Update Video Error:", err);
      res.status(500).send("Database Error");
    }
  }
);

/* ---------------------------------------------
   ADMIN: ADD EPISODE (GET)
---------------------------------------------- */
router.get("/admin/:id/add-episode", ensureAdmin, async (req, res) => {
  const videoId = req.params.id;
  try {
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    if (!video) return res.status(404).send("Video not found");

    res.render("admin/add-episode", {
      title: `Add Episode — ${video.title}`,
      layout: "admin/layout",
      video,
      admin: req.session.admin,
    });
  } catch (err) {
    console.error("❌ Add Episode Page Error:", err);
    res.status(500).send("Database Error");
  }
});

/* ---------------------------------------------
   ADMIN: ADD EPISODE (POST)
---------------------------------------------- */
router.post(
  "/admin/:id/add-episode",
  ensureAdmin,
  upload.fields([
    { name: "episode_file" },
    { name: "episode_thumbnail" },
  ]),
  async (req, res) => {
    const videoId = req.params.id;
    const { episode_title, episode_number } = req.body;

    const episode_file = req.files["episode_file"] ? req.files["episode_file"][0].filename : null;
    const episode_thumbnail = req.files["episode_thumbnail"]
      ? req.files["episode_thumbnail"][0].filename
      : null;

    try {
      await pool.query(
        `INSERT INTO video_episodes (video_id, episode_title, episode_number, episode_file, episode_thumbnail)
         VALUES (?, ?, ?, ?, ?)`,
        [videoId, episode_title, episode_number, episode_file, episode_thumbnail]
      );

      res.redirect(`/admin/edit/${videoId}`);
    } catch (err) {
      console.error("❌ Add Episode Error:", err);
      res.status(500).send("Database Error");
    }
  }
);

/* ---------------------------------------------
   ADMIN: EDIT EPISODE (GET)
---------------------------------------------- */
router.get("/admin/edit-episode/:id", ensureAdmin, async (req, res) => {
  const episodeId = req.params.id;

  try {
    const [[episode]] = await pool.query("SELECT * FROM video_episodes WHERE id = ?", [episodeId]);
    if (!episode) return res.status(404).send("Episode not found");

    res.render("admin/edit-episode", {
      title: `Edit Episode — ${episode.episode_title}`,
      layout: "admin/layout",
      episode,
      admin: req.session.admin,
    });
  } catch (err) {
    console.error("❌ Edit Episode Error:", err);
    res.status(500).send("Database Error");
  }
});

/* ---------------------------------------------
   ADMIN: EDIT EPISODE (POST)
---------------------------------------------- */
router.post(
  "/admin/edit-episode/:id",
  ensureAdmin,
  upload.fields([
    { name: "episode_file" },
    { name: "episode_thumbnail" },
  ]),
  async (req, res) => {
    const episodeId = req.params.id;
    const { episode_title, episode_number } = req.body;

    const episode_file = req.files["episode_file"] ? req.files["episode_file"][0].filename : null;
    const episode_thumbnail = req.files["episode_thumbnail"]
      ? req.files["episode_thumbnail"][0].filename
      : null;

    try {
      const [[ep]] = await pool.query("SELECT video_id FROM video_episodes WHERE id = ?", [episodeId]);
      if (!ep) return res.status(404).send("Episode not found");

      let query = "UPDATE video_episodes SET episode_title=?, episode_number=?, last_updated=NOW()";
      const params = [episode_title, episode_number];

      if (episode_file) {
        query += ", episode_file=?";
        params.push(episode_file);
      }
      if (episode_thumbnail) {
        query += ", episode_thumbnail=?";
        params.push(episode_thumbnail);
      }

      query += " WHERE id=?";
      params.push(episodeId);

      await pool.query(query, params);
      res.redirect(`/admin/edit/${ep.video_id}`);
    } catch (err) {
      console.error("❌ Update Episode Error:", err);
      res.status(500).send("Database Error");
    }
  }
);

/* ---------------------------------------------
   ADMIN: DELETE EPISODE
---------------------------------------------- */
router.post("/admin/delete-episode/:id", ensureAdmin, async (req, res) => {
  const episodeId = req.params.id;

  try {
    const [[ep]] = await pool.query("SELECT video_id FROM video_episodes WHERE id = ?", [episodeId]);
    if (!ep) return res.status(404).send("Episode not found");

    await pool.query("DELETE FROM video_episodes WHERE id = ?", [episodeId]);

    res.redirect(`/admin/edit/${ep.video_id}`);
  } catch (err) {
    console.error("❌ Delete Episode Error:", err);
    res.status(500).send("Database Error");
  }
});


// ---------------------------
// ADMIN: DELETE VIDEO
// ---------------------------
router.post("/admin/delete/:id", ensureAdmin, async (req, res) => {
  const videoId = req.params.id;

  try {
    // Delete all episodes first to avoid FK errors
    await pool.query("DELETE FROM video_episodes WHERE video_id = ?", [videoId]);

    // Delete the video
    await pool.query("DELETE FROM videos WHERE id = ?", [videoId]);

    res.redirect("/admin/uploads");
  } catch (err) {
    console.error("❌ Delete Video Error:", err);
    res.status(500).send("Database Error");
  }
});

export default router;

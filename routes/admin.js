import express from "express";
import path from "path";
import multer from "multer";
import { ensureAdmin } from "../middleware/authMiddleware.js";
import { pool } from "../config/db.js";

const router = express.Router();

// ---------------------------
// MULTER CONFIGURATION
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder =
      file.fieldname === "banner" ? "uploads/banners" : "uploads/videos";
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------------------
// ADMIN DASHBOARD
// ---------------------------
router.get("/admin/dashboard", ensureAdmin, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );
    const [[{ totalVideos }]] = await pool.query(
      "SELECT COUNT(*) AS totalVideos FROM videos"
    );
    const [[{ totalViews }]] = await pool.query(
      "SELECT COALESCE(SUM(views),0) AS totalViews FROM videos"
    );

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
    console.error("❌ DB Error on /admin/dashboard:", err);
    res.status(500).send("Database error");
  }
});

// ---------------------------
// ADMIN: VIDEO MANAGEMENT LIST
// ---------------------------
router.get("/admin/uploads", ensureAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";
    const sort = req.query.sort || "created_at";

    const [videos] = await pool.query(
      `SELECT id, title, category, views, banner, last_updated AS created_at
       FROM videos
       WHERE title LIKE ?
       ORDER BY ${sort} DESC`,
      [`%${search}%`]
    );

    res.render("admin/uploads", {
      title: "Manage Uploads — Admin",
      layout: "admin/layout",
      admin: req.session.admin,
      videos,
      search,
      sort,
    });
  } catch (err) {
    console.error("❌ Error fetching videos:", err.sqlMessage || err.message);
    res
      .status(500)
      .send(`<pre>Database Error: ${err.sqlMessage || err.message}</pre>`);
  }
});

// ---------------------------
// ADMIN: UPLOAD FORM (GET)
// ---------------------------
router.get("/admin/upload", ensureAdmin, (req, res) => {
  res.render("admin/upload-form", {
    title: "Upload Video — Admin",
    layout: "admin/layout",
    admin: req.session.admin,
  });
});

// ---------------------------
// ADMIN: HANDLE VIDEO UPLOAD (POST)
// ---------------------------
router.post(
  "/admin/upload",
  ensureAdmin,
  upload.fields([{ name: "banner" }, { name: "video_file" }]),
  async (req, res) => {
    const { title, synopsis, category, creator } = req.body;
    const banner = req.files["banner"]
      ? req.files["banner"][0].filename
      : null;
    const video_file = req.files["video_file"]
      ? req.files["video_file"][0].filename
      : null;

    try {
      await pool.query(
        `INSERT INTO videos (title, synopsis, category, creator, banner, video_file, views)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [title, synopsis, category, creator, banner, video_file]
      );
      res.redirect("/admin/uploads");
    } catch (err) {
      console.error("❌ Upload Error:", err.sqlMessage || err.message);
      res
        .status(500)
        .send(`<pre>Database Error: ${err.sqlMessage || err.message}</pre>`);
    }
  }
);

// ---------------------------
// ADMIN: EDIT VIDEO INFO (GET)
// ---------------------------
router.get("/admin/edit/:id", ensureAdmin, async (req, res) => {
  const videoId = req.params.id;

  try {
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    if (!video) return res.status(404).send("Video not found");

    // ✅ Fetch episodes related to this video
    const [episodes] = await pool.query(
      "SELECT * FROM video_episodes WHERE video_id = ? ORDER BY episode_number ASC",
      [videoId]
    );

    res.render("admin/edit-video", {
      title: `Edit: ${video.title}`,
      layout: "admin/layout",
      video,
      episodes, // ✅ Pass episodes to the template
      admin: req.session.admin,
    });
  } catch (err) {
    console.error("❌ Error fetching video:", err);
    res.status(500).send("Database Error");
  }
});


// ---------------------------
// ADMIN: UPDATE VIDEO INFO (POST)
// ---------------------------
router.post(
  "/admin/edit/:id",
  ensureAdmin,
  upload.single("banner"),
  async (req, res) => {
    const videoId = req.params.id;
    const { title, synopsis, category } = req.body;
    const banner = req.file ? req.file.filename : null;

    try {
      if (banner) {
        await pool.query(
          "UPDATE videos SET title=?, synopsis=?, category=?, banner=?, last_updated=NOW() WHERE id=?",
          [title, synopsis, category, banner, videoId]
        );
      } else {
        await pool.query(
          "UPDATE videos SET title=?, synopsis=?, category=?, last_updated=NOW() WHERE id=?",
          [title, synopsis, category, videoId]
        );
      }

      res.redirect("/admin/uploads");
    } catch (err) {
      console.error("❌ Update Error:", err);
      res.status(500).send("Database Error");
    }
  }
);

// ---------------------------
// ADMIN: ADD EPISODE (GET)
// ---------------------------
router.get("/admin/:id/add-episode", ensureAdmin, async (req, res) => {
  const videoId = req.params.id;

  try {
    const [[video]] = await pool.query("SELECT * FROM videos WHERE id = ?", [
      videoId,
    ]);
    if (!video) return res.status(404).send("Video not found");

    res.render("admin/add-episode", {
      title: `Add Episode — ${video.title}`,
      layout: "admin/layout",
      video,
      admin: req.session.admin,
    });
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).send("Database Error");
  }
});

// ---------------------------
// ADMIN: ADD EPISODE (POST)
// ---------------------------
router.post(
  "/admin/:id/add-episode",
  ensureAdmin,
  upload.single("episode_file"),
  async (req, res) => {
    const videoId = req.params.id;
    const { episode_title } = req.body;
    const episode_file = req.file ? req.file.filename : null;

    try {
      const [[{ count }]] = await pool.query(
        "SELECT COUNT(*) AS count FROM video_episodes WHERE video_id=?",
        [videoId]
      );
      const episodeNumber = count + 1;

      await pool.query(
        "INSERT INTO video_episodes (video_id, episode_title, episode_file, episode_number) VALUES (?, ?, ?, ?)",
        [
          videoId,
          episode_title || `Episode ${episodeNumber}`,
          episode_file,
          episodeNumber,
        ]
      );

      res.redirect("/admin/uploads");
    } catch (err) {
      console.error("❌ Add Episode Error:", err);
      res.status(500).send("Database Error");
    }
  }
);

export default router;

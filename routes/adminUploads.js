import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";
import { ensureAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration for banners and videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "banner") cb(null, "uploads/banners");
    else if (file.fieldname === "videoFile") cb(null, "uploads/videos");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Upload page (GET)
router.get("/admin/uploads", ensureAdmin, (req, res) => {
  res.render("admin/uploads", {
    layout: "admin/layout",
    title: "Upload New Content",
    session: req.session,
  });
});

// Handle form (POST)
router.post(
  "/admin/uploads",
  ensureAdmin,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "videoFile", maxCount: 1 },
  ]),
  async (req, res) => {
    const { title, synopsis, category } = req.body;
    const banner = req.files["banner"]?.[0]?.filename || null;
    const videoFile = req.files["videoFile"]?.[0]?.filename || null;
    const creator = req.session.admin?.username || "Unknown";

    try {
      await pool.query(
        "INSERT INTO videos (title, synopsis, category, creator, banner, video_file) VALUES (?, ?, ?, ?, ?, ?)",
        [title, synopsis, category, creator, banner, videoFile]
      );
      res.redirect("/admin/dashboard");
    } catch (err) {
      console.error(err);
      res.status(500).send("Database Error");
    }
  }
);

export default router;

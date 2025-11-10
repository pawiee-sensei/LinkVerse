import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// Homepage route
router.get("/", async (req, res) => {
  try {
    const [videos] = await pool.query(
      "SELECT id, title, synopsis, category, banner, views, last_updated FROM videos ORDER BY last_updated DESC"
    );

    res.render("home", {
      title: "Home — LinkVerse",
      layout: false, // user pages don't use admin layout
      videos,
      session: req.session,
    });
  } catch (err) {
    console.error("❌ Error fetching videos:", err);
    res.status(500).send("Database Error");
  }
});

export default router;

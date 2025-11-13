import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

/* ============================================================
   REUSABLE FUNCTION FOR CATEGORY PAGES (WITH SEARCH + PAGINATION)
   ============================================================ */
async function loadCategoryPage(category, pageName, req, res) {
  const pageNum = parseInt(req.query.page) || 1;
  const search = req.query.q || "";
  const limit = 12;
  const offset = (pageNum - 1) * limit;

  try {
    let videos = [];
    let total = 0;

    if (search.trim() !== "") {
      // 🔎 SEARCH FILTER INSIDE CATEGORY
      const query = `
        SELECT id, title, synopsis, category, genre, banner, views, last_updated
        FROM videos
        WHERE category = ?
        AND (title LIKE ? OR genre LIKE ? OR category LIKE ?)
        ORDER BY last_updated DESC
        LIMIT ? OFFSET ?
      `;

      const params = [
        category,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        limit,
        offset,
      ];

      videos = (await pool.query(query, params))[0];

      // Count matching items
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM videos
        WHERE category = ?
        AND (title LIKE ? OR genre LIKE ? OR category LIKE ?)
      `;

      const countParams = [
        category,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
      ];

      total = (await pool.query(countQuery, countParams))[0][0].total;

    } else {
      // NORMAL CATEGORY LIST (no search)
      videos = (
        await pool.query(
          `SELECT id, title, synopsis, category, genre, banner, views, last_updated
           FROM videos
           WHERE category = ?
           ORDER BY last_updated DESC
           LIMIT ? OFFSET ?`,
          [category, limit, offset]
        )
      )[0];

      total = (
        await pool.query(
          `SELECT COUNT(*) AS total FROM videos WHERE category = ?`,
          [category]
        )
      )[0][0].total;
    }

    const totalPages = Math.ceil(total / limit);

    res.render("categories/list", {
      title: `${category} · LinkVerse`,
      layout: false,
      videos,
      pageNum,
      totalPages,
      session: req.session,
      page: pageName,
      search,
      category,
    });

  } catch (err) {
    console.error("❌ Category Page Error:", err);
    res.status(500).send("Database Error");
  }
}

/* ============================================================
   HOME PAGE — WITH SEARCH
   ============================================================ */
router.get("/", async (req, res) => {
  const search = req.query.q || "";

  try {
    let videos = [];

    if (search.trim() !== "") {
      // SEARCH MODE
      videos = (
        await pool.query(
          `SELECT id, title, synopsis, category, genre, banner, views, last_updated
           FROM videos
           WHERE title LIKE ?
           OR genre LIKE ?
           OR category LIKE ?
           ORDER BY last_updated DESC`,
          [`%${search}%`, `%${search}%`, `%${search}%`]
        )
      )[0];

    } else {
      // NORMAL HOME
      videos = (
        await pool.query(
          `SELECT id, title, synopsis, category, genre, banner, views, last_updated
           FROM videos
           ORDER BY last_updated DESC`
        )
      )[0];
    }

    res.render("home", {
      title: "Home — LinkVerse",
      layout: false,
      videos,
      session: req.session,
      page: "home",
      search,
    });

  } catch (err) {
    console.error("❌ Home Page Error:", err);
    res.status(500).send("Database Error");
  }
});

/* ============================================================
   CATEGORY ROUTES
   ============================================================ */
router.get("/anime", async (req, res) => {
  await loadCategoryPage("Anime", "anime", req, res);
});

router.get("/drama", async (req, res) => {
  await loadCategoryPage("Drama", "drama", req, res);
});

router.get("/movies", async (req, res) => {
  await loadCategoryPage("Movie", "movies", req, res);
});

export default router;

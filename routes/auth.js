// routes/auth.js
import express from "express";
import {
  registerUser,
  loginUser,
  loginAdmin,
  logout,
  updatePassword,
  updateUsername,
  updateEmail,
  updateProfilePicture,
  updateCoverPhoto,
  updateBio
} from "../controllers/authController.js";

import { redirectIfAuthenticated, ensureUser } from "../middleware/authMiddleware.js";
import { pool } from "../config/db.js";

import multer from "multer";
import path from "path";

const router = express.Router();

/* =============================================
   MULTER — Upload profile + cover photos
============================================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "profile_pic") return cb(null, "uploads/profile");
      if (file.fieldname === "cover_pic") return cb(null, "uploads/covers");
      cb(null, "uploads");
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  })
});

/* =============================================
                REGISTER
============================================= */
router.get("/register", redirectIfAuthenticated, (req, res) =>
  res.render("register", {
    title: "Register",
    message: null,
    session: req.session,
    page: "register",
  })
);

router.post("/register", registerUser);

/* =============================================
                LOGIN
============================================= */
router.get("/login", redirectIfAuthenticated, (req, res) =>
  res.render("login", {
    title: "Login",
    message: null,
    session: req.session,
    page: "login",
  })
);

router.post("/login", loginUser);

/* =============================================
          MY ACCOUNT PAGE (Profile + Settings)
============================================= */
router.get("/account", ensureUser, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Total watch time
    const [[{ totalSeconds }]] = await pool.query(
      "SELECT SUM(position) AS totalSeconds FROM history WHERE user_id = ?",
      [userId]
    );

    const totalWatchTime = Math.floor((totalSeconds || 0) / 3600);

    // User profile info
    const [[user]] = await pool.query(
      `SELECT username, email, profile_pic, cover_pic, bio
       FROM users
       WHERE id = ?`,
      [userId]
    );

    // Sync session (makes UI update instantly)
    req.session.user.username = user.username;
    req.session.user.email = user.email;
    req.session.user.profile_pic = user.profile_pic;
    req.session.user.cover_pic = user.cover_pic;
    req.session.user.bio = user.bio;

    // Render with password feedback
    res.render("settings/index", {
      title: "My Account",
      session: req.session,
      user,
      totalWatchTime,
      passwordError: req.query.passwordError || null,
      passwordSuccess: req.query.passwordSuccess || null
    });

  } catch (err) {
    console.error("❌ Account Page Error:", err);
    res.status(500).send("Database Error");
  }
});

/* =============================================
      UPDATE PROFILE PHOTO (PROFILE PIC)
============================================= */
router.post(
  "/account/update-profile-picture",
  ensureUser,
  upload.single("profile_pic"),
  updateProfilePicture
);

/* =============================================
            UPDATE COVER PHOTO
============================================= */
router.post(
  "/account/update-cover-photo",
  ensureUser,
  upload.single("cover_pic"),
  updateCoverPhoto
);

/* =============================================
                  UPDATE BIO
============================================= */
router.post("/account/update-bio", ensureUser, updateBio);

/* =============================================
         UPDATE USERNAME INLINE
============================================= */
router.post("/account/update-username", ensureUser, updateUsername);

/* =============================================
           UPDATE EMAIL INLINE
============================================= */
router.post("/account/update-email", ensureUser, updateEmail);

/* =============================================
              CHANGE PASSWORD
============================================= */
router.post("/account/update-password", ensureUser, updatePassword);

/* =============================================
               ADMIN LOGIN
============================================= */
router.get("/admin/login", (req, res) =>
  res.render("admin/login", {
    title: "Admin Login",
    message: null,
    session: req.session,
  })
);

router.post("/admin/login", loginAdmin);

/* =============================================
                 LOGOUT
============================================= */
router.get("/logout", logout);

export default router;

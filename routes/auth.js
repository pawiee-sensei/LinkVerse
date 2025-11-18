// routes/auth.js
import express from "express";
import {
  registerUser,
  loginUser,
  loginAdmin,
  logout,
  updatePassword,
  updateUsername,
  updateEmail
} from "../controllers/authController.js";

import { redirectIfAuthenticated, ensureUser } from "../middleware/authMiddleware.js";
import { pool } from "../config/db.js";   // ✅ FIX: required for watch time

const router = express.Router();

/* ============================
        REGISTER
============================ */
router.get("/register", redirectIfAuthenticated, (req, res) =>
  res.render("register", {
    title: "Register",
    message: null,
    session: req.session,
    page: "register",
  })
);

router.post("/register", registerUser);

/* ============================
        LOGIN
============================ */
router.get("/login", redirectIfAuthenticated, (req, res) =>
  res.render("login", {
    title: "Login",
    message: null,
    session: req.session,
    page: "login",
  })
);

router.post("/login", loginUser);

/* ============================
     ACCOUNT SETTINGS PAGE
============================ */
router.get("/settings", ensureUser, async (req, res) => {
  const userId = req.session.user.id;

  // Total watch time
  const [[{ totalSeconds }]] = await pool.query(
    "SELECT SUM(position) AS totalSeconds FROM history WHERE user_id = ?",
    [userId]
  );

  const totalWatchTime = Math.floor((totalSeconds || 0) / 3600); // convert → hours

  res.render("settings/index", {
    title: "Account Settings",
    session: req.session,
    totalWatchTime,
    messageUsername: null,
    messageEmail: null,
    messagePassword: null
  });
});

/* ============================
      CHANGE PASSWORD
============================ */
router.post("/settings/password", ensureUser, updatePassword);

/* ============================
      UPDATE USERNAME INLINE
============================ */
router.post("/settings/update-username", ensureUser, updateUsername);

/* ============================
        UPDATE EMAIL INLINE
============================ */
router.post("/settings/update-email", ensureUser, updateEmail);

/* ============================
        ADMIN LOGIN
============================ */
router.get("/admin/login", (req, res) =>
  res.render("admin/login", {
    title: "Admin Login",
    message: null,
    session: req.session,
  })
);

router.post("/admin/login", loginAdmin);

/* ============================
          LOGOUT
============================ */
router.get("/logout", logout);

export default router;

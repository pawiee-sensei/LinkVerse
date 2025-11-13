import express from "express";
import {
  registerUser,
  loginUser,
  loginAdmin,
  logout,
} from "../controllers/authController.js";
import { redirectIfAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================
// USER ROUTES
// =====================

// REGISTER PAGE
router.get("/register", redirectIfAuthenticated, (req, res) =>
  res.render("register", {
    title: "Register",
    message: null,
    session: req.session,
    page: "register"
  })
);
router.post("/register", registerUser);

// LOGIN PAGE
router.get("/login", redirectIfAuthenticated, (req, res) =>
  res.render("login", {
    title: "Login",
    message: null,
    session: req.session,
    page: "login"
  })
);
router.post("/login", loginUser);

// =====================
// ADMIN ROUTES
// =====================

// ADMIN LOGIN PAGE
router.get("/admin/login", (req, res) =>
  res.render("admin/login", { 
    title: "Admin Login", 
    message: null,
    session: req.session,
    page: null  // ← FIX so header won't load user navbar
  })
);
router.post("/admin/login", loginAdmin);

// =====================
// LOGOUT
// =====================
router.get("/logout", logout);

export default router;

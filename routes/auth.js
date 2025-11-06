import express from "express";
import {
  registerUser,
  loginUser,
  loginAdmin,
  logout,
} from "../controllers/authController.js";
import { redirectIfAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// USER ROUTES
router.get("/register", redirectIfAuthenticated, (req, res) =>
  res.render("register", { title: "Register", message: null })
);
router.post("/register", registerUser);

router.get("/login", redirectIfAuthenticated, (req, res) =>
  res.render("login", { title: "Login", message: null })
);
router.post("/login", loginUser);

// ADMIN ROUTES
router.get("/admin/login", (req, res) =>
  res.render("admin/login", { title: "Admin Login", message: null })
);
router.post("/admin/login", loginAdmin);

// LOGOUT (shared)
router.get("/logout", logout);

export default router;

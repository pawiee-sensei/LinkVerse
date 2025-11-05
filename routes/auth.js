// routes/auth.js
import express from "express";
import {
  showRegister,
  registerUser,
  showLogin,
  loginUser,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

// Register routes
router.get("/register", showRegister);
router.post("/register", registerUser);

// Login routes
router.get("/login", showLogin);
router.post("/login", loginUser);

// Logout route
router.get("/logout", logoutUser);

export default router;

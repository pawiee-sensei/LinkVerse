// controllers/authController.js
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

// -------------------- REGISTER -------------------- //
export const showRegister = (req, res) => {
  res.render("register", { title: "Register — LinkVerse", message: null });
};

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.render("register", { message: "All fields are required." });
  }

  try {
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.render("register", { message: "Email already registered." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [
      username,
      email,
      hashed,
    ]);

    res.redirect("/login");
  } catch (error) {
    console.error("Register error:", error);
    res.render("register", { message: "Something went wrong. Try again." });
  }
};

// -------------------- LOGIN -------------------- //
export const showLogin = (req, res) => {
  res.render("login", { title: "Login — LinkVerse", message: null });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("login", { message: "All fields are required." });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.render("login", { message: "Invalid credentials." });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("login", { message: "Invalid credentials." });
    }

    // Save session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", { message: "Something went wrong. Try again." });
  }
};

// -------------------- LOGOUT -------------------- //
export const logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

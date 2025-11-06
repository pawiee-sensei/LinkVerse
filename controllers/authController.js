import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

// ---------- USER REGISTER ----------
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.render("register", { title: "Register", message: "Email already exists!" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed]
    );
    res.redirect("/login");
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", { title: "Register", message: "Something went wrong." });
  }
};

// ---------- USER LOGIN ----------
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) {
      return res.render("login", { title: "Login", message: "User not found." });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render("login", { title: "Login", message: "Incorrect password." });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    res.redirect("/"); // later we’ll redirect to user home/dashboard
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { title: "Login", message: "Login failed." });
  }
};

// ---------- ADMIN LOGIN ----------
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
    if (!rows.length) {
      return res.render("admin/login", { title: "Admin Login", message: "Admin not found." });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.render("admin/login", { title: "Admin Login", message: "Wrong password." });
    }

    req.session.admin = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    };
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    res.render("admin/login", { title: "Admin Login", message: "Login failed." });
  }
};

// ---------- LOGOUT ----------
export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
};

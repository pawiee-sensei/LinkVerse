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
    // Step 1: Look for admin by email
    const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.render("admin/login", {
        title: "Admin Login",
        message: "Admin not found.",
      });
    }

    // Step 2: Get the first admin record
    const admin = rows[0];
    console.log("Admin found:", admin.email); // safe now ✅

    // Step 3: Compare the hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log("Password match?", isMatch);

    if (!isMatch) {
      return res.render("admin/login", {
        title: "Admin Login",
        message: "Wrong password.",
      });
    }

    // Step 4: Save session
    req.session.admin = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    };

    console.log("✅ Admin logged in:", req.session.admin.username);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    res.render("admin/login", {
      title: "Admin Login",
      message: "Login failed. Try again.",
    });
  }
};


// ---------- LOGOUT ----------
export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
};

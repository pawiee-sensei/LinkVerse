import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

/* ============================
        REGISTER
============================ */
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    if (existing.length) {
      return res.render("register", {
        title: "Register",
        message: "Email already exists!",
        session: req.session
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed]
    );

    res.redirect("/login");
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", {
      title: "Register",
      message: "Something went wrong.",
      session: req.session
    });
  }
};

/* ============================
        LOGIN USER
============================ */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    if (!rows.length) {
      return res.render("login", {
        title: "Login",
        message: "User not found.",
        session: req.session
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("login", {
        title: "Login",
        message: "Incorrect password.",
        session: req.session
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);

    res.render("login", {
      title: "Login",
      message: "Login failed.",
      session: req.session
    });
  }
};

/* ============================
        ADMIN LOGIN
============================ */
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);

    if (!rows.length) {
      return res.render("admin/login", {
        title: "Admin Login",
        message: "Admin not found.",
      });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render("admin/login", {
        title: "Admin Login",
        message: "Wrong password.",
      });
    }

    req.session.admin = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    };

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);

    res.render("admin/login", {
      title: "Admin Login",
      message: "Error logging in.",
    });
  }
};

/* ============================
          LOGOUT
============================ */
export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
};

/* ============================
      CHANGE PASSWORD
============================ */
export const updatePassword = async (req, res) => {
  const userId = req.session.user.id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  try {
    const [[user]] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.redirect("/settings?passwordError=Incorrect old password");
    }

    if (newPassword !== confirmPassword) {
      return res.redirect("/settings?passwordError=Passwords do not match");
    }

    if (newPassword.length < 6) {
      return res.redirect("/settings?passwordError=Password too short");
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      userId,
    ]);

    res.redirect("/settings?passwordSuccess=1");
  } catch (err) {
    console.error("Password update error:", err);
    res.redirect("/settings?passwordError=Something went wrong");
  }
};

/* ============================
      UPDATE USERNAME INLINE
============================ */
export const updateUsername = async (req, res) => {
  const userId = req.session.user.id;
  const { newUsername } = req.body;

  try {
    if (!newUsername || newUsername.length < 3) {
      return res.redirect("/settings?usernameError=Invalid username");
    }

    const [[exists]] = await pool.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [newUsername, userId]
    );

    if (exists) {
      return res.redirect("/settings?usernameError=Username already exists");
    }

    await pool.query("UPDATE users SET username = ? WHERE id = ?", [
      newUsername,
      userId,
    ]);

    req.session.user.username = newUsername;

    res.redirect("/settings?usernameSuccess=1");
  } catch (err) {
    console.error("Username update error:", err);
    res.redirect("/settings?usernameError=Something went wrong");
  }
};

/* ============================
        UPDATE EMAIL INLINE
============================ */
export const updateEmail = async (req, res) => {
  const userId = req.session.user.id;
  const { newEmail } = req.body;

  try {
    if (!newEmail || !newEmail.includes("@")) {
      return res.redirect("/settings?emailError=Invalid email format");
    }

    const [[exists]] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [newEmail, userId]
    );

    if (exists) {
      return res.redirect("/settings?emailError=Email already in use");
    }

    await pool.query("UPDATE users SET email = ? WHERE id = ?", [
      newEmail,
      userId,
    ]);

    req.session.user.email = newEmail;

    res.redirect("/settings?emailSuccess=1");
  } catch (err) {
    console.error("Email update error:", err);
    res.redirect("/settings?emailError=Something went wrong");
  }
};

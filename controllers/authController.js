import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

/* ============================
        REGISTER
============================= */
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res.render("register", {
        title: "Register",
        message: "Email already exists!",
        session: req.session,
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
      session: req.session,
    });
  }
};

/* ============================
        LOGIN USER
============================= */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.render("login", {
        title: "Login",
        message: "User not found.",
        session: req.session,
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("login", {
        title: "Login",
        message: "Incorrect password.",
        session: req.session,
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      profile_pic: user.profile_pic,
      cover_pic: user.cover_pic,
      bio: user.bio,
      created_at: user.created_at
    };

    res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", {
      title: "Login",
      message: "Login failed.",
      session: req.session,
    });
  }
};

/* ============================
        ADMIN LOGIN
============================= */
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [
      email,
    ]);

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
      message: "Login failed.",
    });
  }
};

/* ============================
          LOGOUT
============================= */
export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
};

/* ============================
      CHANGE PASSWORD (FIXED)
============================= */
export const updatePassword = async (req, res) => {
  const userId = req.session.user.id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  try {
    const [[user]] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      return res.redirect("/account?passwordError=User not found");
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.redirect("/account?passwordError=Incorrect old password");
    }

    if (newPassword !== confirmPassword) {
      return res.redirect("/account?passwordError=Passwords do not match");
    }

    if (newPassword.length < 6) {
      return res.redirect("/account?passwordError=Password too short");
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashed, userId]
    );

    if (result.affectedRows === 0) {
      return res.redirect("/account?passwordError=Update failed");
    }

    // Force user to re-login after changing password
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      return res.redirect("/login?passwordChanged=1");
    });

  } catch (err) {
    console.error("Password update error:", err);
    return res.redirect("/account?passwordError=Server error");
  }
};


/* ============================
      UPDATE USERNAME
============================= */
export const updateUsername = async (req, res) => {
  const userId = req.session.user.id;
  const { newUsername } = req.body;

  try {
    if (!newUsername || newUsername.length < 3) {
      return res.redirect("/account?usernameError=Invalid username");
    }

    const [[exists]] = await pool.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [newUsername, userId]
    );

    if (exists) {
      return res.redirect("/account?usernameError=Username already exists");
    }

    await pool.query("UPDATE users SET username = ? WHERE id = ?", [
      newUsername,
      userId,
    ]);

    req.session.user.username = newUsername;

    res.redirect("/account?usernameSuccess=1");
  } catch (err) {
    console.error("Username update error:", err);
    res.redirect("/account?usernameError=Something went wrong");
  }
};

/* ============================
        UPDATE EMAIL
============================= */
export const updateEmail = async (req, res) => {
  const userId = req.session.user.id;
  const { newEmail } = req.body;

  try {
    if (!newEmail || !newEmail.includes("@")) {
      return res.redirect("/account?emailError=Invalid email");
    }

    const [[exists]] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [newEmail, userId]
    );

    if (exists) {
      return res.redirect("/account?emailError=Email already used");
    }

    await pool.query("UPDATE users SET email = ? WHERE id = ?", [
      newEmail,
      userId,
    ]);

    req.session.user.email = newEmail;

    res.redirect("/account?emailSuccess=1");
  } catch (err) {
    console.error("Email update error:", err);
    res.redirect("/account?emailError=Something went wrong");
  }
};

/* ============================
         UPDATE BIO
============================= */
export const updateBio = async (req, res) => {
  const userId = req.session.user.id;
  const { bio } = req.body;

  try {
    await pool.query("UPDATE users SET bio = ? WHERE id = ?", [bio, userId]);

    req.session.user.bio = bio;

    res.redirect("/account?bioSuccess=1");
  } catch (err) {
    console.error("Bio update error:", err);
    res.redirect("/account?bioError=Something went wrong");
  }
};

/* ============================
     UPDATE PROFILE PICTURE
============================= */
export const updateProfilePicture = async (req, res) => {
  const userId = req.session.user.id;

  if (!req.file)
    return res.redirect("/account?profilePicError=No file uploaded");

  try {
    await pool.query("UPDATE users SET profile_pic = ? WHERE id = ?", [
      req.file.filename,
      userId,
    ]);

    req.session.user.profile_pic = req.file.filename;

    res.redirect("/account?profilePicSuccess=1");
  } catch (err) {
    console.error("Profile picture update error:", err);
    res.redirect("/account?profilePicError=Something went wrong");
  }
};

/* ============================
        UPDATE COVER PHOTO
============================= */
export const updateCoverPhoto = async (req, res) => {
  const userId = req.session.user.id;

  if (!req.file)
    return res.redirect("/account?coverError=No file uploaded");

  try {
    await pool.query("UPDATE users SET cover_pic = ? WHERE id = ?", [
      req.file.filename,
      userId,
    ]);

    req.session.user.cover_pic = req.file.filename;

    res.redirect("/account?coverSuccess=1");
  } catch (err) {
    console.error("Cover update error:", err);
    res.redirect("/account?coverError=Something went wrong");
  }
};

import express from "express";
import { ensureAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/admin/dashboard", ensureAdmin, (req, res) => {
  res.send(`
    <div style="background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;">
      <h1>🎬 Welcome, Admin ${req.session.admin.username}</h1>
      <p>Email: ${req.session.admin.email}</p>
      <a href="/logout" style="color:red;">Logout</a>
    </div>
  `);
});

export default router;

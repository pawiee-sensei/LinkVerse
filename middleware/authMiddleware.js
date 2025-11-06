// middleware/authMiddleware.js

// Protect normal user routes
export function ensureUser(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Protect admin routes
export function ensureAdmin(req, res, next) {
  if (req.session.admin) {
    return next();
  }
  res.redirect("/admin/login");
}

// Optional: prevent logged-in users from accessing login/register again
export function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) return res.redirect("/");
  next();
}

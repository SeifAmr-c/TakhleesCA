export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ ok: false, message: "Authentication required." });
  }
  return next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ ok: false, message: "Authentication required." });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Admin privileges required." });
  }
  return next();
};

export const requireCompany = (req, res, next) => {
  if (!req.session || !req.session.companyId || req.session.role !== "company") {
    return res.status(401).json({ ok: false, message: "Company sign-in required." });
  }
  return next();
};

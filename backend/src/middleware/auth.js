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

/* A signed-in client User only — admins and companies are rejected. Used
   by client-facing features (e.g. the assistant chatbot) that must not be
   reachable by the admin or company audiences even though they hold a
   valid session. */
export const requireClient = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ ok: false, message: "Authentication required." });
  }
  if (req.session.role !== "client") {
    return res.status(403).json({ ok: false, message: "This feature is available to clients only." });
  }
  return next();
};

/* Either a signed-in User (client/admin) or a signed-in Company is enough.
   Use this for endpoints both audiences legitimately read — e.g. the
   application list, where clients see their own and companies see theirs. */
export const requireSession = (req, res, next) => {
  if (req.session && (req.session.userId || req.session.companyId)) {
    return next();
  }
  return res.status(401).json({ ok: false, message: "Authentication required." });
};

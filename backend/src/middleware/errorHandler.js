export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Server error";
  res.status(status).json({ ok: false, error: message });
};

import db from "../../Database/connection.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const userSelectSql = `
  SELECT
    u.UserID,
    u.FirstName,
    u.LastName,
    u.Email,
    u.Password,
    u.Type,
    c.PhoneNumber,
    c.NationalID,
    c.Address,
    a.LastLogin
  FROM User u
  LEFT JOIN Client c ON u.UserID = c.ClientID
  LEFT JOIN Admin a ON u.UserID = a.AdminID
`;

const sanitizeUser = (row) => {
  if (!row) return null;
  return {
    UserID: row.UserID,
    FirstName: row.FirstName,
    LastName: row.LastName,
    Email: row.Email,
    Type: row.Type,
    PhoneNumber: row.PhoneNumber != null ? row.PhoneNumber : null,
    NationalID: row.NationalID != null ? row.NationalID : null,
    Address: row.Address ?? null,
    LastLogin: row.LastLogin ?? null,
  };
};

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

// ------------------------------------
// REGISTER
// body: { FirstName, LastName, Email, Password, Type?, PhoneNumber?, NationalID?, Address? }
// Type: 'C' (client, default) or 'A' (admin). Client requires PhoneNumber, NationalID, Address per schema.
// ------------------------------------
export const register = async (req, res, next) => {
  try {
    const FirstName = String(req.body.FirstName ?? "").trim();
    const LastName = String(req.body.LastName ?? "").trim();
    const Email = normalizeEmail(req.body.Email);
    const Password = String(req.body.Password ?? "");
    const Type = String(req.body.Type ?? "C").toUpperCase().slice(0, 1);

    if (!FirstName || FirstName.length < 2) {
      return res.status(400).json({ ok: false, message: "First name is required." });
    }
    if (!LastName || LastName.length < 2) {
      return res.status(400).json({ ok: false, message: "Last name is required." });
    }
    if (!Email || !Email.includes("@")) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    if (!Password || Password.length < 4) {
      return res.status(400).json({ ok: false, message: "Password must be at least 4 characters." });
    }
    if (Type !== "C" && Type !== "A") {
      return res.status(400).json({ ok: false, message: 'Type must be "C" (client) or "A" (admin).' });
    }

    let PhoneNumber = null;
    let NationalID = null;
    let Address = null;

    if (Type === "C") {
      const phoneRaw = req.body.PhoneNumber;
      const nidRaw = req.body.NationalID;
      Address = String(req.body.Address ?? "").trim();

      if (phoneRaw === undefined || phoneRaw === null || String(phoneRaw).trim() === "") {
        return res.status(400).json({ ok: false, message: "Phone number is required for clients." });
      }
      if (nidRaw === undefined || nidRaw === null || String(nidRaw).trim() === "") {
        return res.status(400).json({ ok: false, message: "National ID is required for clients." });
      }
      if (!Address) {
        return res.status(400).json({ ok: false, message: "Address is required for clients." });
      }

      const phoneDigits = String(phoneRaw).replace(/\D/g, "");
      PhoneNumber = parseInt(phoneDigits, 10);
      NationalID = parseInt(String(nidRaw).replace(/\D/g, ""), 10);

      if (!Number.isFinite(PhoneNumber)) {
        return res.status(400).json({ ok: false, message: "Invalid phone number." });
      }
      if (!Number.isFinite(NationalID)) {
        return res.status(400).json({ ok: false, message: "Invalid national ID." });
      }
    }

    const existing = await runQuery("SELECT UserID FROM User WHERE Email = ? LIMIT 1", [Email]);
    if (existing.length) {
      return res.status(409).json({ ok: false, message: "Email already exists." });
    }

    const insertRes = await runQuery(
      "INSERT INTO User (FirstName, LastName, Email, Password, Type) VALUES (?, ?, ?, ?, ?)",
      [FirstName, LastName, Email, Password, Type]
    );

    const userId = insertRes.insertId;

    if (Type === "C") {
      await runQuery(
        "INSERT INTO Client (ClientID, PhoneNumber, NationalID, Address) VALUES (?, ?, ?, ?)",
        [userId, PhoneNumber, NationalID, Address]
      );
    } else {
      await runQuery("INSERT INTO Admin (AdminID, LastLogin) VALUES (?, NOW())", [userId]);
    }

    const userRows = await runQuery(`${userSelectSql} WHERE u.UserID = ? LIMIT 1`, [userId]);

    return res.status(201).json({
      ok: true,
      message: "Registered successfully.",
      data: { user: sanitizeUser(userRows[0]) },
    });
  } catch (err) {
    return next(err);
  }
};

// ------------------------------------
// LOGIN
// body: { Email, Password }
// ------------------------------------
export const login = async (req, res, next) => {
  try {
    const Email = normalizeEmail(req.body.Email);
    const Password = String(req.body.Password ?? "");

    if (!Email || !Email.includes("@")) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    if (!Password) {
      return res.status(400).json({ ok: false, message: "Password is required." });
    }

    const rows = await runQuery(`${userSelectSql} WHERE u.Email = ? LIMIT 1`, [Email]);
    if (!rows.length) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    const userRow = rows[0];

    if (userRow.Password !== Password) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    return res.status(200).json({
      ok: true,
      message: "Logged in successfully.",
      data: { user: sanitizeUser(userRow) },
    });
  } catch (err) {
    return next(err);
  }
};

// ------------------------------------
// ME
// GET /auth/me/:UserID  (or query ?UserID=)
// ------------------------------------
export const me = async (req, res, next) => {
  try {
    const userId = Number(req.params.UserID ?? req.query.UserID);

    if (!userId) {
      return res.status(400).json({ ok: false, message: "Invalid UserID." });
    }

    const rows = await runQuery(`${userSelectSql} WHERE u.UserID = ? LIMIT 1`, [userId]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    return res.status(200).json({
      ok: true,
      data: { user: sanitizeUser(rows[0]) },
    });
  } catch (err) {
    return next(err);
  }
};

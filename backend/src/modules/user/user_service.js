import db from '../../Database/connection.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
};

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const userSelectSql = `
  SELECT
    u.UserID, u.FirstName, u.LastName, u.Email, u.Password, u.Type,
    c.PhoneNumber, c.NationalID, c.Address,
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
    PhoneNumber: row.PhoneNumber ?? null,
    NationalID: row.NationalID ?? null,
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

// ── getUser ──────────────────────────────────────────────
export const getUser = (req, res) => {
    const raw = req.query.UserID;

    let user_id;
    if (raw === undefined || raw === null || raw === '') {
        user_id = '%';
    } else if (raw === '%') {
        user_id = '%';
    } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) {
            return res.status(400).json({
                error: 'Invalid UserID. Use a positive integer or %.',
            });
        }
        user_id = String(n);
    }

    const sql =
        'SELECT * FROM (User LEFT JOIN Client ON User.UserID = Client.ClientID) LEFT JOIN Admin ON User.UserID = Admin.AdminID WHERE User.UserID LIKE ?';

    db.query(sql, [user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

// ── deleteUser ───────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
    const UserID = req.query.UserID;
    if (UserID === undefined || UserID === null || String(UserID).trim() === '') {
        return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(UserID);
    if (!Number.isFinite(uid)) {
        return res.status(400).json({ error: 'Invalid UserID' });
    }

    const existing = await runQuery("SELECT UserID FROM User WHERE UserID = ?", [uid]);
    if (existing.length === 0) {
        return res.status(404).json({
            "Status": "Error",
            "Message": "Record Id [" + uid + "] does not exist or has already been deleted."
        });
    }

    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM Client WHERE ClientID = ?", [uid]);
        await conn.query("DELETE FROM Admin WHERE AdminID = ?", [uid]);
        await conn.query("DELETE FROM User WHERE UserID = ?", [uid]);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        return next(err);
    } finally {
        conn.release();
    }

    res.status(200).json({ "Status": "OK", "Message": "UserID [" + uid + "] deleted successfully" });
    console.log("Delete request processed for UserID [" + uid + "]");
};

// ── canDelete (frontend gates the delete button on this flag) ──
export const canDelete = async (req, res, next) => {
    try {
        const uid = req.session.userId;
        const rows = await runQuery(
            "SELECT COUNT(*) AS c FROM application WHERE ClientID = ? AND Status IN ('Pending', 'In Progress')",
            [uid]
        );
        return res.json({ ok: true, hasActiveApplications: Number(rows[0].c) > 0 });
    } catch (err) {
        return next(err);
    }
};

// ── deleteProfile (session user self-deletes) ────────────
export const deleteProfile = async (req, res, next) => {
    const uid = req.session.userId;

    try {
        const active = await runQuery(
            "SELECT COUNT(*) AS c FROM application WHERE ClientID = ? AND Status IN ('Pending', 'In Progress')",
            [uid]
        );
        if (Number(active[0].c) > 0) {
            return res.status(400).json({ ok: false, message: "Cannot delete account if there is an active application." });
        }

        const conn = await db.pool.getConnection();
        try {
            await conn.beginTransaction();
            /* Clear out everything that FKs into Client/User before
               removing the parent rows. Support tickets are cheap
               correspondence — delete them outright. Completed
               applications are historical financial records — anonymize
               by nulling ClientID instead of dropping the row. Active
               applications are already ruled out by the guard above. */
            await conn.query("DELETE FROM supportticket WHERE ClientID = ?", [uid]);
            await conn.query("UPDATE application SET ClientID = NULL WHERE ClientID = ?", [uid]);
            await conn.query("DELETE FROM Client WHERE ClientID = ?", [uid]);
            await conn.query("DELETE FROM Admin WHERE AdminID = ?", [uid]);
            await conn.query("DELETE FROM User WHERE UserID = ?", [uid]);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        req.session.destroy((err) => {
            if (err) return next(err);
            res.clearCookie('connect.sid');
            return res.status(200).json({ ok: true, message: "Account deleted successfully." });
        });
    } catch (err) {
        return next(err);
    }
};

// ── updateUser ───────────────────────────────────────────
export const updateUser = async (req, res) => {
    console.log('PUT Request Received');
    const UserID = req.query.UserID;
    if (UserID === undefined || UserID === null || String(UserID).trim() === '') {
        return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(UserID);
    if (!Number.isFinite(uid) || !Number.isInteger(uid) || uid < 1) {
        return res.status(400).json({ error: 'Invalid UserID' });
    }

    if (req.body.FirstName !== undefined &&
        (typeof req.body.FirstName !== 'string' || req.body.FirstName.trim().length < 2)) {
        return res.status(400).json({ ok: false, message: "FirstName must be a string of at least 2 characters." });
    }
    if (req.body.LastName !== undefined &&
        (typeof req.body.LastName !== 'string' || req.body.LastName.trim().length < 2)) {
        return res.status(400).json({ ok: false, message: "LastName must be a string of at least 2 characters." });
    }
    if (req.body.Email !== undefined && !isValidEmail(req.body.Email)) {
        return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    if (req.body.Type !== undefined) {
        const t = typeof req.body.Type === 'string' ? req.body.Type.toUpperCase() : '';
        if (t !== 'C' && t !== 'A') {
            return res.status(400).json({ ok: false, message: 'Type must be "C" or "A".' });
        }
    }

    db.query("SELECT * FROM User WHERE UserID = ?", [uid], async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + uid + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing  = result[0];
        const FirstName = req.body.FirstName !== undefined ? req.body.FirstName : existing.FirstName;
        const LastName  = req.body.LastName  !== undefined ? req.body.LastName  : existing.LastName;
        const Email     = req.body.Email     !== undefined ? req.body.Email     : existing.Email;
        const Type      = req.body.Type      !== undefined ? req.body.Type      : existing.Type;

        // ── Hash the new password if provided, otherwise keep the existing one
        let Password;
        if (req.body.Password !== undefined) {
            const passwordError = validatePassword(req.body.Password);
            if (passwordError) {
                return res.status(400).json({ ok: false, message: passwordError });
            }
            Password = await bcrypt.hash(req.body.Password, SALT_ROUNDS);
        } else {
            Password = existing.Password;
        }

        db.query(
            'UPDATE User SET FirstName = ?, LastName = ?, Email = ?, Password = ?, Type = ? WHERE UserID = ?',
            [FirstName, LastName, Email, Password, Type, uid],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                res.status(200).json({ Status: 'OK', Message: `UserID [${uid}] updated successfully` });
                console.log(`UserID [${uid}] updated successfully`);
            }
        );
    });
};

// ── updateProfile (session user edits FirstName / LastName / Email) ──
export const updateProfile = async (req, res, next) => {
  try {
    const uid = req.session?.userId;
    if (!uid) {
      return res.status(401).json({ ok: false, message: "Not logged in." });
    }

    const FirstName = String(req.body.FirstName ?? "").trim();
    const LastName = String(req.body.LastName ?? "").trim();
    const Email = normalizeEmail(req.body.Email);

    if (FirstName.length < 2) {
      return res.status(400).json({ ok: false, message: "First name must be at least 2 characters." });
    }
    if (LastName.length < 2) {
      return res.status(400).json({ ok: false, message: "Last name must be at least 2 characters." });
    }
    if (!isValidEmail(Email)) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }

    const dupes = await runQuery(
      "SELECT UserID FROM User WHERE Email = ? AND UserID <> ? LIMIT 1",
      [Email, uid]
    );
    if (dupes.length) {
      return res.status(409).json({ ok: false, message: "Email already in use." });
    }

    const updateRes = await runQuery(
      "UPDATE User SET FirstName = ?, LastName = ?, Email = ? WHERE UserID = ?",
      [FirstName, LastName, Email, uid]
    );
    if (!updateRes.affectedRows) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    const rows = await runQuery(`${userSelectSql} WHERE u.UserID = ? LIMIT 1`, [uid]);
    return res.status(200).json({
      ok: true,
      message: "Profile updated.",
      data: { user: sanitizeUser(rows[0]) },
    });
  } catch (err) {
    return next(err);
  }
};

// ── updateClient ─────────────────────────────────────────
export const updateClient = (req, res) => {
    const raw = req.query.ClientID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return res.status(400).json({ error: 'ClientID is required (query)' });
    }
    const clientId = Number(raw);
    if (!Number.isInteger(clientId) || clientId < 1) {
        return res.status(400).json({ error: 'Invalid ClientID' });
    }

    db.query("SELECT * FROM Client WHERE ClientID = ?", [clientId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + clientId + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing = result[0];

        const rawPhone = req.body.PhoneNumber !== undefined ? req.body.PhoneNumber : existing.PhoneNumber;
        const rawNID   = req.body.NationalID  !== undefined ? req.body.NationalID  : existing.NationalID;
        const Address  = req.body.Address     !== undefined ? String(req.body.Address).trim() : existing.Address;

        const phoneDigits = String(rawPhone ?? '').replace(/\D/g, '');
        const nidDigits   = String(rawNID ?? '').replace(/\D/g, '');
        const phone       = parseInt(phoneDigits, 10);
        const nid         = parseInt(nidDigits, 10);

        if (!Number.isFinite(phone)) {
            return res.status(400).json({ error: 'Invalid PhoneNumber' });
        }
        if (!Number.isFinite(nid)) {
            return res.status(400).json({ error: 'Invalid NationalID' });
        }
        if (!Address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        db.query(
            'UPDATE Client SET PhoneNumber = ?, NationalID = ?, Address = ? WHERE ClientID = ?',
            [phone, nid, Address, clientId],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                res.status(200).json({ Status: 'OK', Message: `ClientID [${clientId}] updated successfully` });
            }
        );
    });
};

// ── updateAdmin ──────────────────────────────────────────
export const updateAdmin = (req, res) => {
    const raw = req.query.AdminID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return res.status(400).json({ error: 'AdminID is required (query)' });
    }
    const adminId = Number(raw);
    if (!Number.isInteger(adminId) || adminId < 1) {
        return res.status(400).json({ error: 'Invalid AdminID' });
    }

    db.query("SELECT * FROM Admin WHERE AdminID = ?", [adminId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + adminId + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const sql    = req.body.LastLogin != null
            ? 'UPDATE Admin SET LastLogin = ? WHERE AdminID = ?'
            : 'UPDATE Admin SET LastLogin = NOW() WHERE AdminID = ?';
        const params = req.body.LastLogin != null ? [req.body.LastLogin, adminId] : [adminId];

        db.query(sql, params, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            res.status(200).json({ Status: 'OK', Message: `AdminID [${adminId}] updated successfully` });
        });
    });
};

// ── register ────────────────────────────────────────────
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
    if (!isValidEmail(Email)) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    const passwordError = validatePassword(Password);
    if (passwordError) {
      return res.status(400).json({ ok: false, message: passwordError });
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

      PhoneNumber = parseInt(String(phoneRaw).replace(/\D/g, ""), 10);
      NationalID = parseInt(String(nidRaw).replace(/\D/g, ""), 10);

      if (!Number.isFinite(PhoneNumber)) {
        return res.status(400).json({ ok: false, message: "Invalid phone number." });
      }
      if (!Number.isFinite(NationalID)) {
        return res.status(400).json({ ok: false, message: "Invalid national ID." });
      }
    }

    const existingEmail = await runQuery("SELECT UserID FROM User WHERE Email = ? LIMIT 1", [Email]);
    if (existingEmail.length) {
      return res.status(409).json({ ok: false, message: "Email already exists." });
    }

    if (Type === "C") {
      const existingPhone = await runQuery("SELECT ClientID FROM Client WHERE PhoneNumber = ? LIMIT 1", [PhoneNumber]);
      if (existingPhone.length) {
        return res.status(409).json({ ok: false, message: "Phone number already exists." });
      }

      const existingNID = await runQuery("SELECT ClientID FROM Client WHERE NationalID = ? LIMIT 1", [NationalID]);
      if (existingNID.length) {
        return res.status(409).json({ ok: false, message: "National ID already exists." });
      }
    }

    const hashedPassword = await bcrypt.hash(Password, SALT_ROUNDS);

    const conn = await db.pool.getConnection();
    let userId;
    try {
      await conn.beginTransaction();

      const [insertRes] = await conn.query(
        "INSERT INTO User (FirstName, LastName, Email, Password, Type) VALUES (?, ?, ?, ?, ?)",
        [FirstName, LastName, Email, hashedPassword, Type]
      );
      userId = insertRes.insertId;

      if (Type === "C") {
        await conn.query(
          "INSERT INTO Client (ClientID, PhoneNumber, NationalID, Address) VALUES (?, ?, ?, ?)",
          [userId, PhoneNumber, NationalID, Address]
        );
      } else {
        await conn.query("INSERT INTO Admin (AdminID, LastLogin) VALUES (?, NOW())", [userId]);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
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

// ── login ───────────────────────────────────────────────
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

    const isMatch = await bcrypt.compare(Password, userRow.Password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    req.session.userId = userRow.UserID;
    req.session.role = userRow.Type === "A" ? "admin" : "client";

    return res.status(200).json({
      ok: true,
      message: "Logged in successfully.",
      data: { user: sanitizeUser(userRow) },
    });
  } catch (err) {
    return next(err);
  }
};

// ── logout ──────────────────────────────────────────────
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Logout failed." });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ ok: true, message: "Logged out successfully." });
  });
};

// ── me (get current session user) ───────────────────────
// export const me = async (req, res, next) => {
//   try {
//     const userId = req.session.userId;
//     if (!userId) {
//       return res.status(401).json({ ok: false, message: "Not logged in." });
//     }

//     const rows = await runQuery(`${userSelectSql} WHERE u.UserID = ? LIMIT 1`, [userId]);
//     if (!rows.length) {
//       return res.status(404).json({ ok: false, message: "User not found." });
//     }

//     return res.status(200).json({
//       ok: true,
//       data: { user: sanitizeUser(rows[0]) },
//     });
//   } catch (err) {
//     return next(err);
//   }
// };

// ── onlineUsers (list active sessions) ──────────────────
export const onlineUsers = async (req, res, next) => {
  try {
    const sessions = await runQuery("SELECT data FROM sessions WHERE expires > UNIX_TIMESTAMP()");
    const userIds = sessions
      .map((row) => {
        try {
          const parsed = JSON.parse(row.data);
          return parsed.userId ?? null;
        } catch { return null; }
      })
      .filter((id) => id !== null);

    if (!userIds.length) {
      return res.json({ ok: true, count: 0, users: [] });
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await runQuery(
      `${userSelectSql} WHERE u.UserID IN (${placeholders})`,
      userIds
    );

    return res.json({
      ok: true,
      count: rows.length,
      users: rows.map(sanitizeUser),
    });
  } catch (err) {
    return next(err);
  }
};

// ── searchUser ──────────────────────────────────────────
export const searchUser = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['UserID', 'FirstName', 'LastName', 'Email', 'Type'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM User WHERE ${keyword} = ? ORDER BY UserID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};